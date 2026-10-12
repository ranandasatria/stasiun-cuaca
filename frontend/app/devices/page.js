'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getToken, clearToken, formatWIB } from '../../lib/api';

const STATUSES = ['', 'PROVISIONED', 'ACTIVE', 'MAINTENANCE', 'DECOMMISSIONED'];

export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ id: '', name: '', locationId: '' });
  const [newKey, setNewKey] = useState(null);
  const [formError, setFormError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (status) params.status = status;
      if (q) params.q = q;
      const res = await api.devices(params);
      setDevices(res.data);
      setMeta(res.meta);
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
  }, [page, status, q, router]);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    load();
  }, [load, router]);

  async function openForm() {
    setShowForm(true);
    setNewKey(null);
    setFormError(null);
    if (locations.length === 0) {
      const res = await api.locations({ limit: 100 });
      setLocations(res.data);
    }
  }

  async function submitForm(e) {
    e.preventDefault();
    setFormError(null);
    try {
      const res = await api.createDevice({
        id: form.id,
        name: form.name,
        locationId: Number(form.locationId),
      });
      setNewKey(res.data.apiKey);
      setForm({ id: '', name: '', locationId: '' });
      load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function removeDevice(id) {
    if (!window.confirm(`Delete device ${id}?`)) return;
    await api.deleteDevice(id);
    load();
  }

  function signOut() {
    clearToken();
    router.push('/login');
  }

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  return (
    <main className="container">
      <div className="topbar">
        <span className="topbar-title">
          <Link className="link" href="/">
            Stations
          </Link>{' '}
          / Manage devices
        </span>
        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>

      <div className="filters">
        <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || 'All statuses'}
            </option>
          ))}
        </select>
        <input
          className="input"
          style={{ maxWidth: 220 }}
          placeholder="Search name"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
        <button className="btn" onClick={openForm}>
          Register device
        </button>
      </div>

      {showForm && (
        <div className="panel">
          <div className="chart-title">Register a new device</div>
          {formError && <div className="alert">{formError}</div>}
          {newKey && (
            <div className="alert">
              Device created. API key (shown once, save it now): <code>{newKey}</code>
            </div>
          )}
          <form className="form-grid" onSubmit={submitForm}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span className="field-label">Device ID</span>
              <input className="input" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="WS-GRT-009" />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span className="field-label">Name</span>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span className="field-label">Location</span>
              <select className="select" value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                <option value="">Select location</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="row-actions">
              <button className="btn" type="submit">
                Create
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {error && <div className="alert">Could not load devices. {error}</div>}
      {loading && <p className="muted">Loading devices...</p>}

      {!loading && !error && devices.length === 0 && <p className="muted">No devices match this filter.</p>}

      {!loading && !error && devices.length > 0 && (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Status</th>
                <th>Last seen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.name}</td>
                  <td>{d.status}</td>
                  <td className="muted small">{d.lastSeenAt ? formatWIB(d.lastSeenAt) : '-'}</td>
                  <td>
                    <div className="row-actions">
                      <Link className="btn btn-secondary btn-sm" href={`/devices/${d.id}`}>
                        Manage
                      </Link>
                      <button className="btn btn-secondary btn-sm" onClick={() => removeDevice(d.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pager">
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span className="muted small">
              Page {meta.page} of {totalPages} · {meta.total} devices
            </span>
            <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </>
      )}
    </main>
  );
}
