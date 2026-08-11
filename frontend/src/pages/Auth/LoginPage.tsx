import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { loginUser } from '../../services/authApi';
import { useAuthStore } from '../../store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await loginUser(email, password);
      setUser(result.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Logo size="md" />
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your System Designer workspace</p>

        {error && (
          <div className="card-sm mb-4" style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
            <AlertCircle size={16} color="var(--color-error)" />
            <span style={{ fontSize: 13, color: 'var(--color-error)' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <div className="input-wrapper has-icon-left">
              <Mail size={16} className="input-icon" />
              <input id="email" type="email" className="input" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" required autoFocus autoComplete="email" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-wrapper has-icon-left has-icon-right">
              <Lock size={16} className="input-icon" />
              <input id="password" type={showPass ? 'text' : 'password'}
                className="input" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password" required autoComplete="current-password" />
              <button type="button" className="input-icon-right" onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? 'Hide password' : 'Show password'}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register">Create one free</Link>
        </div>
      </div>
    </div>
  );
}
