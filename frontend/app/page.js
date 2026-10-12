'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getToken, clearToken, formatWIB } from '../lib/api';

export default function OverviewPage() {
  const router = useRouter();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.overview();
      setDevices(res.data.devices);
      setUpdatedAt(new Date());
      setError(null);
    } catch (err) {
      if (err.status === 401) {
        router.push('/login');
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return undefined;
    }
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load, router]);

  function logout() {
    clearToken();
    router.push('/login');
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Stasiun Cuaca</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: '#666', fontSize: 13 }}>
            Last updated: {updatedAt ? formatWIB(updatedAt) : '-'}
          </span>
          <button onClick={load}>Refresh</button>
          <Link href="/devices">Manage</Link>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      {loading && <p>Loading devices...</p>}
      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
      {!loading && !error && devices.length === 0 && <p>No devices registered.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginTop: 16 }}>
        {devices.map((d) => (
          <Link key={d.id} href={`/stations/${d.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{d.name}</strong>
                <span
                  style={{
                    fontSize: 12,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: d.online ? '#d7f5dd' : '#f8d7da',
                    color: d.online ? '#1b6b2f' : '#842029',
                  }}
                >
                  {d.online ? 'online' : 'offline'}
                </span>
              </div>
              <div style={{ color: '#666', fontSize: 13, margin: '4px 0 12px' }}>{d.location?.name || '-'}</div>
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 22 }}>{d.temp_air ?? '-'}°C</div>
                  <div style={{ fontSize: 12, color: '#666' }}>temp</div>
                </div>
                <div>
                  <div style={{ fontSize: 22 }}>{d.humidity ?? '-'}%</div>
                  <div style={{ fontSize: 12, color: '#666' }}>humidity</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 12 }}>
                {d.lastSeenAt ? `Updated ${formatWIB(d.lastSeenAt)}` : 'Never reported'}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
