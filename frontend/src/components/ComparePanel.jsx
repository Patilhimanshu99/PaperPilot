// ComparePanel.jsx — Four retrieval methods side by side in sleek dark cards
import { useState } from 'react'
import { compareQuestion } from '../api'
import Spinner from './Spinner'
import ErrorMessage from './ErrorMessage'

const METHOD_META = {
  tfidf:  { label: 'TF-IDF',  desc: 'Term Frequency', badge: 'bg-purple-900/30 text-purple-300 border-purple-500/30' },
  bm25:   { label: 'BM25',    desc: 'Okapi Probabilistic', badge: 'bg-emerald-900/30 text-emerald-300 border-emerald-500/30' },
  dense:  { label: 'Dense',   desc: 'Semantic FAISS', badge: 'bg-blue-900/30 text-blue-300 border-blue-500/30' },
  hybrid: { label: 'Hybrid',  desc: 'RRF Fusion', badge: 'bg-cyan/15 text-cyan border-cyan/30' },
}

function MethodColumn({ methodName, results }) {
  const meta = METHOD_META[methodName] || {}

  return (
    <div className="flex-1 min-w-[240px] flex flex-col rounded-2xl border border-white/[0.08] bg-[#0c0c11] shadow-xl overflow-hidden">
      {/* Column header */}
      <div className="px-4 py-3.5 border-b border-white/[0.06] bg-[#0e0e14] flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-white uppercase tracking-wider">{meta.label}</span>
          <p className="text-[10px] text-gray-500 mt-0.5">{meta.desc}</p>
        </div>
        <span className={`text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full border ${meta.badge}`}>
          Top 3
        </span>
      </div>

      {/* Result rows */}
      <div className="flex-1 divide-y divide-white/[0.04]">
        {(!results || results.length === 0) ? (
          <div className="p-6 text-center text-xs text-gray-600">No matches found</div>
        ) : (
          results.map((r, i) => (
            <div key={i} className="p-4 hover:bg-white/[0.02] transition-colors duration-150">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-white/[0.08] text-gray-300 flex items-center justify-center text-[9px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-xs font-semibold text-gray-300 truncate" title={r.paper_title}>
                    {r.paper_title}
                  </p>
                </div>
                <span className="text-[10px] text-gray-500 shrink-0">p. {r.page}</span>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-4 mt-2">
                {r.text}
              </p>

              <div className="mt-2.5 flex items-center justify-between text-[10px] text-gray-500 font-mono">
                <span>score:</span>
                <span className="text-cyan bg-cyan/10 border border-cyan/20 px-1.5 py-0.5 rounded">
                  {r.score}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function ComparePanel({ hasPapers }) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [results, setResults]   = useState(null)

  async function handleCompare() {
    if (loading) return
    if (!hasPapers) {
      setError('Please upload at least one PDF in the sidebar first.')
      return
    }
    if (!question.trim()) {
      setError('Please type a question to compare.')
      return
    }

    setLoading(true)
    setError('')
    setResults(null)

    try {
      const data = await compareQuestion(question)
      setResults(data)
    } catch (err) {
      setError(err.message || 'Comparison retrieval failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Retrieval Engine Benchmarking
        </h2>
        <p className="text-xs text-gray-400 mt-1 max-w-xl">
          Evaluate how Lexical (TF-IDF &amp; BM25), Semantic (Dense), and Hybrid (RRF) rank passages from your library.
        </p>
      </div>

      {/* Input Box */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c11] p-5 shadow-dark-card">
        <label className="field-label-dark">Query for Comparison</label>
        <textarea
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What baseline models were evaluated in the experiments?"
          className="dark-field-input resize-none bg-black/40 border-white/[0.06] text-white"
        />
        <div className="flex justify-end mt-3">
          <button
            type="button"
            onClick={handleCompare}
            disabled={loading}
            className="btn-cyan-pill text-xs px-5 py-2 font-bold"
          >
            {loading ? 'Evaluating…' : 'Compare Retrieval Methods'}
          </button>
        </div>
      </div>

      {loading && <Spinner />}
      <ErrorMessage message={error} />

      {/* Side-by-side 4 Column Grid */}
      {results && !loading && (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
          {['tfidf', 'bm25', 'dense', 'hybrid'].map((m) => (
            <MethodColumn key={m} methodName={m} results={results[m]} />
          ))}
        </div>
      )}
    </div>
  )
}
