import { Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../config/db';
import {
  AuthRequest,
  Role,
  ROLE_HIERARCHY,
  canActOnRole,
  canAssignRole,
} from '../middleware/auth.middleware';

// ---------- Helpers ----------

const SALT_ROUNDS = 12;

// Registra uma entrada no AuditLog
const audit = async (
  actorId: string,
  action: string,
  targetId?: string,
  targetEmail?: string,
  details?: Record<string, unknown>,
  ipAddress?: string
) => {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetId,
      targetEmail,
      details: details ? JSON.stringify(details) : undefined,
      ipAddress,
    },
  });
};

// Campos seguros para retornar de um User (nunca retorna passwordHash, tokens, etc.)
const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: { id: true, name: true, email: true, role: true },
  },
};

// Schemas de validação
const createEmployeeSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100),
  email: z.string().email('E-mail inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter ao menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter ao menos um número')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter ao menos um caractere especial'),
  role: z.enum(['OWNER', 'ADMIN', 'MODERATOR', 'USER']).optional().default('USER'),
});

const updateEmployeeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MODERATOR', 'USER']).optional(),
  isActive: z.boolean().optional(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/)
    .optional(),
});

// ---------- Controller ----------

// GET /api/employees
// MODERATOR+ pode listar
export const listEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const employees = await prisma.user.findMany({
      select: safeUserSelect,
      orderBy: [
        { createdAt: 'asc' },
      ],
    });

    return res.json({ employees });
  } catch (err) {
    console.error('[listEmployees]', err);
    return res.status(500).json({ error: 'Erro ao listar funcionários.' });
  }
};

// GET /api/employees/:id
export const getEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const employee = await prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });

    if (!employee) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

    return res.json({ employee });
  } catch (err) {
    console.error('[getEmployee]', err);
    return res.status(500).json({ error: 'Erro ao buscar funcionário.' });
  }
};

// POST /api/employees
// MODERATOR pode criar somente USERs; ADMIN pode criar até MODERATORs; OWNER pode criar qualquer um
export const createEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const actor = req.user!;
    const parsed = createEmployeeSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Dados inválidos.',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { name, email, password, role } = parsed.data;

    // Validação de hierarquia: ator não pode criar alguém com role >= o seu
    if (!canAssignRole(actor.role, role)) {
      return res.status(403).json({
        error: `Você não pode criar funcionários com o cargo "${role}". Seu cargo é "${actor.role}".`,
      });
    }

    // Verifica e-mail duplicado
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'E-mail já está em uso.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const employee = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        isEmailVerified: true, // Cadastrado por funcionário autorizado — não precisa de verificação
        createdById: actor.id,
      },
      select: safeUserSelect,
    });

    await audit(
      actor.id,
      'CREATE_EMPLOYEE',
      employee.id,
      employee.email,
      { role, createdByRole: actor.role },
      req.ip
    );

    return res.status(201).json({ employee });
  } catch (err) {
    console.error('[createEmployee]', err);
    return res.status(500).json({ error: 'Erro ao criar funcionário.' });
  }
};

// PATCH /api/employees/:id
// ADMIN+ pode editar funcionários de nível menor; ninguém pode alterar a si mesmo via este endpoint
export const updateEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { id } = req.params;

    // Não pode editar a si mesmo via este endpoint (use /api/auth/profile)
    if (id === actor.id) {
      return res.status(403).json({ error: 'Use o endpoint /api/auth/profile para editar seu próprio perfil.' });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

    // Verifica hierarquia: ator deve ter nível maior que o alvo
    if (!canActOnRole(actor.role, target.role)) {
      return res.status(403).json({
        error: `Você não tem permissão para editar funcionários com cargo "${target.role}".`,
      });
    }

    const parsed = updateEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Dados inválidos.',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { name, email, role, isActive, password } = parsed.data;
    const changes: Record<string, unknown> = {};

    // Validação de troca de role
    if (role && role !== target.role) {
      if (!canAssignRole(actor.role, role)) {
        return res.status(403).json({
          error: `Você não pode atribuir o cargo "${role}" a outro funcionário.`,
        });
      }
      changes.role = target.role + ' → ' + role;
    }

    // Verifica e-mail duplicado
    if (email && email !== target.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'E-mail já está em uso.' });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
      changes.isActive = target.isActive + ' → ' + isActive;
    }
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      changes.password = 'redefinida';
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: safeUserSelect,
    });

    if (Object.keys(changes).length > 0) {
      await audit(actor.id, 'UPDATE_EMPLOYEE', id, target.email, changes, req.ip);
    }

    return res.json({ employee: updated });
  } catch (err) {
    console.error('[updateEmployee]', err);
    return res.status(500).json({ error: 'Erro ao atualizar funcionário.' });
  }
};

// DELETE /api/employees/:id
// Apenas ADMIN+; não pode deletar a si mesmo; não pode deletar quem tem role >= o seu
export const deleteEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const actor = req.user!;
    const { id } = req.params;

    if (id === actor.id) {
      return res.status(403).json({ error: 'Você não pode excluir sua própria conta.' });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

    if (!canActOnRole(actor.role, target.role)) {
      return res.status(403).json({
        error: `Você não tem permissão para excluir funcionários com cargo "${target.role}".`,
      });
    }

    // Soft-delete de sessões do usuário antes de deletar
    await prisma.session.deleteMany({ where: { userId: id } });

    await prisma.user.delete({ where: { id } });

    await audit(
      actor.id,
      'DELETE_EMPLOYEE',
      id,
      target.email,
      { deletedRole: target.role },
      req.ip
    );

    return res.json({ message: 'Funcionário excluído com sucesso.' });
  } catch (err) {
    console.error('[deleteEmployee]', err);
    return res.status(500).json({ error: 'Erro ao excluir funcionário.' });
  }
};

// GET /api/employees/audit-log
// Apenas ADMIN+
export const getAuditLog = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const skip = (page - 1) * limit;

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count(),
    ]);

    return res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[getAuditLog]', err);
    return res.status(500).json({ error: 'Erro ao buscar audit log.' });
  }
};
