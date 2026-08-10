import { create } from 'zustand';
import type { ArchitectureModel, ArchitectureNode } from '@archspace/shared';

interface WorkspaceState {
  projectId?: string;
  architecture?: ArchitectureModel;
  selectedNodeId?: string;
  setProject: (projectId: string, architecture: ArchitectureModel) => void;
  setArchitecture: (architecture: ArchitectureModel) => void;
  selectNode: (id?: string) => void;
  updateNode: (id: string, patch: Partial<ArchitectureNode>) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  setProject: (projectId, architecture) => set({ projectId, architecture, selectedNodeId: architecture.nodes[0]?.id }),
  setArchitecture: (architecture) => set({ architecture }),
  selectNode: (id) => set({ selectedNodeId: id }),
  updateNode: (id, patch) =>
    set((state) => {
      if (!state.architecture) return state;
      return {
        architecture: {
          ...state.architecture,
          nodes: state.architecture.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)),
        },
      };
    }),
}));
