// src/pages/Export.jsx
// Requires: npm install xlsx
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { getAllCachedMessages } from '../api.js'; // CHANGED: was getReports

// ── Masking helper ─────────────────────────────────────────────────────────
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

const today = () => new Date().toISOString().slice(0, 10);

// ── Excel builder ──────────────────────────────────────────────────────────
function buildExcel(spamRows, hamRows) {
  const wb = XLSX.utils.book_new();

  const allData = [
    ['Label', 'Message Content'],
    ...spamRows.map(m => ['spam', deepMask(m.messageContent || '')]),
    ...hamRows.map(m =>  ['ham',  deepMask(m.messageContent || '')]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(allData);
  ws['!cols'] = [{ wch: 10 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Messages');

  XLSX.writeFile(wb, `merosuraksha_messages_${today()}.xlsx`);
}

// ── Preview table ──────────────────────────────────────────────────────────
const PREVIEW_ROWS = [
  { label: 'spam', content: 'Congratulations! You won NPR ****. Click the link to claim now.' },
  { label: 'spam', content: 'Your OTP is ****. Do not share with anyone. Verify immediately.' },
  { label: 'spam', content: 'Send **** to account no ********** now or your account will be blocked.' },
  { label: 'ham',  content: 'Your transaction of NPR **** was successful. Thank you.' },
  { label: 'ham',  content: 'Hello, please call me back when you are free.' },
];

function PreviewTable() {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '90px' }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            {['Label', 'Message Content'].map(c => (
              <th key={c} style={{
                background: 'rgba(59,111,232,0.12)', color: '#60a5fa', fontWeight: 700,
                padding: '9px 12px', textAlign: 'left',
                borderBottom: '1px solid rgba(59,111,232,0.2)',
                whiteSpace: 'nowrap', fontSize: 11, letterSpacing: '0.3px',
              }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PREVIEW_ROWS.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(59,111,232,0.03)' }}>
              <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'top' }}>
                <span style={{
                  background: r.label === 'spam' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                  color: r.label === 'spam' ? '#f87171' : '#34d399',
                  borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                }}>{r.label}</span>
              </td>
              <td style={{ padding: '8px 12px', color: '#cbd5e1', borderBottom: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.content}</td>
            </tr>
          ))}
          {[0.3, 0.15].map((op, i) => (
            <tr key={`sk-${i}`} style={{ opacity: op }}>
              <td style={{ padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ height: 8, borderRadius: 4, background: '#334155', width: '60%' }} />
              </td>
              <td style={{ padding: '6px 12px' }}>
                <div style={{ height: 8, borderRadius: 4, background: '#334155', width: '75%' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Export page ───────────────────────────────────────────────────────
export default function Export() {
  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState('');
  const [counts,   setCounts]   = useState(null);

  const handleExport = async () => {
    setLoading(true);
    setProgress('');
    try {
      // CHANGED: fetch from getAllCachedMessages (all messages, all labels)
      // instead of getReports (which only returned spam reports)
      setProgress('Fetching messages…');
      const res = await getAllCachedMessages(1, 5000);

      setProgress('Processing…');
      // CHANGED: use m.label (CachedMessage field) not m.aiClassification (Report field)
      const all  = res.data || [];
      const spam = all.filter(m => m.label === 'spam');
      const ham  = all.filter(m => m.label === 'ham');

      setCounts({ spam: spam.length, ham: ham.length });
      setProgress(`Building Excel — ${spam.length} spam + ${ham.length} safe rows…`);
      buildExcel(spam, ham);
      setProgress('');
    } catch (e) {
      alert('Export failed: ' + e.message);
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 800, margin: 0 }}>Export</h1>
        <p style={{ color: '#4a5568', fontSize: 14, margin: '6px 0 0' }}>
          Download all messages as a single Excel workbook — Nepali text is preserved correctly
        </p>
      </div>

      {/* Progress bar */}
      {progress && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 8, padding: '9px 16px', color: '#fbbf24',
          fontSize: 13, marginBottom: 20, maxWidth: 900,
        }}>⏳ {progress}</div>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', maxWidth: 980 }}>

        {/* ── LEFT: Download Options ── */}
        <div style={{
          background: '#0d1b2e',
          border: '1px solid rgba(59,111,232,0.12)',
          borderRadius: 18, padding: 28, width: 320, flexShrink: 0,
        }}>
          <h2 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#3B6FE8' }}>↓</span> Download Options
          </h2>

          {/* What's inside */}
          <div style={{ marginBottom: 22 }}>
            {[
              { color: '#ef4444', label: 'Spam Messages', icon: '🔴', desc: 'Rows labelled "spam"' },
              { color: '#10b981', label: 'Safe Messages',  icon: '✅', desc: 'Rows labelled "ham"' },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '11px 14px', marginBottom: 8,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(59,111,232,0.08)',
                borderLeft: `3px solid ${s.color}`,
                borderRadius: 10,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                <div>
                  <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ color: '#4a5568', fontSize: 11, marginTop: 2 }}>{s.desc}</div>
                </div>
                <span style={{
                  marginLeft: 'auto', flexShrink: 0,
                  background: 'rgba(59,111,232,0.1)', border: '1px solid rgba(59,111,232,0.15)',
                  color: '#60a5fa', borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 700,
                }}>1 SHEET</span>
              </div>
            ))}
          </div>

          {/* Count pills */}
          {counts && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <div style={{
                flex: 1, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 10, padding: '10px 14px', textAlign: 'center',
              }}>
                <div style={{ color: '#f87171', fontSize: 22, fontWeight: 800 }}>{counts.spam}</div>
                <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>Spam rows</div>
              </div>
              <div style={{
                flex: 1, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 10, padding: '10px 14px', textAlign: 'center',
              }}>
                <div style={{ color: '#34d399', fontSize: 22, fontWeight: 800 }}>{counts.ham}</div>
                <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>Safe rows</div>
              </div>
            </div>
          )}

          {/* Download button */}
          <button
            onClick={handleExport}
            disabled={loading}
            style={{
              width: '100%', padding: '14px 20px',
              background: loading
                ? 'rgba(255,255,255,0.05)'
                : 'linear-gradient(135deg, #1d6f42, #1a9651)',
              border: 'none', borderRadius: 12,
              color: loading ? '#4a5568' : '#fff',
              fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: loading ? 'none' : '0 4px 16px rgba(26,150,81,0.35)',
              transition: 'all 0.15s',
              marginBottom: 14,
            }}>
            <span style={{ fontSize: 18 }}>📊</span>
            {loading ? 'Preparing…' : 'Download Excel Report'}
          </button>

          {/* Encoding note */}
          <div style={{
            background: 'rgba(59,111,232,0.05)', border: '1px solid rgba(59,111,232,0.12)',
            borderRadius: 10, padding: '10px 14px',
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>ℹ</span>
            <span style={{ color: '#4a6080', fontSize: 11, lineHeight: 1.6 }}>
              Unicode BOM ensures Nepali (Devanagari) text displays correctly in Excel without any extra steps.
            </span>
          </div>
        </div>

        {/* ── RIGHT: Preview ── */}
        <div style={{
          flex: 1,
          background: '#0d1b2e',
          border: '1px solid rgba(59,111,232,0.12)',
          borderRadius: 18, padding: 28, minWidth: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#3B6FE8' }}>◉</span> Sheet Preview
              <span style={{ background: 'rgba(59,111,232,0.1)', border: '1px solid rgba(59,111,232,0.15)', color: '#60a5fa', borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 700, marginLeft: 8 }}>1 SHEET</span>
            </h2>
          </div>

          {/* File name mockup */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: 8,
            padding: '7px 14px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <span style={{ fontSize: 16 }}>📗</span>
            <span style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>
              merosuraksha_messages_{today()}.xlsx
            </span>
            <span style={{
              marginLeft: 'auto', background: 'rgba(26,150,81,0.1)',
              border: '1px solid rgba(26,150,81,0.2)', color: '#4ade80',
              borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700,
            }}>EXCEL</span>
          </div>

          <PreviewTable />

          <div style={{
            marginTop: 18, paddingTop: 14,
            borderTop: '1px solid rgba(59,111,232,0.08)',
            color: '#334155', fontSize: 11, lineHeight: 1.6,
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <span style={{ color: '#3B6FE8', flexShrink: 0 }}>★</span>
            Preview shows sample data. Actual export contains all messages with OTPs, PINs,
            account numbers, and card numbers replaced with asterisks.
          </div>
        </div>
      </div>

      {/* Privacy note */}
      <div style={{
        background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)',
        borderRadius: 14, padding: 20, marginTop: 24,
        borderLeft: '4px solid #10b981', maxWidth: 980,
      }}>
        <div style={{ color: '#34d399', fontWeight: 700, marginBottom: 8, fontSize: 14 }}>🔒 Privacy Note</div>
        <div style={{ color: '#4a5568', fontSize: 13, lineHeight: 1.7 }}>
          Both sheets contain only <strong style={{ color: '#64748b' }}>Label</strong> and <strong style={{ color: '#64748b' }}>Message Content</strong> — no sender numbers or timestamps are included.
          OTPs, PINs, account numbers, and card numbers inside message content are replaced with asterisks in both sheets.
          Handle all exported data securely and in line with applicable privacy regulations.
        </div>
      </div>
    </div>
  );
}