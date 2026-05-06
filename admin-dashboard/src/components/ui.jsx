// src/components/ui.jsx — reusable UI primitives

import React from 'react';

// ── Card ───────────────────────────────────────────────────────────────────
export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: 24,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = '#3b82f6', icon }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: 24,
      borderTop: `3px solid ${color}`,
      flex: 1, minWidth: 160,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        {icon && <span style={{ color, opacity: 0.7 }}>{icon}</span>}
      </div>
      <div style={{ color: '#f1f5f9', fontSize: 32, fontWeight: 800, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

// ── Risk Badge ─────────────────────────────────────────────────────────────
export function RiskBadge({ level }) {
  const map = {
    high:    { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', label: 'HIGH' },
    medium:  { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', label: 'MEDIUM' },
    low:     { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', label: 'LOW' },
    unknown: { bg: 'rgba(100,116,139,0.15)', color: '#64748b', label: 'UNKNOWN' },
  };
  const cfg = map[level] || map.unknown;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: 6, padding: '3px 10px',
      fontSize: 11, fontWeight: 700,
      fontFamily: "'DM Mono', monospace",
      letterSpacing: '0.5px',
    }}>{cfg.label}</span>
  );
}

// ── Label Badge (Spam / Ham) ───────────────────────────────────────────────
export function LabelBadge({ label }) {
  const isSpam = label === 'spam';
  const isUncertain = label === 'uncertain';
  const cfg = isSpam
    ? { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444',  text: 'SPAM' }
    : isUncertain
    ? { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b',  text: 'REVIEW' }
    : { bg: 'rgba(16,185,129,0.15)', color: '#10b981', text: 'HAM' };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: 6, padding: '3px 10px',
      fontSize: 11, fontWeight: 700,
      fontFamily: "'DM Mono', monospace",
    }}>{cfg.text}</span>
  );
}

// ── Table ──────────────────────────────────────────────────────────────────
export function Table({ headers, rows, emptyMsg = 'No data found.' }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
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
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} style={{
                padding: '40px 16px', textAlign: 'center',
                color: '#475569', fontSize: 14,
              }}>{emptyMsg}</td>
            </tr>
          ) : rows.map((row, i) => (
            <tr key={i} style={{
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              transition: 'background 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '12px 16px', color: '#cbd5e1', verticalAlign: 'middle' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Search Input ───────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
      <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
        width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
          padding: '9px 12px 9px 36px', color: '#f1f5f9', fontSize: 13,
          outline: 'none', fontFamily: "'DM Sans', sans-serif",
        }}
      />
    </div>
  );
}

// ── Select ─────────────────────────────────────────────────────────────────
export function Select({ value, onChange, options, style = {} }) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
        padding: '9px 32px 9px 12px', color: '#94a3b8', fontSize: 13,
        outline: 'none', cursor: 'pointer', appearance: 'none',
        fontFamily: "'DM Sans', sans-serif", ...style,
      }}>
      {options.map(o => (
        <option key={o.value} value={o.value} style={{ background: '#1e293b' }}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Button ─────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled = false, style = {} }) {
  const variants = {
    primary:   { bg: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none' },
    danger:    { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', border: 'none' },
    success:   { bg: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none' },
    ghost:     { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' },
    warning:   { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' },
  };
  const sizes = {
    sm: { padding: '6px 14px', fontSize: 12 },
    md: { padding: '9px 18px', fontSize: 13 },
    lg: { padding: '13px 24px', fontSize: 15 },
  };
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        background: v.bg, color: v.color, border: v.border,
        borderRadius: 10, ...s, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, fontFamily: "'DM Sans', sans-serif",
        display: 'inline-flex', alignItems: 'center', gap: 6,
        transition: 'opacity 0.15s', ...style,
      }}>
      {children}
    </button>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────
export function SectionHeader({ title, sub, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700, margin: 0 }}>{title}</h2>
        {sub && <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>{sub}</p>}
      </div>
      {children && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{children}</div>}
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{
        width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)',
        borderTop: '3px solid #3b82f6', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────
export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
      <Btn variant="ghost" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1}>← Prev</Btn>
      <span style={{ color: '#64748b', padding: '6px 12px', fontSize: 13 }}>Page {page} / {pages}</span>
      <Btn variant="ghost" size="sm" onClick={() => onChange(page + 1)} disabled={page >= pages}>Next →</Btn>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────
export function Empty({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 13 }}>{sub}</div>}
    </div>
  );
}

// ── Confirm Modal ──────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#141b26', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, padding: 32, maxWidth: 480, width: '90%',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: '#f1f5f9', fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Format date ────────────────────────────────────────────────────────────
export function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}