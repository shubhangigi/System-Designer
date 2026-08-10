import type { ArchitectureModel, ProjectInput } from '@archspace/shared';

const jsonHeaders = { 'Content-Type': 'application/json' };

export async function listProjects() {
  const response = await fetch('/api/projects');
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function getProject(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function createProject(input: ProjectInput) {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function deleteProject(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function saveArchitecture(
  projectId: string,
  architecture: ArchitectureModel,
  changeDescription?: string,
  expectedVersion?: number,
) {
  const response = await fetch(`/api/projects/${projectId}/architecture`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify({ architecture, changeDescription, expectedVersion }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to save architecture' }));
    const error = new Error(errorData.error || 'Failed to save architecture');
    (error as any).code = errorData.code;
    throw error;
  }
  return response.json();
}

export async function approveArchitecture(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/architecture/approve`, { method: 'POST' });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function proposeChange(projectId: string, instruction: string) {
  const response = await fetch(`/api/projects/${projectId}/architecture/propose-change`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ instruction }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function applyChange(projectId: string, instruction?: string) {
  const response = await fetch(`/api/projects/${projectId}/architecture/apply-change`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ instruction }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function getScaffold(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/scaffold`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function analyzeCodebase(projectId: string, files: Array<{ path: string; content: string }>) {
  const response = await fetch(`/api/projects/${projectId}/analyze-codebase`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ files }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function generateArchitecture(projectId: string, requirements?: string) {
  const response = await fetch(`/api/projects/${projectId}/architecture/generate`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ requirements }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Architecture generation failed' }));
    const error = new Error(body.error || 'Architecture generation failed');
    (error as any).code = body.code;
    throw error;
  }
  return response.json();
}

export async function getArchitectureVersions(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/architecture/versions`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function getArchitectureVersion(projectId: string, version: number) {
  const response = await fetch(`/api/projects/${projectId}/architecture/versions/${version}`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function validateProjectArchitecture(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/validate`, { method: 'POST' });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
