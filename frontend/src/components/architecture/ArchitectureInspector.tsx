import type { ArchitectureNode } from '@archspace/shared';

interface Props {
  node?: ArchitectureNode;
  onUpdate: (patch: Partial<ArchitectureNode>) => void;
}

const NODE_EXPLANATIONS: Record<string, { what: string; why: string; choice: string; remove: string }> = {
  frontend: {
    what: 'The user-facing web application that runs in the browser.',
    why: 'Users interact with your product through the frontend. It handles UI, routing, and API calls to the backend.',
    choice: 'Selected based on your technology preferences and modern best practices for building interactive UIs.',
    remove: 'Without a frontend, users would have no way to interact with your system.',
  },
  service: {
    what: 'A backend service that handles business logic and data operations.',
    why: 'Backend services process requests from the frontend, apply business rules, and interact with the database and other services.',
    choice: 'This service was created to handle a specific responsibility in your system, keeping the architecture organized and maintainable.',
    remove: 'Removing this service would require merging its responsibilities elsewhere, potentially creating a less maintainable codebase.',
  },
  database: {
    what: 'A persistent data store that saves your application\'s data.',
    why: 'Your application needs to store user data, content, and business records reliably across restarts.',
    choice: 'Chosen based on your data structure requirements and the need for reliability, transactions, or flexible querying.',
    remove: 'Without a database, your application would lose all data on restart and couldn\'t support multiple users.',
  },
  cache: {
    what: 'A fast in-memory data store used to speed up repeated data access.',
    why: 'Caching reduces database load and speeds up responses for frequently accessed data.',
    choice: 'Added because your scale requirements suggest caching will meaningfully improve performance and reduce costs.',
    remove: 'Without caching, every request would hit the database, potentially causing slower response times under load.',
  },
  messageQueue: {
    what: 'A message broker that enables services to communicate asynchronously.',
    why: 'Queues allow background processing of tasks like emails, notifications, and reports without blocking user requests.',
    choice: 'Added because your requirements include operations that can be processed asynchronously to improve response times.',
    remove: 'Without a queue, long-running operations would need to complete synchronously, slowing down user responses.',
  },
  externalApi: {
    what: 'A third-party service that provides functionality your app depends on.',
    why: 'External services handle specialized functionality like payments, email, or mapping that would be complex to build yourself.',
    choice: 'Added because your requirements include functionality best served by an established, specialized provider.',
    remove: 'Removing this would require either building the functionality yourself or losing that feature.',
  },
};

export function ArchitectureInspector({ node, onUpdate }: Props) {
  if (!node) {
    return (
      <aside className="inspector">
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 13, margin: 0 }}>Click any component on the canvas to inspect it and see why it was chosen.</p>
        </div>
      </aside>
    );
  }

  const explanations = NODE_EXPLANATIONS[node.type] ?? NODE_EXPLANATIONS.service;

  return (
    <aside className="inspector">
      <div className="inspector-header">
        <div className="inspector-node-icon" style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)' }}>
          <span style={{ fontSize: 18 }}>{getNodeIcon(node.type)}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{node.technology}</div>
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-title">Why System Designer chose this</div>
        <div className="explain-box">
          <div className="explain-question">What is this?</div>
          <p className="explain-answer">{explanations.what}</p>
        </div>
        <div className="explain-box">
          <div className="explain-question">Why is it needed?</div>
          <p className="explain-answer">{explanations.why}</p>
        </div>
        <div className="explain-box">
          <div className="explain-question">Why was it chosen?</div>
          <p className="explain-answer">{explanations.choice}</p>
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-title">Responsibility</div>
        <textarea className="input" value={node.responsibility}
          onChange={(e) => onUpdate({ responsibility: e.target.value })}
          style={{ minHeight: 70, fontSize: 13 }} />
      </div>

      {node.apis.length > 0 && (
        <div className="inspector-section">
          <div className="inspector-section-title">API Endpoints ({node.apis.length})</div>
          {node.apis.slice(0, 5).map((api, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <code style={{ fontSize: 10, background: 'var(--color-primary-glow)', color: 'var(--color-primary)', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>{api.method}</code>
              <code style={{ fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{api.path}</code>
            </div>
          ))}
        </div>
      )}

      {node.environmentVariables.length > 0 && (
        <div className="inspector-section">
          <div className="inspector-section-title">Environment Variables</div>
          {node.environmentVariables.map(v => (
            <code key={v} style={{ display: 'block', fontSize: 11, marginBottom: 4 }}>{v}</code>
          ))}
        </div>
      )}

      {node.dependencies.length > 0 && (
        <div className="inspector-section">
          <div className="inspector-section-title">Dependencies</div>
          {node.dependencies.map(d => <div key={d} style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>→ {d}</div>)}
        </div>
      )}

      <div className="inspector-section">
        <div className="inspector-section-title">⚠️ What if I remove this?</div>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>{explanations.remove}</p>
      </div>
    </aside>
  );
}

function getNodeIcon(type: string): string {
  const icons: Record<string, string> = {
    frontend: '🖥️', service: '⚙️', database: '🗄️',
    cache: '⚡', messageQueue: '📬', externalApi: '🌐', platform: '🏗️',
  };
  return icons[type] ?? '📦';
}
