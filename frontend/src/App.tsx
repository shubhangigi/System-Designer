import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Plus, Cpu, Settings, LogOut, ChevronLeft } from 'lucide-react';
import { useAuthStore } from './store/authStore';
import { getCurrentUser } from './services/authApi';
import { logoutUser } from './services/authApi';
import { AuthGuard } from './components/common/AuthGuard';
import { Logo } from './components/common/Logo';
import { LandingPage } from './pages/Landing/LandingPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { CreateProjectWizard } from './pages/Project/CreateProjectWizard';
import { WorkspacePage } from './pages/Workspace/WorkspacePage';

function AppSidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    try { await logoutUser(); } catch {}
    logout();
    navigate('/login');
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <NavLink to="/dashboard" className="sidebar-logo">
          <Logo size="sm" />
        </NavLink>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={16} /> Dashboard
        </NavLink>
        <NavLink to="/projects/new" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Plus size={16} /> Create Project
        </NavLink>

        <div className="sidebar-section-label">Settings</div>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Settings size={16} /> Settings
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar" aria-hidden="true">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-email" title={user?.email}>{user?.email}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Sign out" aria-label="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="app-shell">
        <AppSidebar />
        <div className="main-content">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}

function AppRoutes() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    getCurrentUser()
      .then(data => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<AuthenticatedLayout><DashboardPage /></AuthenticatedLayout>} />
      <Route path="/projects/new" element={<AuthenticatedLayout><CreateProjectWizard /></AuthenticatedLayout>} />
      <Route path="/projects/:projectId" element={<AuthenticatedLayout><WorkspacePage /></AuthenticatedLayout>} />
      <Route path="/settings" element={<AuthenticatedLayout>
        <div className="page-content"><div className="page-inner">
          <h1>Settings</h1>
          <p>Account settings coming soon.</p>
        </div></div>
      </AuthenticatedLayout>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
