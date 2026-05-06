// admin-dashboard/src/pages/Messages.jsx
import React, { useEffect, useState } from 'react';
import { getAllCachedMessages } from '../api.js';

// ── ADDED waiting_verification to badge map ────────────────────────────────
function LabelBadge({ label }) {
  const map = {
    spam:                 { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', text: 'SPAM' },
    ham:                  { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', text: 'SAFE' },
    uncertain:            { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', text: 'REVIEW' },
    waiting_verification: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6', text: 'PENDING' },
  };
  const cfg = map[label] || map.ham;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: 6, padding: '3px 10px',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
    }}>{cfg.text}</span>
  );
}

// Deep masking
const deepMask = (text) => {
  if (!text) return '';
  return text
    .replace(
      /(otp|pin|password|passcode|verification\s*code|code|account\s*(?:no|number|num)|card\s*(?:no|number|num)|acc(?:ount)?\s*no)\s*(?:is|:|-|=)?\s*([\d\s]{4,})/gi,
      (_, kw, val) => `${kw} ${'*'.repeat(val.replace(/\s/g, '').length)}`
    )
    .replace(/\b(\d{9,20})\b/g, m => '*'.repeat(m.length))
    .replace(/\b(\d{4,8})\b/g, m => '*'.repeat(m.length));
};

const maskNumber = (num) => {
  if (!num) return '•••••••••';
  const s = String(num).replace(/\D/g, '');
  if (s.length <= 4) return '*'.repeat(s.length);
  return s.slice(0, 2) + '*'.repeat(s.length - 4) + s.slice(-2);
};

const fmtDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const truncate = (s, n = 88) => s && s.length > n ? s.slice(0, n) + '…' : s;

export default function Messages() {
  const [data,     setData]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [labelFlt, setLabelFlt] = useState('all');
  const [page,     setPage]     = useState(1);
  const [pages,    setPages]    = useState(1);
  const [expanded, setExpanded] = useState(null);

  // CHANGED: now calls getAllCachedMessages which returns ALL messages
  // sorted by smsDate desc — not just reported spam
  const load = (pg = 1) => {
    setLoading(true);
    setExpanded(null);
    getAllCachedMessages(pg, 200)
      .then(res => {
        setData(res.data || []);
        setPages(res.pages || 1);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page]);

  // CHANGED: filter uses 'label' field (from CachedMessage) not 'aiClassification'
  const filtered = data.filter(m => {
    const l      = m.label || 'ham';
    const matchL =
      labelFlt === 'all'     ? true :
      labelFlt === 'spam'    ? l === 'spam' :
      labelFlt === 'ham'     ? l === 'ham' :
      labelFlt === 'pending' ? (l === 'waiting_verification' || l === 'uncertain') :
      true;
    const matchS = !search || (m.messageContent || '').toLowerCase().includes(search.toLowerCase());
    return matchL && matchS;
  });

  // Stats
  const spamCount    = data.filter(m => m.label === 'spam').length;
  const hamCount     = data.filter(m => m.label === 'ham').length;
  const pendingCount = data.filter(m => m.label === 'waiting_verification' || m.label === 'uncertain').length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 800, margin: 0 }}>Messages</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
          <span style={{ color: '#4a5568', fontSize: 13 }}>{data.length} total messages</span>
          <span style={{ color: '#f87171', fontSize: 13, fontWeight: 600 }}>🔴 {spamCount} spam</span>
          <span style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>✅ {hamCount} safe</span>
          {pendingCount > 0 && (
            <span style={{ color: '#a78bfa', fontSize: 13, fontWeight: 600 }}>⏳ {pendingCount} pending</span>
          )}
          <span style={{ color: '#4a5568', fontSize: 12 }}>· sender hidden for non-spam</span>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        background: '#0d1b2e', border: '1px solid rgba(59,111,232,0.12)',
        borderRadius: 14, padding: '14px 18px', marginBottom: 20,
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setExpanded(null); }}
          placeholder="Search message content..."
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(59,111,232,0.15)',
            borderRadius: 8, padding: '8px 14px', color: '#f1f5f9',
            fontSize: 13, outline: 'none', flex: 1, maxWidth: 340,
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { val: 'all',     label: 'All',     dot: null },
            { val: 'spam',    label: 'Spam',    dot: '#ef4444' },
            { val: 'ham',     label: 'Safe',    dot: '#10b981' },
            { val: 'pending', label: 'Pending', dot: '#8b5cf6' },
          ].map(t => (
            <button key={t.val}
              onClick={() => { setLabelFlt(t.val); setExpanded(null); }}
              style={{
                background: labelFlt === t.val ? 'rgba(59,111,232,0.18)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${labelFlt === t.val ? 'rgba(59,111,232,0.35)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 8, padding: '7px 14px',
                color: labelFlt === t.val ? '#60a5fa' : '#64748b',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              {t.dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.dot, display: 'inline-block' }} />}
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => load(page)} style={{
          background: 'rgba(59,111,232,0.1)', border: '1px solid rgba(59,111,232,0.2)',
          borderRadius: 8, padding: '8px 14px', color: '#60a5fa',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>↻ Refresh</button>
      </div>

      {/* Table */}
      <div style={{
        background: '#0d1b2e', border: '1px solid rgba(59,111,232,0.12)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#4a5568' }}>Loading...</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(59,111,232,0.1)', background: 'rgba(59,111,232,0.05)' }}>
                    {['Label', 'Sender', 'Message Preview', 'Received At', ''].map((h, i) => (
                      <th key={i} style={{
                        padding: '12px 18px', textAlign: 'left',
                        color: '#3b82f6', fontWeight: 600, fontSize: 11,
                        textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '60px', textAlign: 'center', color: '#4a5568' }}>No messages found</td></tr>
                  ) : filtered.map((m, i) => {
                    // CHANGED: use m.label not m.aiClassification
                    const lbl     = m.label || 'ham';
                    const isSpam  = lbl === 'spam';
                    const isPend  = lbl === 'waiting_verification';
                    const isOpen  = expanded === i;
                    return (
                      <React.Fragment key={m._id || i}>
                        <tr
                          style={{
                            borderBottom: isOpen ? 'none' : '1px solid rgba(59,111,232,0.06)',
                            background: isOpen
                              ? 'rgba(59,111,232,0.05)'
                              : isSpam  ? 'rgba(239,68,68,0.02)'
                              : isPend  ? 'rgba(139,92,246,0.02)'
                              : 'transparent',
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(59,111,232,0.04)'; }}
                          onMouseLeave={e => {
                            if (!isOpen) e.currentTarget.style.background =
                              isSpam ? 'rgba(239,68,68,0.02)' :
                              isPend ? 'rgba(139,92,246,0.02)' : 'transparent';
                          }}
                        >
                          <td style={{ padding: '13px 18px' }}><LabelBadge label={lbl} /></td>

                          {/* Sender: full for spam+pending, masked for safe */}
                          <td style={{ padding: '13px 18px', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'nowrap' }}>
                            {(isSpam || isPend) ? (
                              <span style={{ color: isSpam ? '#f87171' : '#a78bfa', fontWeight: 700 }}>
                                {m.phoneNumber || '—'}
                              </span>
                            ) : (
                              <span style={{ color: '#475569', letterSpacing: '1px' }}>
                                {maskNumber(m.phoneNumber)}
                              </span>
                            )}
                          </td>

                          {/* Preview — deep masked */}
                          <td style={{ padding: '13px 18px', maxWidth: 380 }}>
                            <span style={{ color: isSpam ? '#e2e8f0' : isPend ? '#c4b5fd' : '#64748b', lineHeight: 1.5, display: 'block' }}>
                              {truncate(deepMask(m.messageContent))}
                            </span>
                          </td>

                          {/* CHANGED: use smsDate (the original SMS timestamp) */}
                          <td style={{ padding: '13px 18px', color: '#4a5568', fontSize: 12, whiteSpace: 'nowrap' }}>
                            {fmtDateTime(m.smsDate || m.createdAt)}
                          </td>

                          <td style={{ padding: '13px 18px' }}>
                            <button onClick={() => setExpanded(isOpen ? null : i)} style={{
                              background: 'rgba(59,111,232,0.08)', border: '1px solid rgba(59,111,232,0.2)',
                              borderRadius: 7, color: '#60a5fa',
                              cursor: 'pointer', padding: '5px 12px', fontSize: 12, fontWeight: 600,
                            }}>{isOpen ? 'Close ▲' : 'View ▼'}</button>
                          </td>
                        </tr>

                        {/* Expanded */}
                        {isOpen && (
                          <tr style={{ background: 'rgba(59,111,232,0.025)', borderBottom: '1px solid rgba(59,111,232,0.06)' }}>
                            <td colSpan={5} style={{ padding: '16px 20px 22px' }}>
                              <div style={{
                                background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '18px 20px',
                                border: `1px solid ${
                                  isSpam ? 'rgba(239,68,68,0.2)' :
                                  isPend ? 'rgba(139,92,246,0.2)' :
                                  'rgba(16,185,129,0.12)'
                                }`,
                              }}>
                                <div style={{ color: '#3b82f6', fontSize: 11, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Full Message
                                </div>
                                <div style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                  {deepMask(m.messageContent)}
                                </div>
                                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
                                  <span style={{ color: '#4a5568' }}>
                                    📞 Sender:{' '}
                                    <strong style={{ color: (isSpam || isPend) ? '#93c5fd' : '#475569', fontFamily: 'monospace' }}>
                                      {(isSpam || isPend) ? (m.phoneNumber || '—') : maskNumber(m.phoneNumber)}
                                    </strong>
                                  </span>
                                  {isPend && <span style={{ color: '#a78bfa', fontWeight: 600 }}>⏳ Awaiting admin review</span>}
                                  <span style={{ color: '#4a5568', marginLeft: 'auto' }}>{fmtDateTime(m.smsDate || m.createdAt)}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16, borderTop: '1px solid rgba(59,111,232,0.08)' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  style={{ background: 'rgba(59,111,232,0.08)', border: '1px solid rgba(59,111,232,0.2)', borderRadius: 8, padding: '7px 14px', color: '#60a5fa', fontSize: 13, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}>← Prev</button>
                <span style={{ color: '#4a5568', padding: '7px 14px', fontSize: 13 }}>{page} / {pages}</span>
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
                  style={{ background: 'rgba(59,111,232,0.08)', border: '1px solid rgba(59,111,232,0.2)', borderRadius: 8, padding: '7px 14px', color: '#60a5fa', fontSize: 13, cursor: page >= pages ? 'not-allowed' : 'pointer', opacity: page >= pages ? 0.4 : 1 }}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}