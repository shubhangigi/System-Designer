import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ArrowLeft, Cpu, ShoppingCart, Users, Building2, Heart, MessageSquare, Sparkles } from 'lucide-react';
import { createProject } from '../../services/archspaceApi';
import { useToast } from '../../components/common/Toast';

const TEMPLATES = [
  { emoji: '🛒', name: 'E-commerce', hint: 'Online store, marketplace', description: 'An online marketplace where users can browse products, add items to cart, make payments, and track orders. Sellers can list and manage their products.' },
  { emoji: '💬', name: 'Social Platform', hint: 'Feed, profiles, messaging', description: 'A social networking platform where users can create profiles, share posts, follow each other, comment, and send direct messages.' },
  { emoji: '☁️', name: 'SaaS Platform', hint: 'Multi-tenant, subscriptions', description: 'A multi-tenant SaaS application with subscription billing, team workspaces, user roles, and analytics dashboard.' },
  { emoji: '🏦', name: 'Banking App', hint: 'Accounts, transfers, security', description: 'A digital banking application with account management, fund transfers, transaction history, notifications, and strong security.' },
  { emoji: '🏥', name: 'Healthcare', hint: 'Patients, appointments, records', description: 'A healthcare platform where patients can book appointments, access medical records, communicate with doctors, and receive prescription reminders.' },
  { emoji: '🤝', name: 'Collaboration', hint: 'Real-time editing, teams', description: 'A real-time collaboration workspace where teams can create, edit, and share documents simultaneously with version history and comments.' },
];

const SCALES = [
  { emoji: '👤', label: 'Personal / Prototype', desc: 'Just for me, < 100 users. Simple setup, single server.', value: 'Personal / < 100 users' },
  { emoji: '🚀', label: 'Small Startup', desc: 'A few thousand users. Focused on speed and cost.', value: 'Startup / 1K–10K users' },
  { emoji: '📈', label: 'Growing Product', desc: 'Tens of thousands of users. Need to plan for scale.', value: 'Growing / 10K–100K users' },
  { emoji: '🏢', label: 'Large Scale', desc: 'Hundreds of thousands of users. Performance matters.', value: 'Large / 100K–1M users' },
  { emoji: '🌐', label: 'Enterprise', desc: 'Millions of users worldwide. High availability required.', value: 'Enterprise / 1M+ users' },
];

const SECURITY_OPTIONS = [
  { id: 'auth', label: 'User Authentication', desc: 'Login and account management', icon: '🔐' },
  { id: 'rbac', label: 'Role-based Access', desc: 'Admin, user, and custom roles', icon: '👥' },
  { id: 'payment', label: 'Payment Security', desc: 'PCI-compliant payment handling', icon: '💳' },
  { id: 'sensitive', label: 'Sensitive Data', desc: 'Encryption for private data', icon: '🔒' },
  { id: 'api', label: 'API Protection', desc: 'Rate limiting and API keys', icon: '🛡️' },
  { id: 'compliance', label: 'Compliance', desc: 'GDPR, HIPAA, or similar', icon: '📋' },
  { id: 'audit', label: 'Audit Logging', desc: 'Track all important actions', icon: '📝' },
  { id: 'mfa', label: 'Two-factor Auth', desc: 'Extra security for user accounts', icon: '📱' },
];

const GENERATION_STEPS = [
  'Understanding your requirements',
  'Retrieving relevant architecture patterns',
  'Designing system components',
  'Checking security requirements',
  'Validating architecture',
  'Preparing your workspace',
];

export function CreateProjectWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [description, setDescription] = useState('');
  const [scale, setScale] = useState('');
  const [techMode, setTechMode] = useState<'ai' | 'custom'>('ai');
  const [frontend, setFrontend] = useState('React + TypeScript');
  const [backend, setBackend] = useState('Node.js + Express');
  const [database, setDatabase] = useState('PostgreSQL');
  const [auth, setAuth] = useState('JWT sessions');
  const [security, setSecurity] = useState<string[]>(['auth', 'api']);
  const [projectName, setProjectName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);

  function toggleSecurity(id: string) {
    setSecurity(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }

  async function handleGenerate() {
    if (!description.trim() || description.trim().length < 10) {
      toast('Please describe your project idea (at least 10 characters).', 'warning');
      return;
    }
    setGenerating(true);
    setGenStep(0);

    // Animate steps
    for (let i = 0; i < GENERATION_STEPS.length - 1; i++) {
      await new Promise(r => setTimeout(r, 800));
      setGenStep(i + 1);
    }

    const securityRequirements = SECURITY_OPTIONS
      .filter(s => security.includes(s.id))
      .map(s => s.label)
      .join(', ');

    const requirements = [
      description,
      securityRequirements ? `Security requirements: ${securityRequirements}.` : '',
    ].filter(Boolean).join(' ');

    try {
      const project = await createProject({
        name: projectName.trim() || description.slice(0, 50).trim() || 'My Project',
        description: description,
        requirements,
        expectedScale: scale || 'Startup / 1K–10K users',
        frontendPreference: techMode === 'ai' ? 'Let AI decide' : frontend,
        backendPreference: techMode === 'ai' ? 'Let AI decide' : backend,
        databasePreference: techMode === 'ai' ? 'Let AI decide' : database,
        authenticationMethod: techMode === 'ai' ? 'Let AI decide' : auth,
        externalServices: [],
        optionalRequirements: '',
      });
      setGenStep(GENERATION_STEPS.length);
      await new Promise(r => setTimeout(r, 500));
      toast('Architecture generated successfully!', 'success');
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      setGenerating(false);
      setGenStep(0);
      if (err?.code === 'AI_NOT_CONFIGURED') {
        toast('AI provider is not configured. Using intelligent defaults.', 'warning');
      } else {
        toast(err.message || 'Failed to generate architecture. Please try again.', 'error');
      }
    }
  }

  if (generating) {
    return (
      <div className="page-content">
        <div className="generation-progress">
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <Sparkles size={40} color="var(--color-primary)" style={{ marginBottom: 16 }} />
            <h2 style={{ marginBottom: 8 }}>Designing your system</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>System Designer is building your architecture...</p>
          </div>
          <div className="generation-steps">
            {GENERATION_STEPS.map((label, i) => (
              <div key={label} className={`generation-step ${i < genStep ? 'done' : i === genStep ? 'active' : ''}`}>
                {i < genStep ? <CheckCircle2 size={16} /> : i === genStep ? <div className="step-spinner" /> : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid currentColor', flexShrink: 0 }} />}
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalSteps = 5;

  return (
    <div className="page-content">
      <div className="wizard-container">
        {/* Progress */}
        <div className="wizard-progress">
          {Array.from({ length: totalSteps }, (_, i) => (
            <>
              <div key={`dot-${i}`} className={`wizard-step-dot ${step > i + 1 ? 'done' : step === i + 1 ? 'active' : ''}`}>
                {step > i + 1 ? <CheckCircle2 size={16} /> : i + 1}
              </div>
              {i < totalSteps - 1 && <div key={`line-${i}`} className={`wizard-step-line ${step > i + 1 ? 'done' : ''}`} />}
            </>
          ))}
        </div>

        {/* Step 1: Description */}
        {step === 1 && (
          <>
            <h2 className="wizard-title">What are you building?</h2>
            <p className="wizard-subtitle">Describe your idea in plain English. You don't need to know the technical details — just tell us what you want to build.</p>

            <div className="form-group">
              <label className="form-label" htmlFor="project-name">Project name <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input id="project-name" type="text" className="input" value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="e.g. My Marketplace, HealthTracker, TeamFlow" />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">Describe your idea *</label>
              <textarea id="description" className="input" value={description}
                onChange={e => setDescription(e.target.value)} rows={5}
                style={{ minHeight: 140, fontSize: 15 }}
                placeholder="Example: I want to build an online marketplace where multiple sellers can list products, buyers can browse and purchase, and we handle payments securely. It should support millions of products and thousands of concurrent users." />
              <span className="form-hint">{description.length} characters — more detail leads to better architecture</span>
            </div>

            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>Not sure what to write? Try one of these templates:</p>
            <div className="template-grid">
              {TEMPLATES.map(t => (
                <div key={t.name} className="template-card" onClick={() => { setDescription(t.description); if (!projectName) setProjectName(t.name); }}>
                  <div className="template-emoji">{t.emoji}</div>
                  <div className="template-name">{t.name}</div>
                  <div className="template-hint">{t.hint}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Scale */}
        {step === 2 && (
          <>
            <h2 className="wizard-title">How big do you expect it to be?</h2>
            <p className="wizard-subtitle">This helps System Designer choose the right architecture for your expected user load. You can always change this later.</p>
            <div className="scale-options">
              {SCALES.map(s => (
                <div key={s.value} className={`scale-option ${scale === s.value ? 'selected' : ''}`}
                  onClick={() => setScale(s.value)} role="radio" aria-checked={scale === s.value} tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setScale(s.value)}>
                  <span className="scale-option-icon">{s.emoji}</span>
                  <div>
                    <div className="scale-option-label">{s.label}</div>
                    <p className="scale-option-desc">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 3: Tech preferences */}
        {step === 3 && (
          <>
            <h2 className="wizard-title">Technology preferences</h2>
            <p className="wizard-subtitle">Let System Designer choose the best technologies, or specify your own preferences.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {(['ai', 'custom'] as const).map(mode => (
                <div key={mode} className={`scale-option ${techMode === mode ? 'selected' : ''}`}
                  onClick={() => setTechMode(mode)} role="radio" aria-checked={techMode === mode} tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setTechMode(mode)}>
                  <span className="scale-option-icon">{mode === 'ai' ? '✨' : '⚙️'}</span>
                  <div>
                    <div className="scale-option-label">{mode === 'ai' ? 'Let AI decide' : 'I have preferences'}</div>
                    <p className="scale-option-desc">{mode === 'ai' ? 'Best for beginners. AI picks the optimal stack.' : 'Specify your frontend, backend, and database.'}</p>
                  </div>
                </div>
              ))}
            </div>

            {techMode === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="frontend-pref">Frontend</label>
                  <input id="frontend-pref" type="text" className="input" value={frontend} onChange={e => setFrontend(e.target.value)} placeholder="React + TypeScript" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="backend-pref">Backend</label>
                  <input id="backend-pref" type="text" className="input" value={backend} onChange={e => setBackend(e.target.value)} placeholder="Node.js + Express" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="database-pref">Database</label>
                  <input id="database-pref" type="text" className="input" value={database} onChange={e => setDatabase(e.target.value)} placeholder="PostgreSQL" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="auth-pref">Authentication</label>
                  <input id="auth-pref" type="text" className="input" value={auth} onChange={e => setAuth(e.target.value)} placeholder="JWT sessions" />
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 4: Security */}
        {step === 4 && (
          <>
            <h2 className="wizard-title">Security requirements</h2>
            <p className="wizard-subtitle">Select the security features your application needs. System Designer will include these in your architecture and security analysis.</p>

            <div className="security-checkboxes">
              {SECURITY_OPTIONS.map(opt => (
                <div key={opt.id} className={`checkbox-item ${security.includes(opt.id) ? 'checked' : ''}`}
                  onClick={() => toggleSecurity(opt.id)}>
                  <input type="checkbox" checked={security.includes(opt.id)} onChange={() => toggleSecurity(opt.id)}
                    aria-label={opt.label} />
                  <div>
                    <div className="checkbox-label">{opt.icon} {opt.label}</div>
                    <p className="checkbox-desc">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--color-primary-glow)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              💡 <strong style={{ color: 'var(--color-primary)' }}>Tip:</strong> User Authentication and API Protection are recommended for most applications.
            </div>
          </>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <>
            <h2 className="wizard-title">Review your project</h2>
            <p className="wizard-subtitle">Here's a summary of what System Designer will build for you. Click Generate Architecture when you're ready.</p>

            <div className="card" style={{ marginBottom: 24 }}>
              <table className="review-table">
                <tbody>
                  <tr><td>Project name</td><td>{projectName || description.slice(0, 50) || 'Untitled'}</td></tr>
                  <tr><td>Description</td><td style={{ maxWidth: 300 }}>{description.slice(0, 120)}{description.length > 120 ? '...' : ''}</td></tr>
                  <tr><td>Expected scale</td><td>{scale || 'Startup / 1K–10K users'}</td></tr>
                  <tr><td>Technology</td><td>{techMode === 'ai' ? 'AI-selected (recommended)' : `${frontend}, ${backend}, ${database}`}</td></tr>
                  <tr><td>Security</td><td>{SECURITY_OPTIONS.filter(s => security.includes(s.id)).map(s => s.label).join(', ') || 'None selected'}</td></tr>
                </tbody>
              </table>
            </div>

            <button className="btn btn-primary btn-xl w-full" onClick={handleGenerate}>
              <Sparkles size={20} /> Generate Architecture
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 12 }}>
              This usually takes 15–60 seconds depending on AI provider response time.
            </p>
          </>
        )}

        {/* Navigation */}
        <div className="wizard-nav">
          {step > 1 ? (
            <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft size={16} /> Back
            </button>
          ) : <div />}
          {step < totalSteps && (
            <button className="btn btn-primary" onClick={() => {
              if (step === 1 && description.trim().length < 10) {
                alert('Please describe your project idea (at least 10 characters).');
                return;
              }
              setStep(s => s + 1);
            }}>
              Continue <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
