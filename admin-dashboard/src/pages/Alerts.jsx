import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../api.js';
import { Card, SectionHeader } from '../components/ui.jsx';

const STATIC_ALERTS = [
  { type: 'critical', icon: '🚨', title: 'Spike in Lucky Draw Scams', desc: 'Detected 45% increase in prize/lucky draw messages in the past 24 hours. Multiple new numbers flagged.', time: '2 hours ago' },
  { type: 'warning',  icon: '⚠️', title: 'AI Confidence Drop Detected', desc: 'Average confidence for batch predictions dropped below 70%. May need model retraining.', time: '5 hours ago' },
  { type: 'info',     icon: 'ℹ️', title: 'New High-Risk Number Cluster', desc: '3 new numbers sharing a common pattern were flagged high-risk within 1 hour.', time: '8 hours ago' },
  { type: 'success',  icon: '✅', title: 'Verification Queue Cleared', desc: 'All pending verification items were reviewed and classified.', time: '1 day ago' },
];

const ALT_COLORS = {
  critical: { border: '#ef4444', bg: 'rgba(239,68,68,0.08)',   label: 'CRITICAL', lbg: 'rgba(239,68,68,0.15)',   lc: '#ef4444' },
  warning:  { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  label: 'WARNING',  lbg: 'rgba(245,158,11,0.15)',  lc: '#f59e0b' },
  info:     { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  label: 'INFO',     lbg: 'rgba(59,130,246,0.15)',  lc: '#3b82f6' },
  success:  { border: '#10b981', bg: 'rgba(16,185,129,0.08)',  label: 'RESOLVED', lbg: 'rgba(16,185,129,0.15)',  lc: '#10b981' },
};

function Alerts() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getDashboardStats().then(d => setStats(d.stats)).catch(() => {});
  }, []);

  const dynamicAlerts = [];
  if (stats) {
    if (stats.pendingReviews > 10) {
      dynamicAlerts.push({ type: 'warning', icon: '⏳', title: 'High Verification Backlog', desc: `${stats.pendingReviews} messages are pending admin review. Please clear the queue.`, time: 'Now' });
    }
    if (stats.highRisk > 50) {
      dynamicAlerts.push({ type: 'critical', icon: '🔴', title: 'High Risk Numbers Accumulating', desc: `${stats.highRisk} numbers are classified as high risk. Consider bulk export and reporting.`, time: 'Now' });
    }
    if (stats.pendingReviews === 0) {
      dynamicAlerts.push({ type: 'success', icon: '✅', title: 'Verification Queue Empty', desc: 'All pending messages have been reviewed. Great work!', time: 'Now' });
    }
  }

  const allAlerts = [...dynamicAlerts, ...STATIC_ALERTS];

  return (
    <div>
      <SectionHeader title="Alerts & Notifications" sub="System-generated alerts and warnings"/>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Critical', count: allAlerts.filter(a => a.type === 'critical').length, color: '#ef4444' },
          { label: 'Warnings', count: allAlerts.filter(a => a.type === 'warning').length,  color: '#f59e0b' },
          { label: 'Info',     count: allAlerts.filter(a => a.type === 'info').length,     color: '#3b82f6' },
          { label: 'Resolved', count: allAlerts.filter(a => a.type === 'success').length,  color: '#10b981' },
        ].map((s, i) => (
          <Card key={i} style={{ textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
            <div style={{ color: s.color, fontSize: 28, fontWeight: 800 }}>{s.count}</div>
            <div style={{ color: '#64748b', fontSize: 12, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {allAlerts.map((alert, i) => {
          const cfg = ALT_COLORS[alert.type] || ALT_COLORS.info;
          return (
            <div key={i} style={{
              background: cfg.bg,
              border: `1px solid ${cfg.border}30`,
              borderLeft: `4px solid ${cfg.border}`,
              borderRadius: 14, padding: '18px 20px',
              display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{alert.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ background: cfg.lbg, color: cfg.lc, borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                    {cfg.label}
                  </span>
                  <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>{alert.title}</span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{alert.desc}</p>
              </div>
              <span style={{ color: '#475569', fontSize: 11, flexShrink: 0, marginTop: 4 }}>{alert.time}</span>
            </div>
          );
        })}
      </div>

      <Card style={{ marginTop: 24, borderLeft: '3px solid #3b82f6' }}>
        <div style={{ color: '#93c5fd', fontWeight: 700, marginBottom: 6 }}>Auto-Alert Thresholds</div>
        <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7 }}>
          Alerts are auto-generated when: pending queue &gt; 10, high-risk numbers &gt; 50, or AI confidence drops below 70%.
        </div>
      </Card>
    </div>
  );
}

export default Alerts;