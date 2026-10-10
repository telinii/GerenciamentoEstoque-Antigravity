import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../firebase';

export type Role = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'USER';

export const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  MODERATOR: 2,
  USER: 1,
};

export interface AuthRequest extends Request {
  uid?: string;
  userRole?: Role;
  userEmail?: string;
}

// Verifica o Firebase ID token e carrega role do Firestore
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Não autenticado. Token ausente.' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await auth.verifyIdToken(idToken);
    req.uid = decoded.uid;
    req.userEmail = decoded.email;

    // Busca role no Firestore
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      res.status(403).json({ error: 'Usuário não encontrado no sistema.' });
      return;
    }
    const userData = userDoc.data()!;
    if (!userData.isActive) {
      res.status(403).json({ error: 'Conta desativada.' });
      return;
    }
    req.userRole = (userData.role as Role) || 'USER';
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

// Exige role mínimo
export const requireRole = (minimum: Role) => (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const level = ROLE_HIERARCHY[req.userRole!] || 0;
  if (level < ROLE_HIERARCHY[minimum]) {
    res.status(403).json({ error: `Acesso negado. Requer role ${minimum} ou superior.` });
    return;
  }
  next();
};

// Helpers de hierarquia
export const canActOnRole = (actorRole: Role, targetRole: Role): boolean =>
  (ROLE_HIERARCHY[actorRole] || 0) > (ROLE_HIERARCHY[targetRole] || 0);

export const canAssignRole = (actorRole: Role, newRole: Role): boolean =>
  (ROLE_HIERARCHY[actorRole] || 0) > (ROLE_HIERARCHY[newRole] || 0);
