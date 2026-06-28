import { useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ── API Configuration ────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// ── Constants ──────────────────────────────────────────────────────────────
const STAGES = [
  { id: 1, name: "Search Agent",  icon: "🔍", desc: "Searches the web via Tavily" },
  { id: 2, name: "Reader Agent",  icon: "📄", desc: "Scrapes & summarises pages" },
  { id: 3, name: "Writer Chain",  icon: "✍️",  desc: "Composes a draft report" },
  { id: 4, name: "Critic Chain",  icon: "🎯", desc: "Reviews & improves report" },
];

const TABS = [
  { key: "search_results",  label: "Search Results",  icon: "🔍", stageId: 1 },
  { key: "scraped_content", label: "Scraped Content",  icon: "📄", stageId: 2 },
  { key: "draft",           label: "Draft Report",    icon: "✍️",  stageId: 3 },
  { key: "final_report",    label: "Final Report",    icon: "🎯", stageId: 4 },
];

const EXAMPLES = [
  "Quantum computing breakthroughs 2025",
  "LangChain + Gemini AI integration",
  "Climate tech startups 2025",
  "State of large language models",
];

const STATUS_INIT = { 1: "idle", 2: "idle", 3: "idle", 4: "idle" };

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [topic, setTopic]         = useState("");
  const [running, setRunning]     = useState(false);
  const [stages, setStages]       = useState(STATUS_INIT);
  const [stageMsg, setStageMsg]   = useState({});
  const [results, setResults]     = useState({});
  const [activeTab, setActiveTab] = useState("final_report");
  const [error, setError]         = useState(null);
  const [toast, setToast]         = useState(null);
  const evtRef = useRef(null);

  // ── Stage helper ────────────────────────────────────────────────────────
  const setStage = (id, status, msg) =>
    setStages(s => ({ ...s, [id]: status })) ||
    setStageMsg(m => ({ ...m, [id]: msg || "" }));

  // ── Show toast ───────────────────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Copy text ────────────────────────────────────────────────────────────
  const copyText = (key) => {
    if (!results[key]) return;
    navigator.clipboard.writeText(results[key]);
    showToast("Copied to clipboard!");
  };

  // ── Download report ──────────────────────────────────────────────────────
  const downloadReport = () => {
    const content = results["final_report"] || results["draft"] || "";
    if (!content) return;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `research-${topic.replace(/\s+/g, "-").slice(0, 40)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Report downloaded!");
  };

  // ── Run pipeline via SSE ────────────────────────────────────────────────
  const runResearch = useCallback(async () => {
    if (!topic.trim() || running) return;

    // Reset state
    setRunning(true);
    setError(null);
    setResults({});
    setStages(STATUS_INIT);
    setStageMsg({});

    // Close any existing SSE connection
    if (evtRef.current) { evtRef.current.close(); }

    const encoded = encodeURIComponent(topic.trim());
    const url = `${API_BASE}/api/stream?topic=${encoded}`;
    const es = new EventSource(url);
    evtRef.current = es;

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        const { stage, status, label, message, data } = payload;

        if (status === "running") {
          setStages(s => ({ ...s, [stage]: "running" }));
          setStageMsg(m => ({ ...m, [stage]: message || "" }));
          // Auto-switch to relevant tab
          const tab = TABS.find(t => t.stageId === stage);
          if (tab) setActiveTab(tab.key);
        }

        if (status === "done" && stage >= 1 && stage <= 4) {
          setStages(s => ({ ...s, [stage]: "done" }));
          setStageMsg(m => ({ ...m, [stage]: message || "Done" }));
          const tab = TABS.find(t => t.stageId === stage);
          if (tab && data) {
            setResults(r => ({ ...r, [tab.key]: data }));
            setActiveTab(tab.key);
          }
        }

        if (status === "error") {
          if (stage >= 1 && stage <= 4) {
            setStages(s => ({ ...s, [stage]: "error" }));
            setStageMsg(m => ({ ...m, [stage]: message }));
          }
          setError(message || "Unknown error occurred");
          setRunning(false);
          es.close();
        }

        if (status === "complete") {
          setRunning(false);
          setActiveTab("final_report");
          showToast("Research complete! 🎉");
          es.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setError("Connection to backend lost. Make sure the backend is running on port 8000.");
      setRunning(false);
      es.close();
    };
  }, [topic, running]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runResearch(); }
  };

  const hasResults = Object.keys(results).length > 0;
  const activeResult = results[activeTab];

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-logo">
          <div className="logo-icon">🤖</div>
          <span className="logo-text">ResearchAI</span>
        </div>
        <div className="header-badge">Powered by Gemini 2.5 Flash</div>
      </header>

      {/* ── Main ── */}
      <main className="main">

        {/* Hero */}
        <section className="hero">
          <div className="hero-eyebrow">
            <span>⚡</span> Multi-Agent Research System
          </div>
          <h1 className="hero-title">AI-Powered Deep Research</h1>
          <p className="hero-subtitle">
            Four specialized AI agents—Search, Read, Write, Critique—work together
            to deliver comprehensive research reports in minutes.
          </p>
          <div className="hero-pills">
            <span className="pill">🔍 Tavily Search</span>
            <span className="pill">📄 BeautifulSoup</span>
            <span className="pill">🤖 Gemini 2.5 Flash</span>
            <span className="pill">⛓️ LangChain</span>
            <span className="pill">⚡ FastAPI + SSE</span>
          </div>
        </section>

        {/* Search */}
        <section className="search-section">
          <div className="search-card">
            <label className="search-label" htmlFor="topic-input">Research Topic</label>
            <div className="search-input-row">
              <input
                id="topic-input"
                type="text"
                className="search-input"
                placeholder="e.g. Quantum computing breakthroughs in 2025..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={running}
                autoComplete="off"
              />
              <button
                id="research-btn"
                className="search-btn"
                onClick={runResearch}
                disabled={running || !topic.trim()}
              >
                {running ? (
                  <><SpinnerIcon /> Researching...</>
                ) : (
                  <><span>🚀</span> Research</>
                )}
              </button>
            </div>
            <div className="search-examples">
              <span className="search-examples-label">Try:</span>
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  className="example-chip"
                  onClick={() => setTopic(ex)}
                  disabled={running}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="error-banner" role="alert">
            <span>⚠️</span>
            <div>
              <strong>Error: </strong>{error}
              <br />
              <small>Make sure the backend server is running: <code>cd backend && uvicorn server:app --reload</code></small>
            </div>
          </div>
        )}

        {/* Pipeline Stages */}
        {(running || hasResults) && (
          <section className="pipeline-section">
            <div className="section-heading">Pipeline Progress</div>
            <div className="pipeline-grid">
              {STAGES.map(s => (
                <StageCard
                  key={s.id}
                  stage={s}
                  status={stages[s.id]}
                  message={stageMsg[s.id]}
                />
              ))}
            </div>
          </section>
        )}

        {/* Results */}
        {hasResults && (
          <section className="results-section">
            <div className="section-heading">Research Results</div>

            {/* Tabs */}
            <div className="tabs" role="tablist">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  id={`tab-${tab.key}`}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                  <span className={`tab-dot ${results[tab.key] ? "done" : ""}`} />
                </button>
              ))}
            </div>

            {/* Result Card */}
            <div className="result-card">
              <div className="result-card-header">
                <div className="result-card-title">
                  <span>{TABS.find(t => t.key === activeTab)?.icon}</span>
                  {TABS.find(t => t.key === activeTab)?.label}
                  {!activeResult && <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>— in progress…</span>}
                </div>
                <div className="result-card-actions">
                  {activeResult && (
                    <>
                      <button
                        id={`copy-btn-${activeTab}`}
                        className="action-btn"
                        onClick={() => copyText(activeTab)}
                        title="Copy to clipboard"
                      >
                        📋 Copy
                      </button>
                      {activeTab === "final_report" && (
                        <button
                          id="download-btn"
                          className="action-btn"
                          onClick={downloadReport}
                          title="Download as Markdown"
                        >
                          ⬇️ Download
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="result-body">
                {activeResult ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activeResult}
                  </ReactMarkdown>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">
                      {running ? "⏳" : "💤"}
                    </div>
                    <div className="empty-title">
                      {running ? "Working on it…" : "No data yet"}
                    </div>
                    <div className="empty-desc">
                      {running
                        ? `Stage ${TABS.find(t => t.key === activeTab)?.stageId} is still processing`
                        : "Start a research session above"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Initial empty state */}
        {!running && !hasResults && !error && (
          <div className="empty-state" style={{ paddingTop: "20px" }}>
            <div className="empty-icon">🧪</div>
            <div className="empty-title">Ready to Research</div>
            <div className="empty-desc">
              Enter any topic above and watch 4 AI agents collaborate in real-time
            </div>
          </div>
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        Built with <span>LangChain</span> · <span>Google Gemini 2.5 Flash</span> · <span>FastAPI</span> · <span>React + Vite</span>
      </footer>

      {/* ── Toast ── */}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────
function StageCard({ stage, status, message }) {
  return (
    <div className={`stage-card ${status || "idle"}`}>
      <div className="stage-num">STAGE {stage.id}</div>
      <div className="stage-icon">{stage.icon}</div>
      <div className="stage-name">{stage.name}</div>
      <div className="stage-desc">{stage.desc}</div>
      <div className="stage-status-row">
        <div className={`stage-dot ${status || "idle"}`} />
        <span className="stage-status-text">
          {status === "running" ? (message || "Running…")
           : status === "done"  ? "Complete ✓"
           : status === "error" ? "Failed ✗"
           : "Waiting"}
        </span>
      </div>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
