import type { ArchitectureModel, ProjectInput } from '@archspace/shared';

const API_BASE = '/api';

async function apiFetch(path: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (response.status === 401) {
    // Redirect to login on auth failure
    window.location.href = '/login';
    throw new Error('Session expired. Redirecting to login.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = new Error(body.error || `Request failed (${response.status})`);
    (err as any).code = body.code;
    (err as any).status = response.status;
    throw err;
  }
  return response.json();
}

export async function listProjects() { return apiFetch('/projects'); }
export async function getProject(id: string) { return apiFetch(`/projects/${id}`); }
export async function createProject(input: ProjectInput) {
  return apiFetch('/projects', { method: 'POST', body: JSON.stringify(input) });
}
export async function deleteProject(id: string) {
  return apiFetch(`/projects/${id}`, { method: 'DELETE' });
}
export async function saveArchitecture(projectId: string, architecture: ArchitectureModel, changeDescription?: string, expectedVersion?: number) {
  return apiFetch(`/projects/${projectId}/architecture`, {
    method: 'PUT',
    body: JSON.stringify({ architecture, changeDescription, expectedVersion }),
  });
}
export async function approveArchitecture(projectId: string) {
  return apiFetch(`/projects/${projectId}/architecture/approve`, { method: 'POST' });
}
export async function proposeChange(projectId: string, instruction: string) {
  return apiFetch(`/projects/${projectId}/architecture/propose-change`, {
    method: 'POST', body: JSON.stringify({ instruction }),
  });
}
export async function applyChange(projectId: string, instruction?: string) {
  return apiFetch(`/projects/${projectId}/architecture/apply-change`, {
    method: 'POST', body: JSON.stringify({ instruction }),
  });
}
export async function getScaffold(projectId: string) { return apiFetch(`/projects/${projectId}/scaffold`); }
export async function analyzeCodebase(projectId: string, files: Array<{ path: string; content: string }>) {
  return apiFetch(`/projects/${projectId}/analyze-codebase`, {
    method: 'POST', body: JSON.stringify({ files }),
  });
}
export async function generateArchitecture(projectId: string, requirements?: string) {
  return apiFetch(`/projects/${projectId}/architecture/generate`, {
    method: 'POST', body: JSON.stringify({ requirements }),
  });
}
export async function getArchitectureVersions(projectId: string) {
  return apiFetch(`/projects/${projectId}/architecture/versions`);
}
export async function getArchitectureVersion(projectId: string, version: number) {
  return apiFetch(`/projects/${projectId}/architecture/versions/${version}`);
}
export async function validateProjectArchitecture(projectId: string) {
  return apiFetch(`/projects/${projectId}/validate`, { method: 'POST' });
}
