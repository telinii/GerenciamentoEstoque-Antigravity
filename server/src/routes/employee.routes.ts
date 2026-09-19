import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAuditLog,
} from '../controllers/employee.controller';

const router = Router();

// Rate limit específico para gerenciamento de funcionários — previne ataques de força bruta
const employeeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 60,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit mais restritivo para criação de funcionários
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  message: { error: 'Limite de criação de funcionários atingido. Tente novamente em uma hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Todas as rotas exigem autenticação
router.use(requireAuth);
router.use(employeeLimiter);

// Listar funcionários — MODERATOR+
router.get('/', requireRole('MODERATOR'), listEmployees);

// Audit log — apenas ADMIN+
router.get('/audit-log', requireRole('ADMIN'), getAuditLog);

// Buscar funcionário por ID — MODERATOR+
router.get('/:id', requireRole('MODERATOR'), getEmployee);

// Criar funcionário — MODERATOR+ (com restrições de hierarquia no controller)
router.post('/', createLimiter, requireRole('MODERATOR'), createEmployee);

// Atualizar funcionário — ADMIN+ (com restrições de hierarquia no controller)
router.patch('/:id', requireRole('ADMIN'), updateEmployee);

// Excluir funcionário — ADMIN+ (com restrições de hierarquia no controller)
router.delete('/:id', requireRole('ADMIN'), deleteEmployee);

export default router;
