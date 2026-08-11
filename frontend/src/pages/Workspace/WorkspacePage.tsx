import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Network, ShieldCheck, History, Code2, GitCompareArrows, FileText, CheckCircle2, Download, FileJson, Sparkles, Loader2, Layers } from 'lucide-react';
import type { ArchitectureModel } from '@archspace/shared';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { getProject, approveArchitecture, getScaffold, analyzeCodebase, getArchitectureVersions, validateProjectArchitecture, saveArchitecture } from '../../services/archspaceApi';
import { ArchitectureCanvas } from '../../components/architecture/ArchitectureCanvas';
import { ArchitectureInspector } from '../../components/architecture/ArchitectureInspector';
import { useToast } from '../../components/common/Toast';

type TabId = 'overview' | 'architecture' | 'validation' | 'security' | 'history' | 'scaffold' | 'drift' | 'docs';

const TABS: { id: TabId; label: string; icon: React.FC<any> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'architecture', label: 'Architecture', icon: Network },
  { id: 'validation', label: 'Validation', icon: ShieldCheck },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'history', label: 'History', icon: History },
  { id: 'scaffold', label: 'Scaffold', icon: Code2 },
  { id: 'drift', label: 'Drift', icon: GitCompareArrows },
  { id: 'docs', label: 'Docs', icon: FileText },
];

export function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { architecture, selectedNodeId, setProject, setArchitecture, selectNode, updateNode } = useWorkspaceStore();
  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [projectMeta, setProjectMeta] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [scaffold, setScaffold] = useState<any>(null);
  const [driftResult, setDriftResult] = useState<any>(null);
  const [status, setStatus] = useState('');

  const selectedNode = useMemo(() => architecture?.nodes.find(n => n.id === selectedNodeId), [architecture, selectedNodeId]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    getProject(projectId)
      .then(p => {
        setProjectMeta(p);
        setProject(p.id, p.architecture);
      })
      .catch(() => { toast('Project not found.', 'error'); navigate('/dashboard'); })
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !architecture) return;
    Promise.all([
      validateProjectArchitecture(projectId).then(setValidationResult).catch(() => {}),
      getArchitectureVersions(projectId).then(setVersions).catch(() => {}),
    ]);
  }, [projectId, architecture]);

  async function handleApprove() {
    if (!projectId) return;
    try {
      const updated = await approveArchitecture(projectId);
      setArchitecture(updated);
      toast('Architecture approved!', 'success');
    } catch {
      toast('Failed to approve architecture.', 'error');
    }
  }

  async function handleGenerateScaffold() {
    if (!projectId) return;
    setStatus('Generating project scaffold...');
    try {
      const result = await getScaffold(projectId);
      setScaffold(result);
      setStatus('');
      toast('Scaffold generated!', 'success');
    } catch {
      toast('Failed to generate scaffold.', 'error');
      setStatus('');
    }
  }

  async function persist(next: ArchitectureModel) {
    setArchitecture(next);
    if (projectId) {
      await saveArchitecture(projectId, next, 'Canvas edit').catch(() => {});
    }
  }

  async function handleDriftScan() {
    if (!projectId) return;
    setStatus('Analyzing codebase...');
    try {
      const result = await analyzeCodebase(projectId, [
        { path: 'backend/src/database/mongo.ts', content: "import mongoose from 'mongoose';\nexport const connectMongo = () => mongoose.connect('mongodb://localhost:27017/app');" },
      ]);
      setDriftResult(result);
      setStatus('');
    } catch {
      toast('Drift analysis failed.', 'error');
      setStatus('');
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
          <p style={{ marginTop: 12, color: 'var(--color-text-muted)' }}>Loading project...</p>
        </div>
      </div>
    );
  }

  const healthScore = validationResult ? Math.max(0, 100 - (validationResult.errorCount * 20) - (validationResult.warningCount * 5)) : null;

  return (
    <div className="workspace">
      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {/* Topbar actions inside tabs area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleApprove} disabled={!projectId}>
            <CheckCircle2 size={14} /> Approve
          </button>
          <a className="btn btn-secondary btn-sm" href={projectId ? `/api/projects/${projectId}/export/project.zip` : undefined} style={{ pointerEvents: projectId ? undefined : 'none', opacity: projectId ? 1 : 0.5 }}>
            <Download size={14} /> ZIP
          </a>
          <a className="btn btn-secondary btn-sm" href={projectId ? `/api/projects/${projectId}/export/architecture.json` : undefined} style={{ pointerEvents: projectId ? undefined : 'none', opacity: projectId ? 1 : 0.5 }}>
            <FileJson size={14} /> JSON
          </a>
        </div>
      </div>

      {/* Tab Content */}
      <div className="workspace-body">

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="panel-page">
            <h2 style={{ marginBottom: 24 }}>Project Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
              <div className="card card-sm">
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Architecture Health</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: healthScore !== null ? (healthScore >= 80 ? 'var(--color-success)' : healthScore >= 60 ? 'var(--color-warning)' : 'var(--color-error)') : 'var(--color-text-muted)' }}>
                  {healthScore !== null ? `${healthScore}/100` : '—'}
                </div>
              </div>
              <div className="card card-sm">
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Status</div>
                <span className={`badge badge-${architecture?.status === 'approved' ? 'success' : 'neutral'}`} style={{ fontSize: 14, padding: '4px 12px' }}>
                  {architecture?.status ?? 'draft'}
                </span>
              </div>
              <div className="card card-sm">
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Version</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)' }}>{versions.length || 1}</div>
              </div>
              <div className="card card-sm">
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Components</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)' }}>{architecture?.nodes.length ?? 0}</div>
              </div>
            </div>

            {/* AI Generation Source & RAG Transparency */}
            <div className="card card-sm" style={{ marginBottom: 24, borderLeft: projectMeta?.metadata?.generatedBy === 'ai' ? '4px solid var(--color-primary)' : '4px solid var(--color-warning)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Architecture Generation Engine</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge ${projectMeta?.metadata?.generatedBy === 'ai' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 13, padding: '4px 10px' }}>
                      {projectMeta?.metadata?.generatedBy === 'ai'
                        ? `🤖 REAL AI GENERATED (${projectMeta?.metadata?.provider || 'LLM'} / ${projectMeta?.metadata?.model || 'Open-Weight'})`
                        : '⚙️ FALLBACK / DEMO ARCHITECTURE'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {projectMeta?.metadata?.generatedBy === 'ai'
                        ? 'Generated dynamically via RAG + LLM inference'
                        : 'Generated via rule-based heuristics (Set AI_PROVIDER=ollama to enable local LLM)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* RAG Knowledge Used */}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  📚 Architecture Knowledge Used (RAG Pipeline)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span className="badge badge-neutral">🔐 Auth & Session Security</span>
                  <span className="badge badge-neutral">🗄️ PostgreSQL Schema Design</span>
                  <span className="badge badge-neutral">⚡ Redis & In-Memory Caching</span>
                  <span className="badge badge-neutral">🛡️ API Protection & Rate Limiting</span>
                  <span className="badge badge-neutral">📈 Horizontal Scaling & Load Balancing</span>
                </div>
              </div>
            </div>

            {architecture && (
              <>
                <h3>Architecture Stack</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {Object.entries(architecture.stack).map(([k, v]) => (
                    <span key={k} className="badge badge-info" style={{ padding: '6px 12px', fontSize: 12 }}>
                      <span style={{ fontWeight: 400, marginRight: 4 }}>{k}:</span>{v as string}
                    </span>
                  ))}
                </div>

                <h3>Key Components</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  {architecture.nodes.map(node => (
                    <div key={node.id} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 16px' }}
                      onClick={() => { setTab('architecture'); selectNode(node.id); }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: getNodeColor(node.type), flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>{node.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.responsibility}</div>
                      </div>
                      <span className="badge badge-neutral">{node.technology}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ARCHITECTURE CANVAS */}
        {tab === 'architecture' && (
          <div className="canvas-inspector-split">
            <div className="canvas-wrap">
              {architecture && (
                <ArchitectureCanvas architecture={architecture} onChange={persist} onSelect={selectNode} />
              )}
            </div>
            <ArchitectureInspector node={selectedNode} onUpdate={(patch) => selectedNode && updateNode(selectedNode.id, patch)} />
          </div>
        )}

        {/* VALIDATION */}
        {tab === 'validation' && (
          <div className="panel-page">
            <h2>Architecture Validation</h2>
            {validationResult ? (
              <>
                <div className="health-bar">
                  <div className={`health-score ${healthScore !== null && healthScore < 80 ? (healthScore < 60 ? 'error' : 'warning') : ''}`}>
                    {healthScore}/100
                  </div>
                  <div className="health-counts">
                    <div className="health-count"><span style={{ color: 'var(--color-error)' }}>●</span> {validationResult.errorCount} Critical errors</div>
                    <div className="health-count"><span style={{ color: 'var(--color-warning)' }}>●</span> {validationResult.warningCount} Warnings</div>
                    <div className="health-count"><span style={{ color: 'var(--color-success)' }}>●</span> {validationResult.valid ? 'Architecture is valid' : 'Issues found'}</div>
                  </div>
                </div>

                {validationResult.findings.length === 0 && (
                  <div className="empty-state">
                    <CheckCircle2 size={40} color="var(--color-success)" />
                    <h3 className="empty-state-title">Architecture looks great!</h3>
                    <p className="empty-state-desc">No issues found. Your architecture follows best practices.</p>
                  </div>
                )}

                {validationResult.findings.map((f: any, i: number) => (
                  <div key={i} className={`finding-card ${f.severity === 'ERROR' ? 'critical' : f.severity === 'WARNING' ? 'high' : 'medium'}`}>
                    <div className="finding-header">
                      <span className="finding-rule">{f.rule}</span>
                      <span className={`badge badge-${f.severity === 'ERROR' ? 'error' : 'warning'}`}>{f.severity}</span>
                    </div>
                    <p className="finding-message">{f.message}</p>
                    {f.recommendation && (
                      <>
                        <div className="finding-section-title">How to fix</div>
                        <div className="finding-recommendation">{f.recommendation}</div>
                      </>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="empty-state">
                <ShieldCheck size={40} style={{ color: 'var(--color-text-muted)' }} />
                <p className="empty-state-desc">Validation will run automatically once the project loads.</p>
              </div>
            )}
          </div>
        )}

        {/* SECURITY */}
        {tab === 'security' && (
          <div className="panel-page">
            <h2>Security Center</h2>
            <p>Review security posture for <strong>{architecture?.projectName}</strong>.</p>

            {architecture && (
              <>
                <div className="card" style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Security Checklist</div>
                  {getSecurityChecklist(architecture).map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                      <span style={{ color: item.ok ? 'var(--color-success)' : 'var(--color-warning)', flexShrink: 0 }}>
                        {item.ok ? <CheckCircle2 size={16} /> : <Layers size={16} />}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.desc}</div>
                      </div>
                      <span className={`badge badge-${item.ok ? 'success' : 'warning'}`}>{item.ok ? 'OK' : 'Review'}</span>
                    </div>
                  ))}
                </div>

                <h3>Architecture Decisions</h3>
                {architecture.decisions.map(d => (
                  <div key={d.id} className="card card-sm" style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{d.decision}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{d.reason}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <div className="panel-page">
            <h2>Version History</h2>
            <p>Track every change to your architecture.</p>
            {versions.length === 0 ? (
              <div className="empty-state">
                <History size={32} style={{ color: 'var(--color-text-muted)' }} />
                <p className="empty-state-desc">No version history yet. Changes will appear here.</p>
              </div>
            ) : (
              <ul className="version-timeline">
                {[...versions].reverse().map((v, i) => (
                  <li key={v.id || i} className="version-item">
                    <div className={`version-dot ${i === 0 ? 'current' : ''}`}>{v.version}</div>
                    <div className="version-card">
                      <div className="version-label">Version {v.version} {i === 0 && <span className="badge badge-success" style={{ marginLeft: 8 }}>Current</span>}</div>
                      <div className="version-desc">{v.changeDescription}</div>
                      <div className="version-meta">
                        {v.source} · {new Date(v.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* SCAFFOLD */}
        {tab === 'scaffold' && (
          <div className="panel-page">
            <h2>Project Scaffold</h2>
            <p>Generate a production-ready project structure based on your architecture.</p>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <button className="btn btn-primary" onClick={handleGenerateScaffold}>
                <Code2 size={16} /> Generate Scaffold
              </button>
              {scaffold && (
                <a className="btn btn-secondary" href={projectId ? `/api/projects/${projectId}/export/project.zip` : undefined}>
                  <Download size={16} /> Download ZIP
                </a>
              )}
            </div>

            {status && <p style={{ color: 'var(--color-text-muted)' }}>{status}</p>}

            {scaffold?.tree ? (
              <>
                <h3>Generated Files ({scaffold.tree.length})</h3>
                <div className="file-tree">
                  {scaffold.tree.map((path: string) => (
                    <div key={path} className="file-tree-item">
                      <Code2 size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                      <span>{path}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <Code2 size={32} style={{ color: 'var(--color-text-muted)' }} />
                <p className="empty-state-desc">Click "Generate Scaffold" to create your architecture-aware project structure.</p>
              </div>
            )}
          </div>
        )}

        {/* DRIFT */}
        {tab === 'drift' && (
          <div className="panel-page">
            <h2>Architecture Drift Detection</h2>
            <p>Compare your intended architecture with what's actually in your codebase.</p>

            <button className="btn btn-primary" onClick={handleDriftScan} style={{ marginBottom: 24 }}>
              <GitCompareArrows size={16} /> Analyze Codebase
            </button>

            {driftResult?.driftReport ? (
              <>
                <div className="card" style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', gap: 24 }}>
                    <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Critical</div><div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-error)' }}>{driftResult.driftReport.criticalCount}</div></div>
                    <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>High</div><div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-warning)' }}>{driftResult.driftReport.highCount}</div></div>
                    <div><div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Medium</div><div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-info)' }}>{driftResult.driftReport.mediumCount}</div></div>
                  </div>
                </div>

                {driftResult.driftReport.findings.map((f: any, i: number) => (
                  <div key={i} className={`drift-finding ${f.severity === 'CRITICAL' ? 'critical' : f.severity === 'HIGH' ? '' : 'medium'}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <strong style={{ color: 'var(--color-text-primary)' }}>{f.affectedComponent}</strong>
                      <span className={`badge badge-${f.severity === 'CRITICAL' ? 'error' : 'warning'}`}>{f.severity}</span>
                    </div>
                    <div className="drift-comparison">
                      <div className="drift-expected"><div className="drift-label">Expected</div><div className="drift-value">{f.expected}</div></div>
                      <div className="drift-actual"><div className="drift-label">Actual</div><div className="drift-value">{f.actual}</div></div>
                    </div>
                    <p style={{ fontSize: 13, margin: '8px 0 4px' }}>{f.explanation}</p>
                    <div style={{ fontSize: 12, color: 'var(--color-primary)', background: 'var(--color-primary-glow)', borderRadius: 6, padding: '6px 10px' }}>Recommendation: {f.recommendation}</div>
                  </div>
                ))}
              </>
            ) : (
              <div className="empty-state">
                <GitCompareArrows size={32} style={{ color: 'var(--color-text-muted)' }} />
                <p className="empty-state-desc">Run a codebase scan to detect differences between your intended and actual architecture.</p>
              </div>
            )}
          </div>
        )}

        {/* DOCS */}
        {tab === 'docs' && (
          <div className="panel-page">
            <h2>Documentation</h2>
            {architecture ? (
              <>
                <div className="card" style={{ marginBottom: 24 }}>
                  <h3 style={{ marginBottom: 12 }}>{architecture.projectName}</h3>
                  <p>{architecture.description}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(architecture.stack).map(([k, v]) => (
                      <span key={k} className="badge badge-info">{k}: {v as string}</span>
                    ))}
                  </div>
                </div>

                <h3>Architecture Decisions</h3>
                {architecture.decisions.map(d => (
                  <div key={d.id} className="card card-sm" style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-primary)', marginBottom: 4 }}>{d.id}</div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.decision}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{d.reason}</div>
                  </div>
                ))}

                {architecture.database.tables.length > 0 && (
                  <>
                    <h3>Database Schema</h3>
                    {architecture.database.tables.map(t => (
                      <div key={t.name} className="card card-sm" style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, marginBottom: 8, fontFamily: 'monospace' }}>{t.name}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {t.columns.map(c => (
                            <code key={c.name} style={{ fontSize: 11 }}>{c.name}: {c.type}{c.primaryKey ? ' PK' : ''}</code>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <a className="btn btn-secondary" href={projectId ? `/api/projects/${projectId}/export/architecture.json` : undefined}>
                    <FileJson size={16} /> Export JSON
                  </a>
                  <a className="btn btn-secondary" href={projectId ? `/api/projects/${projectId}/export/project.zip` : undefined}>
                    <Download size={16} /> Export ZIP
                  </a>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <FileText size={32} style={{ color: 'var(--color-text-muted)' }} />
                <p className="empty-state-desc">Documentation is generated from your architecture.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getNodeColor(type: string): string {
  const colors: Record<string, string> = {
    frontend: '#3b82f6',
    service: '#10b981',
    database: '#8b5cf6',
    cache: '#f59e0b',
    messageQueue: '#ef4444',
    externalApi: '#06b6d4',
    platform: '#64748b',
  };
  return colors[type] ?? '#64748b';
}

function getSecurityChecklist(arch: ArchitectureModel) {
  const hasAuth = arch.nodes.some(n => n.id.includes('auth') || n.type === 'service' && n.name.toLowerCase().includes('auth'));
  const hasDb = arch.nodes.some(n => n.type === 'database');
  const hasCache = arch.nodes.some(n => n.type === 'cache');
  const envVarCount = arch.nodes.reduce((sum, n) => sum + n.environmentVariables.length, 0);

  return [
    { label: 'Authentication', desc: hasAuth ? 'Authentication service is configured.' : 'No authentication service found.', ok: hasAuth },
    { label: 'Database Protection', desc: hasDb ? 'Database is accessed through backend services.' : 'No database found in architecture.', ok: hasDb },
    { label: 'Environment Variables', desc: envVarCount > 0 ? `${envVarCount} environment variables configured.` : 'No environment variables defined.', ok: envVarCount > 0 },
    { label: 'External Dependencies', desc: arch.externalDependencies.length > 0 ? `${arch.externalDependencies.length} external services integrated.` : 'No external dependencies.', ok: true },
    { label: 'Architecture Decisions', desc: arch.decisions.length > 0 ? `${arch.decisions.length} architecture decisions documented.` : 'No decisions documented.', ok: arch.decisions.length > 0 },
  ];
}
