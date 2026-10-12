'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getToken, formatWIB } from '../../../lib/api';

const STATUSES = ['PROVISIONED', 'ACTIVE', 'MAINTENANCE', 'DECOMMISSIONED'];

export default function DeviceManageClient({ id }) {
  const router = useRouter();

  const [device, setDevice] = useState(null);
  const [locations, setLocations] = useState([]);
  const [allSensors, setAllSensors] = useState([]);
  const [installed, setInstalled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [editForm, setEditForm] = useState({ name: '', locationId: '' });
  const [statusForm, setStatusForm] = useState({ status: 'ACTIVE', reason: '' });
  const [installId, setInstallId] = useState('');
  const [calib, setCalib] = useState({});

  const load = useCallback(async () => {
    try {
      const [d, locs, sensors, inst] = await Promise.all([
        api.device(id),
        api.locations({ limit: 100 }),
        api.sensors(),
        api.deviceSensors(id),
      ]);
      setDevice(d.data);
      setEditForm({ name: d.data.name, locationId: String(d.data.locationId) });
      setStatusForm({ status: d.data.status, reason: '' });
      setLocations(locs.data);
      setAllSensors(sensors.data);
      setInstalled(inst.data);
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
  }, [id, router]);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    load();
  }, [load, router]);

  async function saveFields(e) {
    e.preventDefault();
    setNotice(null);
    try {
      await api.updateDevice(id, { name: editForm.name, locationId: Number(editForm.locationId) });
      setNotice('Device updated.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveStatus(e) {
    e.preventDefault();
    setNotice(null);
    try {
      await api.updateDevice(id, { status: statusForm.status, reason: statusForm.reason });
      setNotice('Status changed.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function install(e) {
    e.preventDefault();
    setNotice(null);
    try {
      await api.installSensor(id, { sensorId: Number(installId) });
      setInstallId('');
      setNotice('Sensor installed.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function uninstall(sensorId) {
    setNotice(null);
    try {
      await api.uninstallSensor(id, sensorId);
      setNotice('Sensor removed.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addCalibration(sensorId) {
    setNotice(null);
    const c = calib[sensorId] || {};
    try {
      await api.addCalibration(sensorId, {
        effectiveFrom: new Date().toISOString(),
        offset: Number(c.offset ?? 0),
        scale: Number(c.scale ?? 1),
        reason: c.reason || 'field calibration',
      });
      setNotice('Calibration added.');
      setCalib({ ...calib, [sensorId]: { offset: '', scale: '', reason: '' } });
    } catch (err) {
      setError(err.message);
    }
  }

  const installedIds = new Set(installed.map((i) => i.sensorId));
  const available = allSensors.filter((s) => !installedIds.has(s.id));

  return (
    <main className="container">
      <div className="topbar">
        <span className="topbar-title">
          <Link className="link" href="/">
            Stations
          </Link>{' '}
          /{' '}
          <Link className="link" href="/devices">
            Manage
          </Link>{' '}
          / {device?.name || id}
        </span>
      </div>

      {loading && <p className="muted">Loading device...</p>}
      {error && <div className="alert">{error}</div>}
      {notice && <div className="alert">{notice}</div>}

      {device && (
        <>
          <div className="panel">
            <div className="chart-title">Device</div>
            <form className="form-grid" onSubmit={saveFields}>
              <label className="field" style={{ marginBottom: 0 }}>
                <span className="field-label">Name</span>
                <input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </label>
              <label className="field" style={{ marginBottom: 0 }}>
                <span className="field-label">Location</span>
                <select className="select" value={editForm.locationId} onChange={(e) => setEditForm({ ...editForm, locationId: e.target.value })}>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn" type="submit">
                Save
              </button>
            </form>
            <p className="muted small" style={{ marginTop: 12 }}>
              Last seen: {device.lastSeenAt ? formatWIB(device.lastSeenAt) : '-'}
            </p>
          </div>

          <div className="panel">
            <div className="chart-title">Status lifecycle</div>
            <form className="form-grid" onSubmit={saveStatus}>
              <label className="field" style={{ marginBottom: 0 }}>
                <span className="field-label">Status</span>
                <select className="select" value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ marginBottom: 0 }}>
                <span className="field-label">Reason</span>
                <input className="input" value={statusForm.reason} onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })} />
              </label>
              <button className="btn" type="submit">
                Change status
              </button>
            </form>
            <p className="muted small" style={{ marginTop: 12 }}>
              Allowed: PROVISIONED → ACTIVE, ACTIVE ↔ MAINTENANCE, any → DECOMMISSIONED.
            </p>
          </div>

          <div className="panel">
            <div className="chart-title">Sensors</div>

            <form className="form-grid" onSubmit={install} style={{ marginBottom: 16 }}>
              <label className="field" style={{ marginBottom: 0 }}>
                <span className="field-label">Install sensor</span>
                <select className="select" value={installId} onChange={(e) => setInstallId(e.target.value)}>
                  <option value="">Select sensor</option>
                  {available.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.serialNumber} ({s.typeCode})
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn" type="submit" disabled={!installId}>
                Install
              </button>
            </form>

            {installed.length === 0 && <p className="muted">No sensors installed.</p>}

            {installed.length > 0 && (
              <table className="table">
                <thead>
                  <tr>
                    <th>Serial</th>
                    <th>Type</th>
                    <th>Installed</th>
                    <th>Calibration</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {installed.map((i) => (
                    <tr key={i.id}>
                      <td>{i.sensor.serialNumber}</td>
                      <td>{i.sensor.type.displayName}</td>
                      <td className="muted small">{formatWIB(i.installedAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            className="input"
                            style={{ width: 70 }}
                            placeholder="offset"
                            value={calib[i.sensorId]?.offset ?? ''}
                            onChange={(e) => setCalib({ ...calib, [i.sensorId]: { ...calib[i.sensorId], offset: e.target.value } })}
                          />
                          <input
                            className="input"
                            style={{ width: 70 }}
                            placeholder="scale"
                            value={calib[i.sensorId]?.scale ?? ''}
                            onChange={(e) => setCalib({ ...calib, [i.sensorId]: { ...calib[i.sensorId], scale: e.target.value } })}
                          />
                          <button className="btn btn-secondary btn-sm" onClick={() => addCalibration(i.sensorId)}>
                            Calibrate
                          </button>
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => uninstall(i.sensorId)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </main>
  );
}
