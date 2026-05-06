import React, { useEffect, useState } from 'react';
import { getAuditLogs } from '../api.js';
import { Card, SectionHeader, Spinner, Pagination, fmtDateTime } from '../components/ui.jsx';

// Static demo logs (real logs come from API once backend audit log endpoint is added)
const DEMO_LOGS = [
  { action: 'REVIEW_SPAM',    target: '+977-9841234567', admin: 'admin@test.com', detail: 'Marked as SPAM',   at: new Date(Date.now() - 3600000).toISOString() },
  { action: 'REVIEW_HAM',     target: 'Msg #4521',       admin: 'admin@test.com', detail: 'Marked as HAM',    at: new Date(Date.now() - 7200000).toISOString() },
  { action: 'DELETE_NUMBER',  target: '+977-9851122334', admin: 'admin@test.com', detail: 'Deleted number',   at: new Date(Date.now() - 86400000).toISOString() },
  { action: 'LOGIN',          target: '—',               admin: 'admin@test.com', detail: 'Admin login',      at: new Date(Date.now() - 90000000).toISOString() },
  { action: 'REVIEW_SPAM',    target: '+977-9800001111', admin: 'admin@test.com', detail: 'Marked as SPAM',   at: new Date(Date.now() - 172800000).toISOString() },
];

const ACTION_COLORS = {
  REVIEW_SPAM:   { bg: 'rgba(239,68,68,0.12)',   color: '#f87171' },
  REVIEW_HAM:    { bg: 'rgba(16,185,129,0.12)',  color: '#34d399' },
  DELETE_NUMBER: { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24' },
  LOGIN:         { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa' },
  DEFAULT:       { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8' },
};

export default function AuditLogs() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);

  useEffect(() => {
    setLoading(true);
    getAuditLogs(page)
      .then(res => {
        setLogs(res.data || []);
        setPages(res.pages || 1);
      })
      .catch(() => {
        // Fallback to demo data
        setLogs(DEMO_LOGS);
        setPages(1);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const getActionCfg = (action) => ACTION_COLORS[action] || ACTION_COLORS.DEFAULT;

  return (
    <div>
      <SectionHeader title="Audit Logs" sub="Record of all admin actions and system events"/>

      {/* Info banner */}
      <Card style={{ marginBottom: 20, borderLeft: '3px solid #3b82f6' }}>
        <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
          📋 All admin actions are automatically recorded here — verification decisions, number deletions, logins, and setting changes.
          Each entry includes the admin's identity and timestamp for accountability.
        </div>
      </Card>

      <Card>
        {loading ? <Spinner /> : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Action', 'Target', 'Detail', 'Admin', 'Timestamp'].map((h, i) => (
                      <th key={i} style={{
                        padding: '10px 16px', textAlign: 'left',
                        color: '#64748b', fontWeight: 600, fontSize: 11,
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
                        No audit logs yet. Actions taken in this session will appear here.
                      </td>
                    </tr>
                  ) : logs.map((log, i) => {
                    const cfg = getActionCfg(log.action);
                    return (
                      <tr key={i}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            background: cfg.bg, color: cfg.color,
                            borderRadius: 6, padding: '3px 10px',
                            fontSize: 11, fontWeight: 700,
                            fontFamily: "'DM Mono'",
                          }}>{log.action}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#93c5fd', fontFamily: "'DM Mono'", fontSize: 12 }}>
                          {log.target || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13 }}>
                          {log.detail || log.description || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>
                          {log.admin || log.adminEmail || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569', fontSize: 12, fontFamily: "'DM Mono'" }}>
                          {fmtDateTime(log.at || log.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pages={pages} onChange={setPage}/>
          </>
        )}
      </Card>
    </div>
  );
}