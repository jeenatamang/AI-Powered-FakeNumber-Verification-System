import React, { useEffect, useState } from 'react';
import { getSpamNumbers } from '../api.js';

function RiskBadge({ level }) {
  const map = {
    high:   { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', label: 'HIGH' },
    medium: { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', label: 'MEDIUM' },
    low:    { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', label: 'LOW' },
  };
  const cfg = map[level] || { bg: 'rgba(100,116,139,0.15)', color: '#64748b', label: 'UNKNOWN' };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: 6, padding: '3px 10px',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
    }}>{cfg.label}</span>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SpamNumbers() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [risk,    setRisk]    = useState('all');
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [total,   setTotal]   = useState(0);

  const load = () => {
    setLoading(true);
    getSpamNumbers(page, 20)
      .then(res => {
        setData(res.data || []);
        setPages(res.pages || 1);
        setTotal(res.total || 0);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page]);

  const filtered = data.filter(n => {
    const matchS = !search || n.number.includes(search);
    const matchR = risk === 'all' || n.riskLevel === risk;
    return matchS && matchR;
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 800, margin: 0 }}>Spam Numbers</h1>
        <p style={{ color: '#475569', fontSize: 14, margin: '6px 0 0' }}>{total} numbers in database</p>
      </div>

      {/* Filters */}
      <div style={{
        background: '#111827', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14, padding: '14px 18px', marginBottom: 20,
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search phone number..."
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 14px', color: '#f1f5f9',
            fontSize: 13, outline: 'none', flex: 1, maxWidth: 280,
          }}
        />
        <select
          value={risk} onChange={e => setRisk(e.target.value)}
          style={{
            background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 14px', color: '#94a3b8',
            fontSize: 13, outline: 'none', cursor: 'pointer',
          }}>
          <option value="all">All Risk Levels</option>
          <option value="high">🔴 High Risk</option>
          <option value="medium">🟡 Medium Risk</option>
          <option value="low">🟢 Low Risk</option>
        </select>
        <button
          onClick={load}
          style={{
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 8, padding: '8px 16px', color: '#60a5fa',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>↻ Refresh</button>
      </div>

      {/* Table */}
      <div style={{
        background: '#111827', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#475569' }}>Loading...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Phone Number', 'Risk Level', 'Spam Count', 'Report Count', 'First Seen', 'Last Seen'].map((h, i) => (
                    <th key={i} style={{
                      padding: '12px 18px', textAlign: 'left',
                      color: '#475569', fontWeight: 600, fontSize: 11,
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '50px', textAlign: 'center', color: '#475569' }}>
                      No numbers found
                    </td>
                  </tr>
                ) : filtered.map((n, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 18px', color: '#93c5fd', fontFamily: 'monospace', fontWeight: 600 }}>
                      {n.number}
                    </td>
                    <td style={{ padding: '14px 18px' }}><RiskBadge level={n.riskLevel} /></td>
                    <td style={{ padding: '14px 18px', color: '#f87171', fontWeight: 700, fontFamily: 'monospace' }}>
                      {n.spamCount}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#fbbf24', fontFamily: 'monospace' }}>
                      {n.reportCount}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#64748b', fontSize: 12 }}>{fmtDate(n.firstSeen)}</td>
                    <td style={{ padding: '14px 18px', color: '#64748b', fontSize: 12 }}>{fmtDate(n.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 8,
            padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '7px 14px', color: '#94a3b8',
                fontSize: 13, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1,
              }}>← Prev</button>
            <span style={{ color: '#64748b', padding: '7px 14px', fontSize: 13 }}>
              {page} / {pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page >= pages}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '7px 14px', color: '#94a3b8',
                fontSize: 13, cursor: page >= pages ? 'not-allowed' : 'pointer', opacity: page >= pages ? 0.4 : 1,
              }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}