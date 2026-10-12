'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api, getToken, formatWIB } from '../../../lib/api';

const RANGES = {
  '24h': { hours: 24, interval: '1h' },
  '7d': { hours: 168, interval: '1h' },
  '30d': { hours: 720, interval: '1d' },
};

function tickFormat(ts, range) {
  const d = new Date(ts);
  if (range === '24h') {
    return d.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short' });
}

export default function StationClient({ id }) {
  const router = useRouter();

  const [device, setDevice] = useState(null);
  const [latest, setLatest] = useState(null);
  const [range, setRange] = useState('24h');
  const [merged, setMerged] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    Promise.all([api.device(id), api.latest(id)])
      .then(([d, l]) => {
        setDevice(d.data);
        setLatest(l.data);
      })
      .catch((e) => setError(e.message));
  }, [id, router]);

  const loadSeries = useCallback(async () => {
    const cfg = RANGES[range];
    const to = new Date();
    const from = new Date(to.getTime() - cfg.hours * 3600000);

    const q = (sensorType, agg) =>
      api.readings({
        device_id: id,
        sensor_type: sensorType,
        from: from.toISOString(),
        to: to.toISOString(),
        interval: cfg.interval,
        agg,
      });

    setLoading(true);
    try {
      const [temp, humidity, rain, windSpeed, windDir] = await Promise.all([
        q('temp_air', 'avg'),
        q('humidity', 'avg'),
        q('rain_counter', 'sum'),
        q('wind_speed', 'avg'),
        q('wind_dir', 'avg'),
      ]);

      const keys = ['temp', 'humidity', 'rain', 'windSpeed', 'windDir'];
      const lists = [temp, humidity, rain, windSpeed, windDir];
      const map = new Map();
      lists.forEach((list, i) => {
        for (const p of list.data.points) {
          const t = new Date(p.ts).getTime();
          const entry = map.get(t) ?? { ts: t };
          entry[keys[i]] = p.value;
          map.set(t, entry);
        }
      });
      setMerged([...map.values()].sort((a, b) => a.ts - b.ts));
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, range]);

  useEffect(() => {
    if (id) loadSeries();
  }, [id, loadSeries]);

  const online = device?.lastSeenAt
    ? Date.now() - new Date(device.lastSeenAt).getTime() <= 15 * 60000
    : false;

  return (
    <main className="container">
      <div className="topbar">
        <span className="topbar-title">
          <Link className="link" href="/">
            Stations
          </Link>{' '}
          / {device?.name || id}
        </span>
        <div className="topbar-actions">
          <span className={`badge ${online ? 'badge-online' : ''}`}>{online ? 'online' : 'offline'}</span>
        </div>
      </div>

      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 20 }}>{device?.name || id}</h1>
          <p className="muted small">
            {device?.location?.name || 'No location'}
            {device?.lastSeenAt ? ` · updated ${formatWIB(device.lastSeenAt)}` : ''}
          </p>
        </div>
        <div className="segmented">
          {Object.keys(RANGES).map((r) => (
            <button key={r} className={range === r ? 'active' : ''} onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert">Could not load station. {error}</div>}

      {latest && latest.values.length > 0 && (
        <div className="tiles">
          {latest.values.map((v) => (
            <div className="tile" key={v.sensorType}>
              <div className="tile-value">
                {v.value}
                {v.unit ? ` ${v.unit}` : ''}
              </div>
              <div className="tile-label">
                {v.displayName}
                {v.flag !== 'GOOD' ? ` · ${v.flag}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && <p className="muted">Loading charts...</p>}

      {!loading && merged.length === 0 && <p className="muted">No readings in this range.</p>}

      {!loading && merged.length > 0 && (
        <>
          <div className="chart-card">
            <div className="chart-title">Temperature &amp; humidity</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={merged}>
                <CartesianGrid stroke="#eee" vertical={false} />
                <XAxis dataKey="ts" tickFormatter={(t) => tickFormat(t, range)} minTickGap={24} tick={{ fontSize: 12 }} />
                <YAxis yAxisId="temp" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                <YAxis yAxisId="hum" orientation="right" tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip labelFormatter={(t) => formatWIB(t)} />
                <Legend />
                <Line yAxisId="temp" type="monotone" dataKey="temp" name="Temp (°C)" stroke="#111" dot={false} />
                <Line yAxisId="hum" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#999" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-title">Rainfall ({range === '30d' ? 'per day' : 'per hour'}, mm)</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={merged}>
                <CartesianGrid stroke="#eee" vertical={false} />
                <XAxis dataKey="ts" tickFormatter={(t) => tickFormat(t, range)} minTickGap={24} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip labelFormatter={(t) => formatWIB(t)} />
                <Bar dataKey="rain" name="Rain (mm)" fill="#111" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-title">Wind</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={merged}>
                <CartesianGrid stroke="#eee" vertical={false} />
                <XAxis dataKey="ts" tickFormatter={(t) => tickFormat(t, range)} minTickGap={24} tick={{ fontSize: 12 }} />
                <YAxis yAxisId="speed" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="dir" orientation="right" domain={[0, 360]} tick={{ fontSize: 12 }} />
                <Tooltip labelFormatter={(t) => formatWIB(t)} />
                <Legend />
                <Line yAxisId="speed" type="monotone" dataKey="windSpeed" name="Speed (m/s)" stroke="#111" dot={false} />
                <Line yAxisId="dir" type="monotone" dataKey="windDir" name="Direction (°)" stroke="#999" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </main>
  );
}
