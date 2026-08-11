import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Layers, Clock, ChevronRight, Cpu } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { listProjects } from '../../services/archspaceApi';

interface Project {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  status: string;
  version: number;
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-content">
      <div className="page-inner">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 style={{ marginBottom: 4 }}>
              {projects.length === 0 ? `Welcome, ${user?.email?.split('@')[0] ?? 'there'} 👋` : 'Your Projects'}
            </h1>
            <p style={{ margin: 0 }}>
              {projects.length === 0
                ? 'Your system design workspace is ready.'
                : `${projects.length} project${projects.length !== 1 ? 's' : ''} in your workspace`}
            </p>
          </div>
          <Link to="/projects/new" className="btn btn-primary">
            <Plus size={16} /> New Project
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="dashboard-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="card" style={{ height: 140 }}>
                <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 14, width: '90%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '75%' }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && projects.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Cpu size={32} />
            </div>
            <h2 className="empty-state-title">Create your first system</h2>
            <p className="empty-state-desc">
              Describe what you want to build and System Designer will help you turn the idea into a production-ready architecture.
            </p>
            <Link to="/projects/new" className="btn btn-primary btn-lg">
              <Plus size={18} /> Create Project
            </Link>
          </div>
        )}

        {/* Project Grid */}
        {!loading && projects.length > 0 && (
          <div className="dashboard-grid">
            {/* New project card */}
            <div className="card card-interactive" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 140, border: '2px dashed var(--color-border)' }}
              onClick={() => navigate('/projects/new')} role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate('/projects/new')}>
              <Plus size={24} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-muted)' }}>New Project</span>
            </div>
            {projects.map(p => (
              <div key={p.id} className="project-card" onClick={() => navigate(`/projects/${p.id}`)} role="button" tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/projects/${p.id}`)}>
                <div className="project-card-name">{p.name}</div>
                <div className="project-card-desc">{p.description}</div>
                <div className="project-card-meta">
                  <div className="flex items-center gap-2">
                    <span className={`badge badge-${p.status === 'approved' ? 'success' : p.status === 'draft' ? 'neutral' : 'info'}`}>
                      {p.status}
                    </span>
                    <span className="badge badge-neutral"><Layers size={10} /> v{p.version}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={10} />{new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
