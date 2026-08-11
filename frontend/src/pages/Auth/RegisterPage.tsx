import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { registerUser } from '../../services/authApi';
import { useAuthStore } from '../../store/authStore';

function getPasswordStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score: Math.min(score, 4), label: labels[Math.min(score, 4)] || '' };
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const result = await registerUser(email, password);
      setUser(result.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start designing production-ready architectures today</p>

        {error && (
          <div style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', marginBottom: 16 }}>
            <AlertCircle size={16} color="var(--color-error)" />
            <span style={{ fontSize: 13, color: 'var(--color-error)' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email address</label>
            <div className="input-wrapper has-icon-left">
              <Mail size={16} className="input-icon" />
              <input id="reg-email" type="email" className="input" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" required autoFocus autoComplete="email" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <div className="input-wrapper has-icon-left has-icon-right">
              <Lock size={16} className="input-icon" />
              <input id="reg-password" type={showPass ? 'text' : 'password'}
                className="input" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters" required autoComplete="new-password" />
              <button type="button" className="input-icon-right" onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? 'Hide password' : 'Show password'}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="password-strength">
                <div className="strength-bars">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`strength-bar ${strength.score >= i ? `filled-${strength.score}` : ''}`} />
                  ))}
                </div>
                <span className="strength-label">{strength.label}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">Confirm password</label>
            <div className="input-wrapper has-icon-left has-icon-right">
              <Lock size={16} className="input-icon" />
              <input id="confirm-password" type="password" className="input" value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password" required autoComplete="new-password" />
              {confirm.length > 0 && (
                password === confirm
                  ? <CheckCircle2 size={16} className="input-icon-right" style={{ color: 'var(--color-success)', pointerEvents: 'none' }} />
                  : <AlertCircle size={16} className="input-icon-right" style={{ color: 'var(--color-error)', pointerEvents: 'none' }} />
              )}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
