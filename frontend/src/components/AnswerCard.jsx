// AnswerCard.jsx — Dark Apple-inspired answer container with Royal Amethyst border & citations
import SourceList from './SourceList'

export default function AnswerCard({ answer, sufficient, sources }) {

  // ── Case 1: Insufficient Evidence State ──
  if (!sufficient) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-[#0f0e0a] p-6 shadow-xl relative overflow-hidden">
        {/* Subtle amber gradient back-glow */}
        <div className="absolute -top-16 -left-16 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-start gap-3.5 relative">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-amber-200">
              Insufficient Evidence in Uploaded Papers
            </h4>
            <p className="text-xs text-amber-400/80 mt-1 leading-relaxed">
              The retrieved passages do not contain explicit evidence to answer this query factually.
              Try rephrasing or uploading more related papers to broaden your workspace.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Case 2: Evidence-Grounded Answer ──
  return (
    <div className="space-y-6">
      {/* Answer Card with subtle Amethyst edge lighting & Cyan accent mark */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c12]/90 backdrop-blur-xl p-6 shadow-dark-card relative overflow-hidden">
        {/* Glowing top diagonal hairline accent */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan/40 to-transparent" />
        
        {/* Header Badge */}
        <div className="flex items-center justify-between mb-4 pb-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-md bg-cyan/15 border border-cyan/30 flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="text-cyan">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Synthesized Answer
            </span>
          </div>

          <span className="text-[10px] font-mono text-cyan bg-cyan/10 border border-cyan/20 px-2 py-0.5 rounded-full">
            Evidence Grounded
          </span>
        </div>

        {/* Answer Content */}
        <div className="text-sm text-gray-200 leading-relaxed font-normal whitespace-pre-wrap selection:bg-cyan/30">
          {answer}
        </div>
      </div>

      {/* Citations below */}
      <SourceList sources={sources} />
    </div>
  )
}
