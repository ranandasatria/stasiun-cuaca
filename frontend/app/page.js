'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Home() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <main style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Stasiun Cuaca Dashboard</h1>
      <p>Backend connectivity check:</p>
      {error && <pre style={{ color: 'crimson' }}>error: {error}</pre>}
      {health && <pre>{JSON.stringify(health, null, 2)}</pre>}
      {!health && !error && <p>checking...</p>}
    </main>
  );
}
