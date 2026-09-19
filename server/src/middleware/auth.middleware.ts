import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../config/db';

// Hierarquia de roles: OWNER > ADMIN > MODERATOR > USER
export const ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 4,
  ADMIN: 3,
  MODERATOR: 2,
  USER: 1,
};

export type Role = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'USER';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    isEmailVerified: boolean;
  };
}

// Middleware base de autenticação — carrega o user com o role incluído
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: 'Não autenticado. Token ausente.' });
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Conta desativada. Contate o administrador.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
};

// Middleware de role mínimo — exige que o usuário tenha ao menos o role especificado
export const requireRole = (minimumRole: Role) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const userLevel = ROLE_HIERARCHY[user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Permissão insuficiente.',
        required: minimumRole,
        current: user.role,
      });
    }

    next();
  };
};

// Utilitário: verifica se actorRole pode operar sobre targetRole (hierarquia)
export const canActOnRole = (actorRole: string, targetRole: string): boolean => {
  const actorLevel = ROLE_HIERARCHY[actorRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
  return actorLevel > targetLevel;
};

// Utilitário: verifica se o role solicitado pode ser atribuído pelo ator
export const canAssignRole = (actorRole: string, requestedRole: string): boolean => {
  const actorLevel = ROLE_HIERARCHY[actorRole] || 0;
  const requestedLevel = ROLE_HIERARCHY[requestedRole] || 0;
  // Um ator só pode atribuir roles MENORES que o seu próprio
  return actorLevel > requestedLevel;
};
