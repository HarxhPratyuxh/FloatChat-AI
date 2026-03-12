import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

/* ─────────────────────────────────────────────────────────────
   LaunchPopup — "We are proud" V1 launch announcement
   Shows once per session (dismissed = stored in sessionStorage)
───────────────────────────────────────────────────────────── */

const REGIONS = [
    { name: "Indian Ocean", emoji: "🌊", desc: "2.3M+ profiles" },
    { name: "Arabian Sea", emoji: "🌀", desc: "890K+ profiles" },
    { name: "Bay of Bengal", emoji: "🔵", desc: "640K+ profiles" },
];

export default function LaunchPopup() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(t);
    }, []);

    const dismiss = () => {
        setVisible(false);
    };

    return (
        <AnimatePresence>
            {visible && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={dismiss}
                        className="fixed inset-0 z-[9000] bg-black/60 backdrop-blur-md"
                    />

                    {/* Card */}
                    <motion.div
                        key="card"
                        initial={{ opacity: 0, scale: 0.88, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 20 }}
                        transition={{ type: "spring", damping: 22, stiffness: 280 }}
                        className="fixed inset-0 z-[9001] flex items-center justify-center p-5 pointer-events-none"
                    >
                        <div className="pointer-events-auto w-full max-w-[480px] relative overflow-hidden rounded-3xl border border-white/10 bg-[hsl(218,78%,9%)] shadow-[0_0_100px_hsla(193,100%,50%,0.1),0_30px_80px_rgba(0,0,0,0.6)]">

                            {/* Indian flag stripe — saffron, white, green */}
                            <div className="flex h-1.5 w-full">
                                <div className="flex-1 bg-[#FF9933]" />
                                <div className="flex-1 bg-white/80" />
                                <div className="flex-1 bg-[#138808]" />
                            </div>

                            {/* Glow top line */}
                            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                            <div className="px-8 pt-8 pb-7">

                                {/* Emoji + badge row */}
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="text-4xl animate-float">🇮🇳</div>
                                    <div>
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[0.65rem] font-black uppercase tracking-widest">
                                            ⚡ Launch Announcement
                                        </span>
                                    </div>
                                </div>

                                {/* Headline */}
                                <h2 className="text-[1.75rem] font-extrabold tracking-tight leading-tight mb-2">
                                    We are{" "}
                                    <span className="text-gradient-primary">proud</span>
                                    <span className="ml-2">🎉</span>
                                </h2>
                                <p className="text-[1rem] font-semibold text-foreground/80 mb-1">
                                    FloatChat <span className="text-primary">V1</span> is officially live for India.
                                </p>
                                <p className="text-[0.83rem] text-muted-foreground leading-relaxed mb-7">
                                    Real Argo float data covering India's surrounding waters is now queryable
                                    in plain English — AI-powered, SQL-backed, and blockchain-verified.
                                </p>

                                {/* Region cards */}
                                <div className="grid grid-cols-3 gap-3 mb-7">
                                    {REGIONS.map((r, i) => (
                                        <motion.div
                                            key={r.name}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 + i * 0.1 }}
                                            className="flex flex-col items-center text-center p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.07]"
                                        >
                                            <span className="text-2xl mb-2">{r.emoji}</span>
                                            <p className="text-[0.72rem] font-bold text-foreground leading-tight mb-0.5">{r.name}</p>
                                            <p className="text-[0.6rem] text-primary font-semibold">{r.desc}</p>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Team credit */}
                                <div className="flex items-center gap-2 mb-6 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <span className="text-lg">🌊</span>
                                    <div>
                                        <p className="text-[0.75rem] font-bold text-foreground">Team Wavesena</p>
                                        <p className="text-[0.65rem] text-muted-foreground">Bridging ocean science and blockchain, one float at a time.</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={dismiss}
                                        className="flex-1 py-3 rounded-xl text-[0.85rem] font-bold bg-gradient-to-r from-primary to-accent text-background hover:-translate-y-0.5 hover:shadow-[0_8px_28px_hsla(193,100%,50%,0.3)] transition-all duration-200"
                                    >
                                        Start Researching 🚀
                                    </button>
                                    <button
                                        onClick={dismiss}
                                        className="px-4 py-3 rounded-xl text-[0.83rem] text-muted-foreground border border-border hover:bg-white/[0.05] hover:text-foreground transition-all duration-200"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Bottom glow */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
