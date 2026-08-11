import { Router } from 'express';
import { z } from 'zod';
import { registerUser, loginUser, AuthError } from '../modules/auth/AuthService.js';
import { authenticate } from '../middleware/auth.js';
import { environment } from '../config/environment.js';

export const authRoutes = Router();

const cookieOptions = {
  httpOnly: true,
  secure: environment.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

const RegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

authRoutes.post('/auth/register', async (req, res) => {
  try {
    const input = RegisterSchema.parse(req.body);
    const { user, token } = await registerUser(input.email, input.password);
    res.cookie('sd_token', token, cookieOptions);
    return res.status(201).json({ user });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(409).json({ error: err.message, code: err.code });
    }
    if (err?.name === 'ZodError') {
      const messages = err.errors?.map((e: any) => e.message).join('. ');
      return res.status(400).json({ error: messages || 'Invalid registration data.', code: 'VALIDATION_ERROR' });
    }
    console.error('[SystemDesigner Auth] Register error:', err?.message);
    return res.status(500).json({ error: 'Registration failed. Please try again.', code: 'REGISTER_FAILED' });
  }
});

authRoutes.post('/auth/login', async (req, res) => {
  try {
    const input = LoginSchema.parse(req.body);
    const { user, token } = await loginUser(input.email, input.password);
    res.cookie('sd_token', token, cookieOptions);
    return res.status(200).json({ user });
  } catch (err: any) {
    if (err instanceof AuthError) {
      const status = err.code === 'INVALID_CREDENTIALS' ? 401 : 400;
      return res.status(status).json({ error: err.message, code: err.code });
    }
    if (err?.name === 'ZodError') {
      const messages = err.errors?.map((e: any) => e.message).join('. ');
      return res.status(400).json({ error: messages || 'Invalid login data.', code: 'VALIDATION_ERROR' });
    }
    console.error('[SystemDesigner Auth] Login error:', err?.message);
    return res.status(500).json({ error: 'Login failed. Please try again.', code: 'LOGIN_FAILED' });
  }
});

authRoutes.get('/auth/me', authenticate, (req, res) => {
  return res.json({ user: req.user });
});

authRoutes.post('/auth/logout', (req, res) => {
  res.clearCookie('sd_token', { path: '/' });
  return res.json({ message: 'Logged out successfully.' });
});
