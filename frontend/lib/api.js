const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const API_ROOT = API_URL.replace(/\/api\/v1\/?$/, '');

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token');
}

export function setToken(token) {
  window.localStorage.setItem('token', token);
}

export function clearToken() {
  window.localStorage.removeItem('token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }

  return data;
}

export const api = {
  health: () => fetch(`${API_ROOT}/healthz`).then((r) => r.json()),

  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: { username, password }, auth: false }),

  register: (username, password) =>
    request('/auth/register', { method: 'POST', body: { username, password }, auth: false }),

  overview: () => request('/dashboard/overview'),
  devices: (params = {}) => request(`/devices?${new URLSearchParams(params)}`),
  device: (id) => request(`/devices/${id}`),
  deviceHealth: (id) => request(`/devices/${id}/health`),
  createDevice: (body) => request('/devices', { method: 'POST', body }),
  updateDevice: (id, body) => request(`/devices/${id}`, { method: 'PATCH', body }),
  deleteDevice: (id) => request(`/devices/${id}`, { method: 'DELETE' }),
  rotateCredential: (id) => request(`/devices/${id}/credentials/rotate`, { method: 'POST' }),

  locations: (params = {}) => request(`/locations?${new URLSearchParams(params)}`),
  createLocation: (body) => request('/locations', { method: 'POST', body }),

  sensorTypes: () => request('/sensor-types'),
  sensors: () => request('/sensors'),
  createSensor: (body) => request('/sensors', { method: 'POST', body }),
  deviceSensors: (deviceId) => request(`/devices/${deviceId}/sensors`),
  installSensor: (deviceId, body) => request(`/devices/${deviceId}/sensors`, { method: 'POST', body }),
  uninstallSensor: (deviceId, sensorId) =>
    request(`/devices/${deviceId}/sensors/${sensorId}`, { method: 'DELETE' }),
  calibrations: (sensorId) => request(`/sensors/${sensorId}/calibrations`),
  addCalibration: (sensorId, body) =>
    request(`/sensors/${sensorId}/calibrations`, { method: 'POST', body }),

  latest: (deviceId) => request(`/devices/${deviceId}/readings/latest`),
  readings: (params) => request(`/readings?${new URLSearchParams(params)}`),
  summary: (params) => request(`/readings/summary?${new URLSearchParams(params)}`),
};

export function formatWIB(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
