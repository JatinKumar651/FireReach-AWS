import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [companyName, setCompanyName] = useState('Acme Corp');
  const [icp, setIcp] = useState('VP of Engineering seeking AI tools to boost developer productivity.');
  const [recipient, setRecipient] = useState('target@example.com');
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [emailPreview, setEmailPreview] = useState(null);
  const [apiStatus, setApiStatus] = useState({
    groq: false,
    tavily: false,
    resend: false
  });

  const endOfLogsRef = useRef(null);

  useEffect(() => {
    endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    // Fetch API status on load
    fetch("http://localhost:8000/api/status")
      .then(res => res.json())
      .then(data => setApiStatus(data))
      .catch(err => console.error("Could not fetch API status", err));
  }, []);

  const handleRun = async () => {
    if (!companyName || !icp || !recipient) return;

    setLogs([]);
    setEmailPreview(null);
    setIsRunning(true);

    try {
      const res = await fetch("http://localhost:8000/api/run-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: companyName, icp, recipient })
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop(); // Keep last incomplete part in buffer

        for (const part of parts) {
          if (part.startsWith("data: ")) {
            const jsonStr = part.substring(6).trim();
            if (jsonStr) {
              try {
                const data = JSON.parse(jsonStr);
                setLogs(prev => [...prev, data]);
                if (data.result && data.result.subject) {
                  setEmailPreview(data.result);
                }
              } catch (err) {
                console.error("Failed to parse SSE data:", err, jsonStr);
              }
            }
          }
        }
      }
    } catch (error) {
      setLogs(prev => [...prev, { log: `Connection error: ${error.message}`, type: "error" }]);
    }

    setIsRunning(false);
  };

  return (
    <div className="flex h-screen w-full font-sans">
      {/* Sidebar */}
      <div className="w-80 bg-slate-800 border-r border-slate-700 p-6 flex flex-col gap-6 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-1">
            FireReach
          </h1>
          <p className="text-xs text-slate-400">Autonomous Outreach Engine</p>
        </div>

        {/* API Status */}
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
          <h2 className="text-sm font-semibold mb-3 text-slate-300">API Status</h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span>Groq (Orchestrator)</span>
              {apiStatus.groq ? 
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Active</span> : 
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Mocked</span>
              }
            </div>
            <div className="flex justify-between items-center">
              <span>Ollama (Local Analyst)</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Active</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Tavily API</span>
              {apiStatus.tavily ? 
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Active</span> : 
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Mocked</span>
              }
            </div>
            <div className="flex justify-between items-center">
              <span>Resend API</span>
              {apiStatus.resend ? 
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Configured</span> : 
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Pending</span>
              }
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="flex flex-col gap-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Ideal Customer Profile (ICP)</label>
            <textarea
              value={icp}
              onChange={e => setIcp(e.target.value)}
              rows={4}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:outline-none focus:border-orange-500 transition-colors resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Target Email</label>
            <input
              type="email"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={isRunning}
          className={`w-full py-3 rounded font-bold text-sm transition-all shadow-lg shadow-orange-500/20 ${isRunning ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white hover:shadow-orange-500/40'}`}
        >
          {isRunning ? 'Engaging Agents...' : 'Launch Outreach'}
        </button>
      </div>

      {/* Main Mission Control */}
      <div className="flex-1 flex flex-col p-6 gap-6 bg-[#0b1120]">

        {/* Terminal logs */}
        <div className="flex-1 bg-[#0f172a] rounded-xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl relative">
          <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
              </div>
              <span className="text-sm font-mono text-slate-400 ml-2">mission_control_terminal</span>
            </div>
            {isRunning && <div className="text-xs text-orange-400 animate-pulse font-mono">● LIVE</div>}
          </div>
          <div className="flex-1 p-4 overflow-y-auto terminal-scroll font-mono text-sm">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600 italic">
                Awaiting mission parameters. Agents idle.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {logs.map((L, i) => (
                  <div key={i} className={`flex gap-3 ${L.type === 'error' ? 'text-red-400' : L.type === 'warn' ? 'text-yellow-400' : 'text-slate-300'}`}>
                    <span className="text-slate-500 select-none">[{String(i + 1).padStart(3, '0')}]</span>
                    <span>{L.log}</span>
                  </div>
                ))}
                <div ref={endOfLogsRef} />
              </div>
            )}
          </div>
        </div>

        {/* Email Preview Card */}
        {emailPreview && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl animate-fade-in-up">
            <div className={`px-6 py-4 border-b flex items-center justify-between ${emailPreview.status === 'error' ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-800/80 border-slate-700'}`}>
              <h2 className="font-semibold text-slate-200">Dispatched Email Preview</h2>
              <div className="flex flex-col items-end">
                {emailPreview.status === 'live_sent' && <span className="text-xs font-mono bg-green-500/10 text-green-400 px-2 py-1 rounded border border-green-500/20">SENT (LIVE API)</span>}
                {emailPreview.status === 'mock_sent' && <span className="text-xs font-mono bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded border border-yellow-500/20">SENT (MOCK)</span>}
                {emailPreview.status === 'error' && <span className="text-xs font-mono bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/20">API ERROR</span>}
              </div>
            </div>
            
            {emailPreview.message && (
                <div className="px-6 py-2 bg-red-500/10 text-red-400 text-xs font-mono border-b border-red-500/20">
                    {emailPreview.message}
                </div>
            )}
            
            <div className="p-6">
              <dl className="grid grid-cols-[100px_1fr] gap-y-3 gap-x-4 text-sm mb-6">
                <dt className="text-slate-500 text-right">To:</dt>
                <dd className="font-medium text-slate-200">{emailPreview.recipient}</dd>

                <dt className="text-slate-500 text-right">Subject:</dt>
                <dd className="font-medium text-slate-200">{emailPreview.subject}</dd>
              </dl>

              <div className="p-5 bg-slate-900 rounded-lg border border-slate-700 whitespace-pre-wrap text-sm text-slate-300">
                {emailPreview.body}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
