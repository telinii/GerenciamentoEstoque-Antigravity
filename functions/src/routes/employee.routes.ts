import { Router, Response } from 'express';
import { z } from 'zod';
import { DocumentData, Query } from 'firebase-admin/firestore';
import { db, auth, FieldValue } from '../firebase';
import { requireAuth, requireRole, AuthRequest, Role, canActOnRole, canAssignRole } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

const strictLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

// Campos seguros para retornar
const safeUser = (doc: DocumentData, id: string) => ({
  id,
  email: doc.email,
  name: doc.name,
  role: doc.role,
  isActive: doc.isActive,
  isEmailVerified: doc.isEmailVerified,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  createdBy: doc.createdBy || null,
});

// Audit helper
const audit = async (actorId: string, action: string, targetId?: string, targetEmail?: string, details?: object, ip?: string) => {
  await db.collection('auditLogs').add({
    actorId, action, targetId: targetId || null, targetEmail: targetEmail || null,
    details: details || null, ipAddress: ip || null,
    createdAt: FieldValue.serverTimestamp(),
  });
};

// GET /employees — lista funcionários (MODERATOR+)
router.get('/', requireAuth, requireRole('MODERATOR'), async (req: AuthRequest, res: Response) => {
  const { search = '', role = 'ALL' } = req.query as Record<string, string>;
  let query: Query = db.collection('users');

  if (role !== 'ALL') query = query.where('role', '==', role);

  const snap = await query.get();
  let employees = snap.docs.map(d => safeUser(d.data(), d.id));

  if (search) {
    const s = search.toLowerCase();
    employees = employees.filter(e =>
      e.name?.toLowerCase().includes(s) || e.email?.toLowerCase().includes(s)
    );
  }
  res.json({ employees });
});

// GET /employees/:id — detalhe (MODERATOR+)
router.get('/:id', requireAuth, requireRole('MODERATOR'), async (req: AuthRequest, res: Response) => {
  const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const doc = await db.collection('users').doc(targetId).get();
  if (!doc.exists) { res.status(404).json({ error: 'Funcionário não encontrado.' }); return; }
  res.json({ employee: safeUser(doc.data()!, doc.id) });
});

// POST /employees — criar funcionário
const createSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(['OWNER', 'ADMIN', 'MODERATOR', 'USER']),
});

router.post('/', requireAuth, requireRole('MODERATOR'), strictLimiter, async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }

  const { name, email, password, role } = parsed.data;

  if (!canAssignRole(req.userRole!, role as Role)) {
    res.status(403).json({ error: `Você não pode criar um funcionário com role ${role}.` });
    return;
  }

  try {
    // Cria no Firebase Auth
    const userRecord = await auth.createUser({ email, password, displayName: name });

    // Cria documento no Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email, name, role,
      isActive: true,
      isEmailVerified: false,
      createdById: req.uid,
      createdBy: { id: req.uid, email: req.userEmail },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await audit(req.uid!, 'CREATE_EMPLOYEE', userRecord.uid, email, { role }, req.ip);
    res.status(201).json({ message: 'Funcionário criado com sucesso.', id: userRecord.uid });
  } catch (e: any) {
    if (e.code === 'auth/email-already-exists') {
      res.status(409).json({ error: 'Este e-mail já está em uso.' });
    } else {
      console.error(e);
      res.status(500).json({ error: 'Erro interno ao criar funcionário.' });
    }
  }
});

// PATCH /employees/:id — editar (nome, role, isActive)
const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MODERATOR', 'USER']).optional(),
  isActive: z.boolean().optional(),
});

router.patch('/:id', requireAuth, requireRole('MODERATOR'), strictLimiter, async (req: AuthRequest, res: Response) => {
  const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const doc = await db.collection('users').doc(targetId).get();
  if (!doc.exists) { res.status(404).json({ error: 'Funcionário não encontrado.' }); return; }

  const target = doc.data()!;
  if (!canActOnRole(req.userRole!, target.role as Role)) {
    res.status(403).json({ error: 'Você não tem permissão para editar este funcionário.' });
    return;
  }

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }

  const updates: Record<string, any> = { ...parsed.data, updatedAt: FieldValue.serverTimestamp() };

  if (parsed.data.role && !canAssignRole(req.userRole!, parsed.data.role as Role)) {
    res.status(403).json({ error: `Você não pode atribuir o role ${parsed.data.role}.` });
    return;
  }

  await db.collection('users').doc(targetId).update(updates);

  const action = parsed.data.isActive === false ? 'DEACTIVATE_EMPLOYEE' :
    parsed.data.role ? 'UPDATE_ROLE' : 'UPDATE_EMPLOYEE';
  await audit(req.uid!, action, targetId, target.email, parsed.data, req.ip);

  res.json({ message: 'Funcionário atualizado.' });
});

// DELETE /employees/:id — excluir (ADMIN+)
router.delete('/:id', requireAuth, requireRole('ADMIN'), strictLimiter, async (req: AuthRequest, res: Response) => {
  const targetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (targetId === req.uid) {
    res.status(400).json({ error: 'Você não pode excluir sua própria conta.' });
    return;
  }

  const doc = await db.collection('users').doc(targetId).get();
  if (!doc.exists) { res.status(404).json({ error: 'Funcionário não encontrado.' }); return; }

  const target = doc.data()!;
  if (!canActOnRole(req.userRole!, target.role as Role)) {
    res.status(403).json({ error: 'Você não tem permissão para excluir este funcionário.' });
    return;
  }

  await auth.deleteUser(targetId);
  await db.collection('users').doc(targetId).delete();
  await audit(req.uid!, 'DELETE_EMPLOYEE', targetId, target.email, {}, req.ip);

  res.json({ message: 'Funcionário excluído.' });
});

// GET /employees/audit/logs — audit log (ADMIN+)
router.get('/audit/logs', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));

  const snap = await db.collection('auditLogs')
    .orderBy('createdAt', 'desc')
    .limit(limitNum * pageNum)
    .get();

  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const paginated = all.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.json({ logs: paginated, meta: { total: all.length, page: pageNum, limit: limitNum } });
});

export default router;
