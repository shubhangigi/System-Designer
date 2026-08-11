import { useEffect, useMemo } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ArchitectureModel } from '@archspace/shared';

interface Props {
  architecture: ArchitectureModel;
  onChange: (architecture: ArchitectureModel) => void;
  onSelect: (nodeId?: string) => void;
}

const NODE_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  frontend: { bg: 'rgba(59,130,246,0.1)', border: '#3b82f6', label: 'Frontend' },
  service: { bg: 'rgba(16,185,129,0.1)', border: '#10b981', label: 'Service' },
  database: { bg: 'rgba(139,92,246,0.1)', border: '#8b5cf6', label: 'Database' },
  cache: { bg: 'rgba(245,158,11,0.1)', border: '#f59e0b', label: 'Cache' },
  messageQueue: { bg: 'rgba(239,68,68,0.1)', border: '#ef4444', label: 'Queue' },
  externalApi: { bg: 'rgba(6,182,212,0.1)', border: '#06b6d4', label: 'External' },
  platform: { bg: 'rgba(100,116,139,0.1)', border: '#64748b', label: 'Platform' },
};

const NODE_ICONS: Record<string, string> = {
  frontend: '🖥️',
  service: '⚙️',
  database: '🗄️',
  cache: '⚡',
  messageQueue: '📬',
  externalApi: '🌐',
  platform: '🏗️',
};

export function ArchitectureCanvas({ architecture, onChange, onSelect }: Props) {
  const initialNodes = useMemo<Node[]>(
    () =>
      architecture.nodes.map((node) => {
        const color = NODE_COLORS[node.type] ?? NODE_COLORS.platform;
        const icon = NODE_ICONS[node.type] ?? '📦';
        return {
          id: node.id,
          position: node.position,
          data: {
            label: (
              <div style={{ textAlign: 'center', padding: '4px 8px' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontWeight: 600, fontSize: 12, color: '#f1f5f9', marginBottom: 2 }}>{node.name}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{node.technology}</div>
                <div style={{ fontSize: 9, color: color.border, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, fontWeight: 600 }}>{color.label}</div>
              </div>
            ),
          },
          style: {
            width: 160,
            minHeight: 90,
            borderRadius: 12,
            border: `1.5px solid ${color.border}`,
            background: color.bg,
            backdropFilter: 'blur(8px)',
            boxShadow: `0 4px 20px ${color.border}33`,
          },
        };
      }),
    [architecture.nodes],
  );

  const initialEdges = useMemo<Edge[]>(
    () =>
      architecture.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.protocol,
        animated: edge.type === 'async',
        type: 'smoothstep',
        style: { stroke: '#4f8ef7', strokeWidth: 1.5 },
        labelStyle: { fill: '#64748b', fontSize: 10, fontFamily: 'Inter' },
        labelBgStyle: { fill: '#1a2035', fillOpacity: 0.9 },
      })),
    [architecture.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => setNodes(initialNodes), [initialNodes, setNodes]);
  useEffect(() => setEdges(initialEdges), [initialEdges, setEdges]);

  function syncNodes(nextNodes: Node[]) {
    setNodes(nextNodes);
    onChange({
      ...architecture,
      nodes: architecture.nodes.map((node) => {
        const visual = nextNodes.find((entry) => entry.id === node.id);
        return visual ? { ...node, position: visual.position } : node;
      }),
    });
  }

  function connect(connection: Connection) {
    const edge = {
      id: `${connection.source}-${connection.target}-${Date.now()}`,
      source: connection.source!,
      target: connection.target!,
      type: 'sync' as const,
      protocol: 'HTTP',
      purpose: 'User-created connection',
    };
    setEdges((current) => addEdge({ ...edge, type: 'smoothstep', label: edge.protocol, style: { stroke: '#4f8ef7' }, labelStyle: { fill: '#64748b', fontSize: 10 } }, current));
    onChange({ ...architecture, edges: [...architecture.edges, edge] });
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={(_, __, allNodes) => syncNodes(allNodes)}
      onConnect={connect}
      onNodeClick={(_, node) => onSelect(node.id)}
      onPaneClick={() => onSelect(undefined)}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      style={{ background: 'var(--color-bg)' }}
    >
      <Background variant={BackgroundVariant.Dots} color="#2a3550" gap={20} size={1} />
      <Controls />
      <MiniMap
        nodeColor={(node) => {
          const archNode = architecture.nodes.find(n => n.id === node.id);
          return NODE_COLORS[archNode?.type ?? 'platform']?.border ?? '#64748b';
        }}
        style={{ background: 'var(--color-bg-card)' }}
      />
    </ReactFlow>
  );
}
