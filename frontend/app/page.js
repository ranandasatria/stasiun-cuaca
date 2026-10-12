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

  function signOut() {
    clearToken();
    router.push('/login');
  }

  return (
    <main className="container">
      <div className="topbar">
        <span className="topbar-title">Stations</span>
        <div className="topbar-actions">
          <span className="muted small">{updatedAt ? `Updated ${formatWIB(updatedAt)}` : ''}</span>
          <button className="btn btn-secondary" onClick={load}>
            Refresh
          </button>
          <Link className="btn btn-secondary" href="/devices">
            Manage
          </Link>
          <button className="btn btn-secondary" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>

      {loading && <p className="muted">Loading stations...</p>}

      {!loading && error && (
        <div>
          <div className="alert">Could not load stations. {error}</div>
          <button className="btn btn-secondary" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && devices.length === 0 && (
        <p className="muted">No stations yet. Run the seeder or register a device to get started.</p>
      )}

      {!loading && !error && devices.length > 0 && (
        <div className="grid">
          {devices.map((d) => (
            <Link key={d.id} href={`/stations/${d.id}`} className="card">
              <div className="card-head">
                <span className="card-name">{d.name}</span>
                <span className={`badge ${d.online ? 'badge-online' : ''}`}>
                  {d.online ? 'online' : 'offline'}
                </span>
              </div>
              <div className="muted small">{d.location?.name || 'No location'}</div>

              <div className="metric-row">
                <div>
                  <div className="metric">{d.temp_air ?? '–'}°</div>
                  <div className="metric-label">Temperature</div>
                </div>
                <div>
                  <div className="metric">{d.humidity ?? '–'}%</div>
                  <div className="metric-label">Humidity</div>
                </div>
              </div>

              <div className="muted small" style={{ marginTop: 14 }}>
                {d.lastSeenAt ? `Updated ${formatWIB(d.lastSeenAt)}` : 'No data yet'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
