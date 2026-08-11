import { Link } from 'react-router-dom';
import { Cpu, ShieldCheck, GitCompareArrows, Code2, History, Layers, ArrowRight } from 'lucide-react';
import { Logo } from '../../components/common/Logo';

const features = [
  { icon: Cpu, title: 'AI Architecture', desc: 'Describe your idea in plain English and get a production-ready system architecture.' },
  { icon: ShieldCheck, title: 'Security Analysis', desc: 'Automatic security assessment with actionable recommendations.' },
  { icon: Layers, title: 'Validation', desc: 'Architecture health score with detailed findings and fixes.' },
  { icon: Code2, title: 'Code Scaffold', desc: 'Generate project structure and starter code from your architecture.' },
  { icon: History, title: 'Version History', desc: 'Track every architecture change with full version control.' },
  { icon: GitCompareArrows, title: 'Drift Detection', desc: 'Compare intended vs actual architecture to catch divergence.' },
];

const flowSteps = [
  { label: 'Describe' },
  { label: 'Design' },
  { label: 'Validate' },
  { label: 'Build' },
];

export function LandingPage() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Logo size="sm" />
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" className="btn btn-ghost">Sign in</Link>
          <Link to="/register" className="btn btn-primary">Get started free</Link>
        </div>
      </nav>

      <main className="landing-hero">
        <div className="hero-badge">
          <Cpu size={12} />
          AI-Powered Architecture Design
        </div>

        <h1 className="hero-title">
          Design your system.<br />
          <span>Understand your architecture.</span><br />
          Build with confidence.
        </h1>

        <p className="hero-subtitle">
          Describe your software idea in plain English. System Designer uses AI and architectural knowledge to turn it into a validated, production-ready system architecture — with explanations, security analysis, and exportable project scaffolding.
        </p>

        <div className="hero-cta">
          <Link to="/register" className="btn btn-primary btn-xl">
            Start Designing
            <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="btn btn-secondary btn-xl">
            Sign in
          </Link>
        </div>

        {/* Flow diagram */}
        <div className="landing-flow">
          {flowSteps.map((step, i) => (
            <>
              <div key={step.label} className="flow-step">
                <div className="flow-step-num">{i + 1}</div>
                <span className="flow-step-label">{step.label}</span>
              </div>
              {i < flowSteps.length - 1 && (
                <span key={`arrow-${i}`} className="flow-arrow" aria-hidden="true">
                  <ArrowRight size={16} />
                </span>
              )}
            </>
          ))}
        </div>

        {/* Features */}
        <div className="landing-features">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">
                <f.icon size={18} />
              </div>
              <div className="feature-title">{f.title}</div>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
