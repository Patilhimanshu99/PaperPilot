// Sidebar.jsx — Sleek dark navigation panel with Royal Amethyst & Electric Cyan accents
import { useState, useRef } from 'react'
import { uploadPapers, clearPapers, getPapers } from '../api'
import ErrorMessage from './ErrorMessage'

const METHOD_INFO = {
  hybrid: 'BM25 + Dense · Optimal',
  tfidf: 'Lexical frequency · Fast',
  bm25: 'Probabilistic term match',
  dense: 'FAISS semantic vectors',
}

export default function Sidebar({
  papers = [],
  method,
  onMethodChange,
  onPapersChange,
}) {
  const [loading, setLoading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  const safePapers = Array.isArray(papers) ? papers : []

  function updatePapers(nextPapers) {
    if (typeof onPapersChange === 'function') {
      onPapersChange(Array.isArray(nextPapers) ? nextPapers : [])
    }
  }

  async function processFiles(fileList) {
    if (loading) return
    const selectedFiles = Array.from(fileList || [])
    const pdfs = selectedFiles.filter((file) =>
      file.name.toLowerCase().endsWith('.pdf')
    )

    if (pdfs.length === 0) {
      setError('Please select PDF files only.')
      return
    }

    if (pdfs.length !== selectedFiles.length) {
      setError('Only PDF files are supported. Uploading selected PDFs.')
    } else {
      setError('')
    }

    setLoading(true)

    try {
      const data = await uploadPapers(pdfs)

      if (Array.isArray(data.papers)) {
        updatePapers(data.papers)
      } else {
        const refreshed = await getPapers()
        updatePapers(refreshed.papers)
      }

      if (Array.isArray(data.errors) && data.errors.length > 0) {
        setError(data.errors.join(' '))
      } else {
        setError('')
      }
    } catch (err) {
      setError(err.message || 'Could not upload selected PDFs.')
    } finally {
      setLoading(false)
      if (fileRef.current) {
        fileRef.current.value = ''
      }
    }
  }

  function handleFileInput(e) {
    processFiles(e.target.files)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }

  async function handleClear() {
    if (safePapers.length === 0 || clearing) return
    const confirmed = window.confirm('Remove all uploaded papers from the research workspace?')
    if (!confirmed) return

    setClearing(true)
    setError('')

    try {
      await clearPapers()
      updatePapers([])
    } catch (err) {
      setError(err.message || 'Could not clear uploaded papers.')
    } finally {
      setClearing(false)
    }
  }

  return (
    <aside className="w-80 shrink-0 h-screen bg-[#070709] border-r border-white/[0.07] flex flex-col z-20 select-none">
      
      {/* ── Brand Header with Apple-like minimalism & amethyst glow ── */}
      <div className="px-6 pt-7 pb-6 border-b border-white/[0.05] relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-10 -left-10 w-36 h-36 bg-amethyst-700/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-3 relative">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amethyst-600 via-amethyst-700 to-black p-[1px] shadow-sm">
            <div className="w-full h-full bg-[#0a0a0f] rounded-[11px] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-cyan">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">PaperPilot</h1>
              <span className="text-[9px] font-semibold text-cyan bg-cyan/10 border border-cyan/20 px-1.5 py-0.5 rounded-full">
                RAG 2.0
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">Evidence-Grounded AI</p>
          </div>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6">

        {/* Upload Zone */}
        <div>
          <label className="field-label-dark">Add Research Papers</label>
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload research paper PDFs"
            onClick={() => { if (!loading) fileRef.current?.click() }}
            onKeyDown={(e) => {
              if (!loading && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                fileRef.current?.click()
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center gap-2.5 h-32 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
              dragging
                ? 'border-cyan bg-cyan/10 shadow-cyan-glow'
                : 'border-white/[0.09] bg-[#0c0c11] hover:border-amethyst-400/40 hover:bg-[#101017]'
            } ${loading ? 'pointer-events-none opacity-70' : ''}`}
          >
            {/* Soft inner ambient glow */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-amethyst-700/15 rounded-full blur-xl pointer-events-none" />

            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-7 h-7 rounded-full border-2 border-cyan border-t-transparent animate-spin" />
                <p className="text-xs text-cyan font-medium animate-pulse">Extracting &amp; Vectorizing…</p>
              </div>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-gray-400 group-hover:text-cyan">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 16V8M12 8L9 11M12 8l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="text-center px-4">
                  <p className="text-xs text-gray-300 font-medium">
                    <span className="text-cyan font-semibold hover:underline">Choose PDF files</span> or drag here
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Multi-page PDFs up to 25MB</p>
                </div>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={handleFileInput}
            className="hidden"
            disabled={loading}
          />
        </div>

        {/* Error Notification */}
        <ErrorMessage message={error} />

        {/* Retrieval Strategy Selector */}
        <div>
          <label className="field-label-dark">Retrieval Engine</label>
          <div className="space-y-1.5">
            {['hybrid', 'tfidf', 'bm25', 'dense'].map((item) => {
              const isSelected = method === item
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onMethodChange?.(item)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 text-left relative overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-r from-amethyst-800/80 to-[#120a1f] text-white border border-amethyst-400/40 shadow-sm'
                      : 'bg-[#0b0b0f] text-gray-400 border border-white/[0.05] hover:border-white/[0.12] hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-cyan shadow-cyan-sm' : 'bg-gray-600'}`} />
                    <span className="font-semibold uppercase tracking-wider text-[11px]">
                      {item === 'tfidf' ? 'TF-IDF' : item === 'bm25' ? 'BM25' : item}
                    </span>
                  </div>
                  <span className={`text-[10px] truncate max-w-[130px] ${isSelected ? 'text-cyan/80' : 'text-gray-500'}`}>
                    {METHOD_INFO[item]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Uploaded Papers List */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="field-label-dark mb-0">Loaded Papers</label>
            {safePapers.length > 0 && (
              <span className="text-[10px] font-mono text-cyan bg-cyan/10 border border-cyan/20 px-2 py-0.5 rounded-full">
                {safePapers.length} {safePapers.length === 1 ? 'doc' : 'docs'}
              </span>
            )}
          </div>

          {safePapers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl bg-[#09090d] border border-dashed border-white/[0.06] text-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-xs text-gray-500 font-medium">Workspace is empty</p>
              <p className="text-[10px] text-gray-600">Upload PDFs above to begin</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {safePapers.map((paper, index) => {
                const title = typeof paper === 'string'
                  ? paper
                  : paper?.title ?? paper?.filename ?? `Paper ${index + 1}`

                const chunkCount = typeof paper === 'object' && paper !== null ? paper.chunks : undefined

                return (
                  <div
                    key={`${title}-${index}`}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0d0d12] border border-white/[0.06] hover:border-amethyst-500/30 transition-all duration-150"
                  >
                    <div className="w-6 h-6 rounded-lg bg-amethyst-900/50 border border-amethyst-500/30 flex items-center justify-center shrink-0 mt-0.5 text-amethyst-300">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-200 truncate leading-snug" title={title}>
                        {title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 font-mono">
                          {Number.isFinite(chunkCount) ? `${chunkCount} chunks` : 'Indexed'}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-cyan/60" />
                        <span className="text-[10px] text-emerald-400/80">Active</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer / Clear Workspace ── */}
      {safePapers.length > 0 && (
        <div className="p-4 border-t border-white/[0.05] bg-[#060608]">
          <button
            type="button"
            disabled={clearing || loading}
            onClick={handleClear}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 py-2.5 rounded-full border border-white/[0.08] hover:border-red-500/30 hover:bg-red-950/20 hover:text-red-300 transition-all duration-150 disabled:opacity-40"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {clearing ? 'Clearing workspace…' : 'Clear All Papers'}
          </button>
        </div>
      )}
    </aside>
  )
}
