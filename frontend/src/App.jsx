import { useState, useEffect } from 'react'
import { getPapers } from './api'
import Sidebar from './components/Sidebar'
import AskPanel from './components/AskPanel'
import ComparePanel from './components/ComparePanel'

export default function App() {
  const [tab, setTab] = useState('ask')
  const [papers, setPapers] = useState([])
  const [method, setMethod] = useState('hybrid')

  // Restore papers from the backend on page refresh.
  useEffect(() => {
    let cancelled = false

    getPapers()
      .then((data) => {
        if (!cancelled) {
          setPapers(Array.isArray(data.papers) ? data.papers : [])
        }
      })
      .catch((error) => {
        console.error('Could not load papers:', error)
        if (!cancelled) setPapers([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  const safePapers = Array.isArray(papers) ? papers : []
  const hasPapers = safePapers.length > 0

  return (
    <div className="flex h-screen bg-[#050505] text-[#e5e7eb] font-sans overflow-hidden bg-grid-pattern relative">
      
      {/* ── Soft Royal Amethyst & Cyan Background Lighting ── */}
      <div className="absolute top-0 right-1/4 w-[650px] h-[450px] bg-amethyst-700/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[350px] bg-cyan/5 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Sidebar ── */}
      <Sidebar
        papers={safePapers}
        method={method}
        onMethodChange={setMethod}
        onPapersChange={(nextPapers) => {
          setPapers(Array.isArray(nextPapers) ? nextPapers : [])
        }}
      />

      {/* ── Main Workspace ── */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">

        {/* Apple-inspired Top Header */}
        <header className="bg-[#07070a]/90 backdrop-blur-xl border-b border-white/[0.06] px-8 flex items-end gap-2 shrink-0">
          {[
            {
              id: 'ask',
              label: 'Research Q&A',
              icon: (
                <path
                  d="M6 2a4 4 0 100 8 4 4 0 000-8zM1 6a5 5 0 119 2.9L13 12l-1 1-3.1-3.1A5 5 0 011 6z"
                  fill="currentColor"
                />
              ),
            },
            {
              id: 'compare',
              label: 'Compare Retrieval',
              icon: (
                <path
                  d="M2 3h9M2 6.5h7M2 10h5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ),
            },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold tracking-wide border-b-2 transition-all duration-200 -mb-px ${
                tab === id
                  ? 'border-cyan text-cyan'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-white/10'
              }`}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 14 14"
                fill="none"
                className={tab === id ? 'text-cyan' : 'text-gray-500'}
              >
                {icon}
              </svg>
              {label}
            </button>
          ))}

          {/* Right Header Status Pill */}
          <div className="ml-auto pb-3.5 flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.07]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan shadow-cyan-sm" />
              <span className="text-[10px] text-gray-400 font-mono">
                ENGINE: <span className="text-gray-200 font-bold uppercase">{method}</span>
              </span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-10">
          
          {/* Onboarding Banner when no papers exist */}
          {!hasPapers && (
            <div className="max-w-4xl mx-auto mb-8">
              <div className="flex items-start gap-4 rounded-2xl border border-amethyst-500/30 bg-[#0e0a16]/80 backdrop-blur-xl p-5 shadow-amethyst-glow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="w-9 h-9 rounded-xl bg-amethyst-600/30 border border-amethyst-500/40 flex items-center justify-center shrink-0 mt-0.5 text-cyan">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M12 16v-4m0-4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>

                <div className="relative z-10">
                  <h3 className="text-sm font-semibold text-white">
                    Workspace is Ready — Upload Your Papers
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Upload research PDFs using the sidebar. PaperPilot will extract text, segment chunks with page numbers, and index embeddings so you can query them with factual citations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === 'ask' && (
            <AskPanel method={method} hasPapers={hasPapers} />
          )}

          {tab === 'compare' && (
            <ComparePanel hasPapers={hasPapers} />
          )}
        </main>
      </div>
    </div>
  )
}
