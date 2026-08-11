import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface Props {
  children: React.ReactNode;
}

export function AuthGuard({ children }: Props) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div className="step-spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }} />
          <p style={{ margin: 0, fontSize: 14 }}>Loading System Designer...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
