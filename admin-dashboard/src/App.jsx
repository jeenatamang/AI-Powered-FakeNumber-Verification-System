// src/App.jsx
import React, { useState } from 'react';
import { getToken, setToken, login as apiLogin } from './api.js';
import Dashboard    from './pages/Dashboard.jsx';
import SpamNumbers  from './pages/SpamNumbers.jsx';
import Messages     from './pages/Messages.jsx';
import Analytics    from './pages/Analytics.jsx';
import Verification from './pages/Verification.jsx';
import Export       from './pages/Export.jsx';

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',    icon: '▦' },
  { id: 'spam',         label: 'Spam Numbers', icon: '⚠' },
  { id: 'messages',     label: 'Messages',     icon: '✉' },
  { id: 'analytics',   label: 'Analytics',    icon: '◉' },
  { id: 'verification', label: 'Verification', icon: '✓', dot: true },
  { id: 'export',       label: 'Export',       icon: '↓' },
];

export default function App() {
  const [authed,  setAuthed]  = useState(!!getToken());
  const [page,    setPage]    = useState('dashboard');
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [err,     setErr]     = useState('');
  const [logging, setLogging] = useState(false);

  const renderPage = () => {
    switch (page) {
      case 'dashboard':    return <Dashboard />;
      case 'spam':         return <SpamNumbers />;
      case 'messages':     return <Messages />;
      case 'analytics':    return <Analytics />;
      case 'verification': return <Verification />;
      case 'export':       return <Export />;
      default:             return <Dashboard />;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLogging(true); setErr('');
    try {
      const res = await apiLogin(email, pass);
      if (res.user?.role !== 'admin') throw new Error('Admin access only.');
      setToken(res.token);
      setAuthed(true);
    } catch (e) { setErr(e.message); }
    finally { setLogging(false); }
  };

  const handleLogout = () => { setToken(''); setAuthed(false); };

  // ── Login ───────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg,#0F1724 0%,#0a1020 50%,#0F1724 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Inter',-apple-system,sans-serif",
      }}>
        <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse,rgba(59,111,232,0.12) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{
          background: '#0d1b2e', border: '1px solid rgba(59,111,232,0.2)',
          borderRadius: 24, padding: 44, width: 400,
          position: 'relative', zIndex: 1,
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 18,
              background: 'linear-gradient(135deg,#3B6FE8,#1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px', fontSize: 28,
              boxShadow: '0 8px 24px rgba(59,111,232,0.35)',
            }}>🛡</div>
            <h1 style={{ color: '#f0f4ff', fontSize: 22, fontWeight: 800, margin: 0 }}>MeroSuraksha</h1>
            <p style={{ color: '#4a5568', fontSize: 13, margin: '6px 0 0', fontWeight: 500 }}>Admin Dashboard</p>
          </div>
          {err && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>{err}</div>}
          <form onSubmit={handleLogin}>
            {[
              { id: 'email', label: 'EMAIL', type: 'email', val: email, set: setEmail, ph: 'admin@example.com' },
              { id: 'pass',  label: 'PASSWORD', type: 'password', val: pass, set: setPass, ph: '••••••••' },
            ].map(f => (
              <div key={f.id} style={{ marginBottom: f.id === 'pass' ? 28 : 16 }}>
                <label style={{ color: '#3b82f6', fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 7, letterSpacing: '0.5px' }}>{f.label}</label>
                <input
                  type={f.type} value={f.val} onChange={e => f.set(e.target.value)}
                  placeholder={f.ph} required
                  style={{
                    width: '100%', background: 'rgba(59,111,232,0.06)',
                    border: '1px solid rgba(59,111,232,0.18)', borderRadius: 12,
                    padding: '12px 16px', color: '#f0f4ff', fontSize: 14,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(59,111,232,0.45)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(59,111,232,0.18)'}
                />
              </div>
            ))}
            <button type="submit" disabled={logging} style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg,#3B6FE8,#1d4ed8)',
              border: 'none', borderRadius: 12, color: '#fff',
              fontSize: 15, fontWeight: 700,
              cursor: logging ? 'not-allowed' : 'pointer', opacity: logging ? 0.7 : 1,
              boxShadow: logging ? 'none' : '0 6px 20px rgba(59,111,232,0.4)',
            }}>{logging ? 'Signing in…' : 'Sign In'}</button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main layout ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0F1724', fontFamily: "'Inter',-apple-system,sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: 228, background: '#0d1b2e',
        borderRight: '1px solid rgba(59,111,232,0.1)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg,#3B6FE8,#1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, boxShadow: '0 4px 12px rgba(59,111,232,0.35)',
            }}>🛡</div>
            <div>
              <div style={{ color: '#f0f4ff', fontWeight: 800, fontSize: 14 }}>MeroSuraksha</div>
              <div style={{ color: '#3b5280', fontSize: 11, fontWeight: 500 }}>Admin Panel</div>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(59,111,232,0.08)', margin: '0 16px 8px' }} />

        {/* Nav */}
        <nav style={{ flex: 1, padding: '4px 12px', overflowY: 'auto' }}>
          {NAV.map(n => {
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => setPage(n.id)} style={{
                width: '100%', textAlign: 'left',
                background: active ? 'linear-gradient(135deg,rgba(59,111,232,0.2),rgba(59,111,232,0.1))' : 'transparent',
                border: `1px solid ${active ? 'rgba(59,111,232,0.3)' : 'transparent'}`,
                borderRadius: 12, padding: '10px 14px',
                color: active ? '#60a5fa' : '#4a6080',
                fontSize: 13, fontWeight: active ? 700 : 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: 10, marginBottom: 3,
                boxShadow: active ? '0 2px 8px rgba(59,111,232,0.15)' : 'none',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(59,111,232,0.06)'; e.currentTarget.style.color = '#7cb5f7'; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4a6080'; }}}
              >
                <span style={{ fontSize: 16, opacity: active ? 1 : 0.55, color: active ? '#3B6FE8' : 'inherit' }}>{n.icon}</span>
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.dot && !active && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(59,111,232,0.08)' }}>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '10px 14px',
            background: 'rgba(239,68,68,0.07)',
            border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: 10, color: '#f87171',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}
          >⏻ Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 228, flex: 1, padding: 28, background: '#0F1724', minHeight: '100vh' }}>
        {renderPage()}
      </main>
    </div>
  );
}