import type { ArchitectureNode } from '@archspace/shared';

interface Props {
  node?: ArchitectureNode;
  onUpdate: (patch: Partial<ArchitectureNode>) => void;
}

export function ArchitectureInspector({ node, onUpdate }: Props) {
  if (!node) {
    return <aside className="panel inspector"><h2>Inspector</h2><p>Select a node to inspect responsibilities, APIs, dependencies, and failure notes.</p></aside>;
  }
  return (
    <aside className="panel inspector">
      <h2>{node.name}</h2>
      <label>Name<input value={node.name} onChange={(event) => onUpdate({ name: event.target.value })} /></label>
      <label>Technology<input value={node.technology} onChange={(event) => onUpdate({ technology: event.target.value })} /></label>
      <label>Responsibility<textarea value={node.responsibility} onChange={(event) => onUpdate({ responsibility: event.target.value })} /></label>
      <section>
        <h3>Dependencies</h3>
        <ul>{node.dependencies.map((dep) => <li key={dep}>{dep}</li>)}</ul>
      </section>
      <section>
        <h3>APIs</h3>
        <ul>{node.apis.map((api) => <li key={`${api.method}-${api.path}`}>{api.method} {api.path}</li>)}</ul>
      </section>
      <section>
        <h3>What-if</h3>
        <p>{node.name} exists to protect the {node.type} boundary. If it fails, callers should degrade gracefully, retry idempotent work, and avoid bypassing the approved dependency path.</p>
      </section>
    </aside>
  );
}
