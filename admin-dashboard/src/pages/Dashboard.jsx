import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../api.js';

const TOOLTIP_STYLE = {
  background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#f1f5f9', fontSize: 12,
};

function StatCard({ label, value, color, icon, sub }) {
  return (
    <div style={{
      background: '#111827', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: 24, borderTop: `3px solid ${color}`,
      flex: 1, minWidth: 160,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </span>
        <span style={{ fontSize: 18, opacity: 0.8 }}>{icon}</span>
      </div>
      <div style={{ color: '#f1f5f9', fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    getDashboardStats()
      .then(d => setStats(d.stats))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const riskData = stats ? [
    { label: 'High Risk',   value: stats.highRisk,   color: '#ef4444' },
    { label: 'Medium Risk', value: stats.mediumRisk,  color: '#f59e0b' },
    { label: 'Low Risk',    value: stats.lowRisk,     color: '#10b981' },
  ] : [];

  const total = riskData.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 800, margin: 0 }}>Dashboard</h1>
        <p style={{ color: '#475569', fontSize: 14, margin: '6px 0 0' }}>
          Overview of MeroSuraksha spam detection system
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10, padding: '12px 16px', color: '#f87171',
          fontSize: 13, marginBottom: 20,
        }}>⚠ {error}</div>
      )}

      {loading ? (
        <div style={{ color: '#475569', padding: 40, textAlign: 'center' }}>Loading...</div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            <StatCard label="Total Numbers"   value={stats?.totalNumbers}   color="#3b82f6" icon="📞" sub="in database" />
            <StatCard label="High Risk"       value={stats?.highRisk}       color="#ef4444" icon="🔴" sub="confirmed spam" />
            <StatCard label="Pending Reviews" value={stats?.pendingReviews} color="#f59e0b" icon="⏳" sub="need action" />
            <StatCard label="Total Reports"   value={stats?.totalReports}   color="#8b5cf6" icon="📋" sub="user submitted" />
            <StatCard label="Users"           value={stats?.totalUsers}     color="#06b6d4" icon="👤" sub="registered" />
          </div>

          {/* Risk breakdown */}
          <div style={{
            background: '#111827', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: 24,
          }}>
            <h3 style={{ color: '#f1f5f9', fontWeight: 700, margin: '0 0 20px', fontSize: 15 }}>
              Risk Level Breakdown
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {riskData.map((d, i) => {
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#94a3b8', fontSize: 13 }}>{d.label}</span>
                      <span style={{ color: d.color, fontWeight: 700, fontSize: 13 }}>
                        {d.value} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: d.color, borderRadius: 4,
                        transition: 'width 0.5s ease',
                      }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}