// AskPanel.jsx — Minimalist question input with Electric Cyan pill button & hint states
import { useState } from 'react'
import { askQuestion } from '../api'
import Spinner from './Spinner'
import ErrorMessage from './ErrorMessage'
import AnswerCard from './AnswerCard'

export default function AskPanel({ method, hasPapers }) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function handleAsk() {
    if (loading) return
    if (!hasPapers) {
      setError('Please upload at least one research paper PDF in the sidebar first.')
      return
    }
    if (!question.trim()) {
      setError('Please type a question regarding your uploaded papers.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const data = await askQuestion(question, method)
      setResult(data)
    } catch (err) {
      setError(err.message || 'An error occurred while answering your question.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Hero Header matching reference aesthetic */}
      <div className="mb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amethyst-900/40 border border-amethyst-500/30 text-amethyst-300 text-[11px] font-medium mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan shadow-cyan-sm animate-pulse" />
          RAG-Powered Workspace
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
          Ask your papers. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 via-gray-400 to-gray-600">
            Backed strictly by evidence.
          </span>
        </h2>
        <p className="text-sm text-gray-400 mt-2 font-normal max-w-xl">
          Queries are matched against extracted passages using {method.toUpperCase()} retrieval, cited with exact page references.
        </p>
      </div>

      {/* Question Input Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c11]/85 backdrop-blur-xl p-5 shadow-dark-card relative overflow-hidden group focus-within:border-cyan/40 transition-all duration-200">
        <label className="field-label-dark flex items-center justify-between">
          <span>Query Prompt</span>
          <span className="text-gray-500 font-mono text-[10px] tracking-normal">
            Active: <span className="text-cyan">{method.toUpperCase()}</span>
          </span>
        </label>

        <textarea
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. What datasets or benchmarks did the authors use to evaluate performance?"
          className="dark-field-input resize-none bg-black/40 border-white/[0.06] text-white"
        />

        {/* Footer info & Electric Cyan Pill Ask Button */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.05]">
          <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.1] font-mono text-[10px] text-gray-400">
              Return
            </kbd>
            <span>to ask</span>
            <span className="text-gray-700">·</span>
            <kbd className="px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.1] font-mono text-[10px] text-gray-400">
              Shift+Return
            </kbd>
            <span>newline</span>
          </p>

          <button
            type="button"
            onClick={handleAsk}
            disabled={loading}
            className="btn-cyan-pill text-xs px-6 py-2.5 font-bold"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                Thinking…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-black stroke-[2.5]">
                  <circle cx="11" cy="11" r="8" stroke="currentColor"/>
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeLinecap="round"/>
                </svg>
                Ask PaperPilot
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && <Spinner />}

      {/* Error Message */}
      <ErrorMessage message={error} />

      {/* Generated Answer */}
      {result && !loading && (
        <AnswerCard
          answer={result.answer}
          sufficient={result.sufficient}
          sources={result.sources}
        />
      )}
    </div>
  )
}
