import type { Request, Response, NextFunction } from 'express';
import { verifyToken, getUserById } from '../modules/auth/AuthService.js';
import type { UserRecord } from '../modules/auth/AuthService.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserRecord;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Support both HTTP-only cookie and Authorization header (for tests)
    const cookieToken = req.cookies?.sd_token;
    const headerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined;
    const token = cookieToken || headerToken;

    if (!token) {
      res.status(401).json({ error: 'Please log in to continue.', code: 'UNAUTHORIZED' });
      return;
    }

    const payload = verifyToken(token);
    const user = await getUserById(payload.sub);

    if (!user) {
      res.status(401).json({ error: 'Session expired. Please log in again.', code: 'SESSION_EXPIRED' });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Your session has expired. Please log in again.', code: 'TOKEN_EXPIRED' });
    } else {
      res.status(401).json({ error: 'Please log in to continue.', code: 'UNAUTHORIZED' });
    }
  }
}
