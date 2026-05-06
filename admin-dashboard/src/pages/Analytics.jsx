import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getDashboardStats, getWeeklyStats } from '../api.js';

const TT = {
  background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#f1f5f9', fontSize: 12,
};

function Card({ children, title }) {
  return (
    <div style={{
      background: '#111827', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: 24,
    }}>
      {title && (
        <h3 style={{ color: '#f1f5f9', fontWeight: 700, margin: '0 0 20px', fontSize: 15 }}>{title}</h3>
      )}
      {children}
    </div>
  );
}

export default function Analytics() {
  const [stats,   setStats]   = useState(null);
  const [weekly,  setWeekly]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), getWeeklyStats()])
      .then(([s, w]) => {
        setStats(s.stats);
        // Only keep days that have actual data
        setWeekly(w.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ color: '#475569', padding: 60, textAlign: 'center' }}>Loading analytics...</div>
  );

  const total = (stats?.highRisk || 0) + (stats?.mediumRisk || 0) + (stats?.lowRisk || 0);
  const riskData = [
    { name: 'High',   value: stats?.highRisk  || 0, color: '#ef4444' },
    { name: 'Medium', value: stats?.mediumRisk || 0, color: '#f59e0b' },
    { name: 'Low',    value: stats?.lowRisk    || 0, color: '#10b981' },
  ];

  // Only show days with actual data in weekly chart
  const weeklyFiltered = weekly.filter(d => d.spam > 0 || d.ham > 0);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 800, margin: 0 }}>Analytics</h1>
        <p style={{ color: '#475569', fontSize: 14, margin: '6px 0 0' }}>
          Real-time spam detection insights
        </p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Detection Rate',  value: total ? `${Math.round(((stats.highRisk + stats.mediumRisk) / total) * 100)}%` : '0%', color: '#ef4444', desc: 'of numbers flagged' },
          { label: 'Pending Reviews', value: stats?.pendingReviews ?? 0, color: '#f59e0b', desc: 'need admin action' },
          { label: 'Total Reports',   value: stats?.totalReports   ?? 0, color: '#8b5cf6', desc: 'community submitted' },
          { label: 'App Users',       value: stats?.totalUsers     ?? 0, color: '#06b6d4', desc: 'registered users' },
        ].map((k, i) => (
          <div key={i} style={{
            background: '#111827', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: 20, borderTop: `3px solid ${k.color}`,
          }}>
            <div style={{ color: '#475569', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              {k.label}
            </div>
            <div style={{ color: k.color, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{k.value}</div>
            <div style={{ color: '#334155', fontSize: 11, marginTop: 8 }}>{k.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Weekly spam vs ham — real data only */}
        <Card title="Weekly: Spam vs Safe Messages (Real Data)">
          {weeklyFiltered.length === 0 ? (
            <div style={{ color: '#475569', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
              No message data for this week yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weeklyFiltered} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  contentStyle={TT}
                  formatter={(val, name) => [val, name === 'spam' ? '🔴 Spam' : '🟢 Safe']}
                  labelFormatter={label => {
                    const d = weeklyFiltered.find(x => x.day === label);
                    return d ? `${label} (${d.date})` : label;
                  }}
                />
                <Legend
                  formatter={val => val === 'spam' ? '🔴 Spam' : '🟢 Safe'}
                  wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
                />
                <Bar dataKey="spam" fill="#ef4444" radius={[4, 4, 0, 0]} name="spam" />
                <Bar dataKey="ham"  fill="#10b981" radius={[4, 4, 0, 0]} name="ham"  />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Risk pie */}
        <Card title="Risk Distribution">
          {total === 0 ? (
            <div style={{ color: '#475569', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
              No numbers yet.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={riskData} cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    paddingAngle={3} dataKey="value">
                    {riskData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TT} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {riskData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                      <span style={{ color: '#94a3b8' }}>{d.name}</span>
                    </div>
                    <span style={{ color: '#f1f5f9', fontWeight: 700 }}>
                      {d.value} <span style={{ color: '#475569', fontWeight: 400 }}>
                        ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Weekly all 7 days (showing 0 for empty days) */}
      <Card title="All 7 Days — Spam Activity">
        {weekly.length === 0 ? (
          <div style={{ color: '#475569', textAlign: 'center', padding: '40px 0' }}>No data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weekly}>
              <defs>
                <linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TT} />
              <Area type="monotone" dataKey="spam" stroke="#ef4444" strokeWidth={2} fill="url(#sGrad)" name="Spam" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}