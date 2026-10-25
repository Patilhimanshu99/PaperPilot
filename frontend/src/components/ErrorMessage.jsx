// ErrorMessage.jsx — Dark mode refined error banner with subtle amethyst-crimson glow
export default function ErrorMessage({ message }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-3 bg-red-950/30 border border-red-500/25 text-red-300
                    px-4 py-3.5 rounded-2xl text-xs backdrop-blur-md shadow-lg shadow-red-950/20">
      <span className="mt-0.5 shrink-0 text-red-400">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </span>
      <span className="leading-relaxed font-normal">{message}</span>
    </div>
  )
}
