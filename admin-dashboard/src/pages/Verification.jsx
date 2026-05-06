// src/pages/Verification.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { getPendingMessages, reviewMessage } from '../api.js';

const fmtDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// Deep masking identical to Messages page
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

function VerificationCard({ msg, onReview }) {
  const [decision,   setDecision]   = useState(null);   // 'spam' | 'ham'
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [verdict,    setVerdict]    = useState(null);    // what was decided

  const handleSubmit = async () => {
    if (!decision || submitting) return;
    setSubmitting(true);
    try {
      await onReview(msg._id, decision);
      setVerdict(decision);
      // Brief flash then remove card from list
      setTimeout(() => setDone(true), 900);
    } catch (e) {
      alert('Failed to submit: ' + e.message);
      setSubmitting(false);
    }
  };

  // Transitioning out — show brief success flash
  if (verdict && !done) {
    return (
      <div style={{
        background: verdict === 'spam' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
        border: `1px solid ${verdict === 'spam' ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
        borderRadius: 16, padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'all 0.3s',
      }}>
        <span style={{ fontSize: 26 }}>{verdict === 'spam' ? '🔴' : '✅'}</span>
        <div>
          <div style={{ color: verdict === 'spam' ? '#f87171' : '#34d399', fontWeight: 700, fontSize: 15 }}>
            Marked as {verdict === 'spam' ? 'SPAM' : 'SAFE'}
          </div>
          <div style={{ color: '#4a5568', fontSize: 12, marginTop: 3 }}>Removing from queue…</div>
        </div>
      </div>
    );
  }

  // Already removed — render nothing (parent filters these out)
  if (done) return null;

  const confidencePct = msg.aiConfidence != null ? Math.round(msg.aiConfidence * 100) : null;

  return (
    <div style={{
      background: '#0d1b2e', border: '1px solid rgba(59,111,232,0.15)',
      borderRadius: 16, overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{
        padding: '13px 20px',
        background: 'rgba(59,111,232,0.05)',
        borderBottom: '1px solid rgba(59,111,232,0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15 }}>⏳</span>
          <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 700, letterSpacing: '0.6px' }}>
            PENDING VERIFICATION
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {confidencePct !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ color: '#4a5568', fontSize: 11 }}>AI confidence</span>
              <div style={{ width: 80, height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
                <div style={{
                  width: `${confidencePct}%`, height: '100%', borderRadius: 3,
                  background: confidencePct > 75 ? '#ef4444' : '#f59e0b',
                }} />
              </div>
              <span style={{
                color: confidencePct > 75 ? '#f87171' : '#fbbf24',
                fontWeight: 700, fontSize: 11,
              }}>{confidencePct}%</span>
            </div>
          )}
          <span style={{ color: '#4a5568', fontSize: 11 }}>{fmtDateTime(msg.createdAt)}</span>
        </div>
      </div>

      <div style={{ padding: '20px 22px' }}>
        {/* Message body */}
        <div style={{ color: '#3b82f6', fontSize: 10, fontWeight: 700, marginBottom: 9, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Message Content
        </div>
        <div style={{
          background: 'rgba(0,0,0,0.28)', borderRadius: 10,
          padding: '14px 16px', marginBottom: 20,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <p style={{
            color: '#e2e8f0', fontSize: 14, lineHeight: 1.72,
            margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {deepMask(msg.messageContent)}
          </p>
        </div>

        {/* Decision radio group */}
        <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Your Decision
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { val: 'spam', icon: '🔴', label: 'Scam',     sub: 'Spam count +1', borderClr: 'rgba(239,68,68,0.4)',  bgClr: 'rgba(239,68,68,0.1)',  textClr: '#f87171', accent: '#ef4444' },
            { val: 'ham',  icon: '✅', label: 'Not Scam', sub: 'Mark as safe',   borderClr: 'rgba(16,185,129,0.35)', bgClr: 'rgba(16,185,129,0.08)', textClr: '#34d399', accent: '#10b981' },
          ].map(opt => (
            <label key={opt.val} style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 12,
              background: decision === opt.val ? opt.bgClr : 'rgba(255,255,255,0.03)',
              border: `1.5px solid ${decision === opt.val ? opt.borderClr : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 12, padding: '13px 16px',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              <input
                type="radio"
                name={`dec-${msg._id}`}
                value={opt.val}
                checked={decision === opt.val}
                onChange={() => setDecision(opt.val)}
                style={{ accentColor: opt.accent, width: 17, height: 17, flexShrink: 0 }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{opt.icon}</span>
                  <span style={{
                    color: decision === opt.val ? opt.textClr : '#94a3b8',
                    fontWeight: 700, fontSize: 13,
                  }}>{opt.label}</span>
                </div>
                <div style={{ color: '#4a5568', fontSize: 11, marginTop: 2 }}>{opt.sub}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleSubmit}
          disabled={!decision || submitting}
          style={{
            width: '100%', padding: '13px',
            background: !decision
              ? 'rgba(255,255,255,0.05)'
              : decision === 'spam'
                ? 'linear-gradient(135deg,#ef4444,#b91c1c)'
                : 'linear-gradient(135deg,#10b981,#059669)',
            border: 'none', borderRadius: 10, color: '#fff',
            fontSize: 14, fontWeight: 700,
            cursor: (!decision || submitting) ? 'not-allowed' : 'pointer',
            opacity: (!decision || submitting) ? 0.5 : 1,
            transition: 'all 0.15s',
            letterSpacing: '0.2px',
          }}
        >
          {submitting
            ? '⏳ Submitting…'
            : decision
              ? `Confirm — ${decision === 'spam' ? '🔴 Mark as Scam' : '✅ Mark as Safe'}`
              : 'Select a decision above'}
        </button>
      </div>
    </div>
  );
}

export default function Verification() {
  const [pending,  setPending]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  // Track which IDs have been reviewed so we can hide them
  const [reviewed, setReviewed] = useState(new Set());

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    setReviewed(new Set());
    getPendingMessages()
      .then(res => setPending(res.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReview = useCallback(async (id, decision) => {
    await reviewMessage(id, decision);
    // After the card's own animation delay, mark it as reviewed
    setTimeout(() => {
      setReviewed(prev => new Set([...prev, id]));
    }, 950);
  }, []);

  // Visible cards = pending minus already-reviewed ones
  const visible = pending.filter(m => !reviewed.has(m._id));
  const doneCount = reviewed.size;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 800, margin: 0 }}>Verification Queue</h1>
          <p style={{ color: '#4a5568', fontSize: 14, margin: '6px 0 0' }}>
            Messages flagged by AI as uncertain — review each one
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {visible.length > 0 && (
            <div style={{
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 20, padding: '6px 16px',
              color: '#fbbf24', fontSize: 13, fontWeight: 700,
            }}>
              {visible.length} pending
            </div>
          )}
          {doneCount > 0 && (
            <div style={{
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 20, padding: '6px 16px',
              color: '#34d399', fontSize: 13, fontWeight: 600,
            }}>
              ✓ {doneCount} reviewed
            </div>
          )}
          <button onClick={load} style={{
            background: 'rgba(59,111,232,0.1)', border: '1px solid rgba(59,111,232,0.2)',
            borderRadius: 10, padding: '8px 16px', color: '#60a5fa',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>↻ Refresh</button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10, padding: '12px 16px', color: '#f87171',
          fontSize: 13, marginBottom: 20,
        }}>⚠ {error}</div>
      )}

      {loading ? (
        <div style={{ color: '#4a5568', padding: 60, textAlign: 'center' }}>Loading...</div>
      ) : visible.length === 0 ? (
        <div style={{
          background: '#0d1b2e', border: '1px solid rgba(59,111,232,0.12)',
          borderRadius: 16, padding: 70, textAlign: 'center',
        }}>
          <div style={{ fontSize: 52, marginBottom: 18 }}>✅</div>
          <div style={{ color: '#34d399', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>All caught up!</div>
          <div style={{ color: '#4a5568', fontSize: 14 }}>
            {doneCount > 0
              ? `You reviewed ${doneCount} message${doneCount > 1 ? 's' : ''} this session. Nothing left to verify.`
              : 'No messages waiting for verification.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {pending.map(msg => (
            !reviewed.has(msg._id) && (
              <VerificationCard
                key={msg._id}
                msg={msg}
                onReview={handleReview}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}