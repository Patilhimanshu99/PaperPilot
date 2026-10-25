// SourceList.jsx — Collapsible evidence passages with Electric Cyan citation badges
import { useState } from 'react'

function SourceCard({ index, source }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
      open
        ? 'border-cyan/35 bg-[#0f0f15] shadow-lg shadow-black/40'
        : 'border-white/[0.07] bg-[#0a0a0e] hover:border-white/[0.15] hover:bg-[#0d0d12]'
    }`}>
      {/* Header Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left group"
      >
        {/* Electric Cyan Citation Badge */}
        <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-cyan text-black text-[11px] font-bold flex items-center justify-center shadow-cyan-sm">
          [{index}]
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-200 truncate group-hover:text-white transition-colors">
            {source.paper_title}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Page {source.page}</p>
        </div>

        {/* Score pill */}
        <span className="shrink-0 text-[10px] font-mono text-cyan bg-cyan/10 border border-cyan/25 px-2 py-0.5 rounded-full mr-1">
          score {source.score.toFixed(3)}
        </span>

        {/* Chevron Icon */}
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          className={`shrink-0 text-gray-500 group-hover:text-cyan transition-transform duration-200 ${open ? 'rotate-180 text-cyan' : ''}`}
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Expanded Passage Content */}
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-white/[0.06] bg-[#07070a]">
          <p className="text-xs text-gray-300 leading-relaxed font-normal whitespace-pre-wrap selection:bg-cyan/20">
            {source.text}
          </p>
        </div>
      )}
    </div>
  )
}

export default function SourceList({ sources }) {
  if (!sources || sources.length === 0) return null

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan shadow-cyan-sm" />
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          Supporting Citations ({sources.length}) — Click to view source text
        </h3>
      </div>
      <div className="space-y-2">
        {sources.map((source, i) => (
          <SourceCard key={i} index={i + 1} source={source} />
        ))}
      </div>
    </div>
  )
}
