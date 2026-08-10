import { useState } from 'react';
import type { ProjectInput } from '@archspace/shared';

interface Props {
  onCreate: (input: ProjectInput) => Promise<void>;
}

export function CreateProjectForm({ onCreate }: Props) {
  const [input, setInput] = useState<ProjectInput>({
    name: 'Food Delivery Platform',
    description: 'Build a scalable food delivery application.',
    requirements: 'Users can browse restaurants, add items to cart, place orders, make payments, receive notifications, and track deliveries.',
    expectedScale: '1M monthly users',
    frontendPreference: 'React + TypeScript',
    backendPreference: 'Node.js + Express',
    databasePreference: 'PostgreSQL',
    authenticationMethod: 'JWT sessions',
    externalServices: [],
    optionalRequirements: '',
  });

  return (
    <form className="project-form" onSubmit={(event) => { event.preventDefault(); void onCreate(input); }}>
      <div className="form-grid">
        <label>Project<input value={input.name} onChange={(event) => setInput({ ...input, name: event.target.value })} /></label>
        <label>Scale<input value={input.expectedScale} onChange={(event) => setInput({ ...input, expectedScale: event.target.value })} /></label>
        <label>Frontend<input value={input.frontendPreference} onChange={(event) => setInput({ ...input, frontendPreference: event.target.value })} /></label>
        <label>Backend<input value={input.backendPreference} onChange={(event) => setInput({ ...input, backendPreference: event.target.value })} /></label>
        <label>Database<input value={input.databasePreference} onChange={(event) => setInput({ ...input, databasePreference: event.target.value })} /></label>
        <label>Auth<input value={input.authenticationMethod} onChange={(event) => setInput({ ...input, authenticationMethod: event.target.value })} /></label>
      </div>
      <label>Description<textarea value={input.description} onChange={(event) => setInput({ ...input, description: event.target.value })} /></label>
      <label>Requirements<textarea value={input.requirements} onChange={(event) => setInput({ ...input, requirements: event.target.value })} /></label>
      <button type="submit">Analyze and Generate Architecture</button>
    </form>
  );
}
