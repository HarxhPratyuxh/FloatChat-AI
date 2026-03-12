export default function OceanLoader({ message = 'Charting your course…' }) {
    return (
        <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center overflow-hidden">

            {/* Ambient orbs */}
            <div className="absolute w-[500px] h-[500px] rounded-full -top-1/5 -left-[10%] pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)', animation: 'orb-drift-1 18s ease-in-out infinite' }} />
            <div className="absolute w-[400px] h-[400px] rounded-full -bottom-[10%] -right-[8%] pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)', animation: 'orb-drift-2 22s ease-in-out infinite' }} />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-7 mb-28">
                <div className="text-[3.5rem] animate-float drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                    🚢
                </div>

                <div className="text-center">
                    <h1 className="text-[2rem] font-extrabold tracking-tight text-gradient-primary mb-2"
                        style={{ backgroundSize: '200% auto', animation: 'shimmer 2.5s linear infinite' }}>
                        FloatChat
                    </h1>
                    <p className="text-[0.85rem] text-muted-foreground/60 tracking-wide">{message}</p>
                </div>

                {/* Dots */}
                <div className="flex gap-2 items-center">
                    {[0, 1, 2, 3, 4].map(i => (
                        <div
                            key={i}
                            className={`rounded-full ${i === 2 ? 'w-2.5 h-2.5 bg-primary shadow-[0_0_10px_hsla(193,100%,50%,0.6)]' : 'w-1.5 h-1.5 bg-primary/35'}`}
                            style={{ animation: `typing-dot 1.4s ease-in-out ${i * 0.15}s infinite` }}
                        />
                    ))}
                </div>
            </div>

            {/* Wave panel */}
            <div className="absolute bottom-0 left-0 right-0 h-[220px] overflow-hidden">
                {[
                    { delay: '0.4s', opacity: 0.06, dur: '5s' },
                    { delay: '0s', opacity: 0.10, dur: '6.5s' },
                    { delay: '0.8s', opacity: 0.18, dur: '4s', alt: true },
                ].map((w, i) => (
                    <div key={i} style={{
                        position: 'absolute', bottom: 0, left: '-50%', width: '200%', height: 160,
                        background: w.alt
                            ? 'linear-gradient(135deg, #0ea5e9, #6366f1)'
                            : 'linear-gradient(135deg, hsl(193,100%,50%), #3b82f6)',
                        borderRadius: '43% 57% 52% 48% / 30% 30% 70% 70%',
                        opacity: w.opacity,
                        transformOrigin: '50% 100%',
                        animation: `ocean-wave ${w.dur} ease-in-out ${w.delay} infinite alternate`,
                    }} />
                ))}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 70,
                    background: 'linear-gradient(to bottom, transparent, rgba(14,165,233,0.08))',
                }} />
            </div>

            <style>{`
                @keyframes ocean-wave {
                    0%   { transform: translateX(0) scaleY(1) rotate(0deg); }
                    50%  { transform: translateX(-8%) scaleY(1.12) rotate(1deg); }
                    100% { transform: translateX(-4%) scaleY(0.94) rotate(-1deg); }
                }
            `}</style>
        </div>
    )
}
