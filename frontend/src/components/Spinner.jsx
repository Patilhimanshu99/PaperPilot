// Spinner.jsx — Apple-inspired electric cyan & amethyst dual ring spinner
export default function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-3.5 py-12">
      <div className="relative w-10 h-10">
        {/* Outer subtle amethyst ring */}
        <div className="absolute inset-0 rounded-full border-2 border-amethyst-700/40" />
        {/* Spinning electric cyan ring with glow */}
        <div 
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan animate-spin"
          style={{ filter: 'drop-shadow(0 0 8px rgba(0, 229, 255, 0.6))' }}
        />
        {/* Inner pulsing cyan dot */}
        <div className="absolute inset-[13px] rounded-full bg-cyan/70 animate-pulse" />
      </div>
      <p className="text-xs text-gray-400 font-medium tracking-widest uppercase">
        Synthesizing Answer…
      </p>
    </div>
  )
}
