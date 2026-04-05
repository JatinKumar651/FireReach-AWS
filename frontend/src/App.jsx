import React, { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://firereach-1-9rf9.onrender.com';

// ── Icons ────────────────────────────────────────────────────
const IconZap = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);

const IconTerminal = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const IconMail = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="2,4 12,14 22,4" />
  </svg>
);

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconExternalLink = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const IconSend = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ── Log type detector ────────────────────────────────────────
function getLogType(log) {
  const text = (log.log || log || '').toString().toLowerCase();
  if (log.type === 'error' || text.includes('error') || text.includes('fail')) return 'error';
  if (log.type === 'success' || text.includes('success') || text.includes('sent') || text.includes('complete')) return 'success';
  if (text.includes('tool') || text.includes('harvesting') || text.includes('searching')) return 'tool';
  if (text.includes('agent') || text.includes('ai') || text.includes('analyzing') || text.includes('generating')) return 'agent';
  return 'info';
}

// ── Prefix for log entries ───────────────────────────────────
function getLogPrefix(type) {
  const prefixes = { tool: '⚙', agent: '🤖', success: '✓', error: '✗', info: '›' };
  return prefixes[type] || '›';
}

// ── StatusBadge component ────────────────────────────────────
function StatusBadge({ active, activeLabel = 'Active', inactiveLabel = 'Mocked' }) {
  return active ? (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#22c55e' }}>
      <span className="status-dot active" />
      {activeLabel}
    </span>
  ) : (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#f59e0b' }}>
      <span className="status-dot warning" />
      {inactiveLabel}
    </span>
  );
}

// ── Main App ─────────────────────────────────────────────────
function App() {
  const [companyName, setCompanyName] = useState();
  const [icp, setIcp] = useState();
  const [recipient, setRecipient] = useState();
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [emailPreview, setEmailPreview] = useState(null);
  const [signals, setSignals] = useState([]);
  const [apiStatus, setApiStatus] = useState({ groq: false, tavily: false, gmail: false });

  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/status`)
      .then(res => res.json())
      .then(data => setApiStatus(data))
      .catch(err => console.error('Could not fetch API status', err));
  }, []);

  const handleRun = useCallback(async () => {
    if (!companyName.trim() || !icp.trim() || !recipient.trim()) return;

    setLogs([]);
    setEmailPreview(null);
    setSignals([]);
    setIsRunning(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/run-outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: companyName, icp, recipient }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();

        for (const part of parts) {
          if (part.startsWith('data: ')) {
            const jsonStr = part.substring(6).trim();
            if (jsonStr) {
              try {
                const data = JSON.parse(jsonStr);
                setLogs(prev => [...prev, data]);
                if (data.signals) setSignals(data.signals);
                if (data.result?.subject) setEmailPreview(data.result);
              } catch (err) {
                console.error('Failed to parse SSE data:', err, jsonStr);
              }
            }
          }
        }
      }
    } catch (error) {
      setLogs(prev => [...prev, { log: `Connection error: ${error.message}`, type: 'error' }]);
    }

    setIsRunning(false);
  }, [companyName, icp, recipient]);

  return (
    <div
      className="noise-bg"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'linear-gradient(135deg, #070a12 0%, #0a0d18 40%, #0c101c 100%)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Background glow orbs */}
      <div style={{
        position: 'fixed', top: '-10%', left: '-5%', width: '500px', height: '500px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', bottom: '-15%', right: '10%', width: '600px', height: '600px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── Top Navbar ─────────────────────────────────────── */}
      <header style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', height: '56px', flexShrink: 0,
        background: 'rgba(10, 13, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #f97316, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(249,115,22,0.4)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              <path d="M13 2C6.93 2 2 6.93 2 13c0 4.03 2.26 7.55 5.6 9.41L13 2z" fill="rgba(255,255,255,0.3)" />
            </svg>
          </div>
          <div>
            <span className="brand-gradient-text" style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              FireReach
            </span>
          </div>
          <div style={{
            padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'rgba(249,115,22,0.1)', color: '#f97316',
            border: '1px solid rgba(249,115,22,0.2)',
          }}>
            v2.0
          </div>
        </div>

        {/* Nav center - API status pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { key: 'groq', label: 'Groq AI', active: apiStatus.groq },
            { key: 'tavily', label: 'Analyst', active: apiStatus.tavily },
            { key: 'gmail', label: 'Gmail', active: apiStatus.gmail },
          ].map(({ key, label, active }) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', borderRadius: '20px',
              background: active ? 'rgba(34,197,94,0.08)' : 'rgba(30,36,52,0.7)',
              border: active ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.06)',
              fontSize: '11px', fontWeight: 600,
              color: active ? '#22c55e' : '#64748b',
            }}>
              <span className={`status-dot ${active ? 'active' : 'warning'}`} style={{ width: '6px', height: '6px' }} />
              {label}
            </div>
          ))}
        </div>

        {/* Nav right */}
        <div style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontWeight: 500 }}>Autonomous Outreach Engine</span>
          {isRunning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f97316', fontWeight: 600 }}>
              <div className="spinner" style={{ borderTopColor: '#f97316', borderColor: 'rgba(249,115,22,0.2)' }} />
              Running
            </div>
          )}
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        flex: 1,
        overflow: 'hidden',
        gap: 0,
      }}>
        {/* ── Left Panel ─────────────────────────────────── */}
        <aside style={{
          display: 'flex', flexDirection: 'column', gap: 0,
          background: 'rgba(10, 13, 20, 0.7)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          overflowY: 'auto',
        }}>
          {/* Panel header */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 style={{ margin: 0, fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569' }}>
              Campaign Config
            </h2>
          </div>

          {/* Input fields */}
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
            <div className="fr-field">
              <label className="fr-label" htmlFor="companyName">Target Company</label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="fr-input"
                placeholder="e.g. Acme Corp"
                disabled={isRunning}
              />
            </div>

            <div className="fr-field">
              <label className="fr-label" htmlFor="icp">Ideal Customer Profile</label>
              <textarea
                id="icp"
                value={icp}
                onChange={e => setIcp(e.target.value)}
                rows={5}
                className="fr-input"
                placeholder="Describe your ideal customer persona, role, and pain points..."
                disabled={isRunning}
              />
            </div>

            <div className="fr-field">
              <label className="fr-label" htmlFor="recipient">Recipient Email</label>
              <input
                id="recipient"
                type="email"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                className="fr-input"
                placeholder="target@company.com"
                disabled={isRunning}
              />
            </div>
          </div>

          {/* Launch button section */}
          <div style={{ padding: '16px 20px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              id="launchBtn"
              onClick={handleRun}
              disabled={isRunning}
              className={`btn-launch ${isRunning ? 'btn-launch-running' : 'btn-launch-active'}`}
            >
              {isRunning ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div className="spinner" />
                  Agents Running...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <IconSend />
                  Launch Outreach
                </span>
              )}
            </button>

            <p style={{
              margin: '10px 0 0', textAlign: 'center', fontSize: '10.5px',
              color: '#334155', lineHeight: '1.4',
            }}>
              AI will harvest signals, research the company, and generate + send a personalized email.
            </p>
          </div>
        </aside>

        {/* ── Right Panel ────────────────────────────────── */}
        <main style={{
          display: 'grid',
          gridTemplateRows: '1fr 1fr',
          gridTemplateColumns: '1fr 280px',
          gap: '1px',
          background: 'rgba(255,255,255,0.04)',
          overflow: 'hidden',
        }}>
          {/* ── Intelligence Signals ─────────────────────── */}
          <section style={{
            background: 'var(--surface-1)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', padding: '20px',
          }}>
            <div className="section-header">
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                background: 'rgba(96,165,250,0.12)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#60a5fa',
              }}>
                <IconSearch />
              </div>
              <div style={{ flex: 1 }}>
                <div className="section-title">Intelligence Signals</div>
              </div>
              {signals.length > 0 && (
                <span style={{
                  padding: '2px 8px', borderRadius: '100px', fontSize: '10px', fontWeight: 700,
                  background: 'rgba(96,165,250,0.12)', color: '#60a5fa',
                  border: '1px solid rgba(96,165,250,0.2)',
                }}>
                  {signals.length}
                </span>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {signals.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon" style={{ background: 'rgba(96,165,250,0.08)', color: '#60a5fa' }}>
                    <IconSearch />
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#475569' }}>No signals yet</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#334155', maxWidth: '200px', lineHeight: '1.5' }}>
                    Growth signals will appear here as the harvester agent scans the web.
                  </p>
                </div>
              ) : (
                signals.map((signal, index) => (
                  <div
                    key={index}
                    className="signal-card animate-fade-in-up"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '6px', height: '6px', borderRadius: '50%', background: '#60a5fa',
                        flexShrink: 0, marginTop: '5px',
                        boxShadow: '0 0 6px rgba(96,165,250,0.5)',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{
                          margin: '0 0 4px', fontSize: '12px', fontWeight: 600, color: '#e2e8f0',
                          lineHeight: '1.4',
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {signal.title}
                        </h4>
                        <p style={{
                          margin: '0 0 6px', fontSize: '11px', color: '#64748b', lineHeight: '1.5',
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {signal.content?.length > 100 ? `${signal.content.substring(0, 100)}…` : signal.content}
                        </p>
                        <a
                          href={signal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '10.5px', color: '#3b82f6', textDecoration: 'none',
                            display: 'flex', alignItems: 'center', gap: '4px',
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'}
                          onMouseLeave={e => e.currentTarget.style.color = '#3b82f6'}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                            {signal.url}
                          </span>
                          <IconExternalLink />
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ── Mission Logs ──────────────────────────────── */}
          <section style={{
            background: 'var(--surface-1)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', padding: '20px',
            gridRow: '1 / 3',
            borderLeft: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div className="section-header">
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                background: 'rgba(129,140,248,0.12)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#818cf8',
              }}>
                <IconTerminal />
              </div>
              <div style={{ flex: 1 }}>
                <div className="section-title">Mission Logs</div>
              </div>
              {isRunning && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '10px', fontWeight: 700, color: '#f97316',
                  padding: '3px 8px', borderRadius: '20px',
                  background: 'rgba(249,115,22,0.08)',
                  border: '1px solid rgba(249,115,22,0.2)',
                }}>
                  <div className="spinner" style={{ width: '8px', height: '8px', borderTopColor: '#f97316', borderColor: 'rgba(249,115,22,0.2)' }} />
                  Live
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {logs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon" style={{ background: 'rgba(129,140,248,0.08)', color: '#818cf8' }}>
                    <IconTerminal />
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#475569' }}>Awaiting launch</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#334155', lineHeight: '1.5', maxWidth: '180px' }}>
                    Agent activity logs will stream in real-time here.
                  </p>
                </div>
              ) : (
                logs.map((log, index) => {
                  const type = getLogType(log);
                  const text = log.log || log || '';
                  return (
                    <div key={index} className={`log-entry type-${type} log-entry-animation`} style={{ animationDelay: `${Math.min(index * 30, 200)}ms` }}>
                      <span style={{ opacity: 0.5, marginRight: '6px', userSelect: 'none' }}>{getLogPrefix(type)}</span>
                      {text.toString()}
                    </div>
                  );
                })
              )}
              <div ref={logsEndRef} />
            </div>
          </section>

          {/* ── Email Preview ─────────────────────────────── */}
          <section style={{
            background: 'var(--surface-1)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', padding: '20px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div className="section-header">
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                background: 'rgba(168,85,247,0.12)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#a855f7',
              }}>
                <IconMail />
              </div>
              <div style={{ flex: 1 }}>
                <div className="section-title">Generated Email</div>
              </div>
              {emailPreview && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700,
                  background: 'rgba(34,197,94,0.08)', color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.2)',
                }}>
                  <IconCheck />
                  Sent
                </span>
              )}
            </div>

            {emailPreview ? (
              <div style={{
                flex: 1, overflowY: 'auto',
                background: 'rgba(10,13,20,0.6)', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.07)',
              }} className="animate-fade-in-up">
                {/* Email meta bar */}
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: 'linear-gradient(90deg, rgba(168,85,247,0.08), rgba(99,102,241,0.06))',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px', lineHeight: '1.3' }}>
                    {emailPreview.subject}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '10.5px', color: '#475569' }}>
                    <span><span style={{ color: '#334155' }}>To: </span>{emailPreview.recipient}</span>
                    <span><span style={{ color: '#334155' }}>Via: </span>Gmail SMTP</span>
                    <span style={{ marginLeft: 'auto', color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <IconCheck />Delivered
                    </span>
                  </div>
                </div>

                {/* Email body */}
                <div style={{ padding: '16px', fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                  {emailPreview.body}
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ flex: 1, background: 'rgba(10,13,20,0.3)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.06)' }}>
                <div className="empty-state-icon" style={{ background: 'rgba(168,85,247,0.08)', color: '#a855f7' }}>
                  <IconMail />
                </div>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#475569' }}>No email yet</p>
                <p style={{ margin: 0, fontSize: '11px', color: '#334155', lineHeight: '1.5', maxWidth: '200px' }}>
                  Your AI-personalized outreach email will render here after generation.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
