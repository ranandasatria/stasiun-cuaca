'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setToken } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.register(username, password);
      const res = await api.login(username, password);
      setToken(res.data.token);
      router.push('/');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <main className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Register a dashboard user.</p>

        {error && <div className="alert">{error}</div>}

        <form onSubmit={onSubmit}>
          <label className="field">
            <span className="field-label">Username</span>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button className="btn btn-block" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-foot">
          Already have an account?{' '}
          <Link className="link" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
