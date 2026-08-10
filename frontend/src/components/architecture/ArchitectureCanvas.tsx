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
} from '@xyflow/react';
import type { ArchitectureModel } from '@archspace/shared';

interface Props {
  architecture: ArchitectureModel;
  onChange: (architecture: ArchitectureModel) => void;
  onSelect: (nodeId?: string) => void;
}

const colors: Record<string, string> = {
  frontend: '#2563eb',
  service: '#0f766e',
  database: '#7c2d12',
  cache: '#9333ea',
  messageQueue: '#b45309',
  externalApi: '#be123c',
  platform: '#475569',
};

export function ArchitectureCanvas({ architecture, onChange, onSelect }: Props) {
  const initialNodes = useMemo<Node[]>(
    () =>
      architecture.nodes.map((node) => ({
        id: node.id,
        position: node.position,
        data: { label: `${node.name}\n${node.technology}` },
        style: {
          width: 210,
          minHeight: 74,
          borderRadius: 8,
          border: `1px solid ${colors[node.type] ?? '#334155'}`,
          background: '#ffffff',
          color: '#0f172a',
          boxShadow: '0 10px 22px rgba(15, 23, 42, 0.08)',
          fontSize: 13,
          whiteSpace: 'pre-line',
        },
      })),
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
    setEdges((current) => addEdge({ ...edge, type: 'smoothstep', label: edge.protocol }, current));
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
    >
      <Background />
      <Controls />
      <MiniMap nodeColor={(node) => colors[architecture.nodes.find((entry) => entry.id === node.id)?.type ?? 'platform']} />
    </ReactFlow>
  );
}
