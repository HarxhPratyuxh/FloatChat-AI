import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const FAKE_HASH = "0x3a9f...c4d2";
const FAKE_AUDIT = "sha256:e4b2a9...7f1c";

function AnimatedHash() {
    const chars = "0123456789abcdef";
    const [hash, setHash] = useState("0x" + "?".repeat(62));

    useEffect(() => {
        const target = "0x3a9f7c2b1d8e6a04fe29c0573b81dd94a5ef261038749c6d07be51f2c4d293ab";
        let i = 2;
        const interval = setInterval(() => {
            if (i > target.length) { clearInterval(interval); return; }
            setHash(target.slice(0, i) + Array.from({ length: target.length - i }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
            i++;
        }, 35);
        return () => clearInterval(interval);
    }, []);

    return (
        <code className="text-[0.65rem] text-violet-300 font-mono break-all leading-relaxed tracking-wide">
            {hash}
        </code>
    );
}

const trustPoints = [
    { icon: "🔒", title: "Tamper-proof", desc: "SHA-256 hash of query + SQL + results written on-chain. Any alteration is instantly detectable." },
    { icon: "🌍", title: "Globally verifiable", desc: "Anyone with the TX hash can independently verify your research on Polygon's public explorer." },
    { icon: "📄", title: "Citable in papers", desc: "Include the PolygonScan URL as a citation. Peer reviewers can verify your data source directly." },
    { icon: "♾️", title: "Permanent record", desc: "Blockchain transactions are immutable — your research audit trail exists as long as the chain does." },
];

export default function BlockchainTrust() {
    const [inView, setInView] = useState(false);

    return (
        <section className="relative z-10 px-6 md:px-[8%] py-24 overflow-hidden">
            {/* Purple ambient glow */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none"
                style={{ background: "radial-gradient(ellipse 80% 80% at 50% 50%, hsla(270,80%,40%,0.07) 0%, transparent 70%)" }}
            />

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                {/* Left — copy */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                >
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[0.72rem] font-semibold mb-6">
                        ⛓️ Blockchain Trust
                    </span>
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-5">
                        Science that can{" "}
                        <span className="text-gradient-primary">never be disputed.</span>
                    </h2>
                    <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-10">
                        FloatChat is the first ocean research tool where every query is cryptographically
                        notarized. Publish with complete confidence — your methodology is publicly verifiable,
                        forever.
                    </p>

                    <div className="flex flex-col gap-5">
                        {trustPoints.map((p, i) => (
                            <motion.div
                                key={p.title}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="flex gap-4 items-start"
                            >
                                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-lg shrink-0">
                                    {p.icon}
                                </div>
                                <div>
                                    <h4 className="text-[0.9rem] font-bold text-foreground mb-0.5">{p.title}</h4>
                                    <p className="text-[0.78rem] text-muted-foreground leading-relaxed">{p.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Right — animated certificate card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0, transitionEnd: { setInView: () => setInView(true) } }}
                    onViewportEnter={() => setInView(true)}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div className="relative rounded-2xl overflow-hidden border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] to-blue-500/[0.06] p-6 shadow-[0_0_60px_hsla(270,80%,40%,0.12)]">

                        {/* Glow top line */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />

                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2.5">
                                <span className="text-xl" style={{ animation: "pulse-glow 2.5s ease infinite" }}>⛓️</span>
                                <div>
                                    <p className="text-[0.7rem] font-black text-violet-300 uppercase tracking-widest">On-Chain Certificate</p>
                                    <p className="text-[0.6rem] text-muted-foreground/50">Polygon Amoy Testnet</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]" style={{ animation: "pulse-glow 2s ease infinite" }} />
                                <span className="text-[0.65rem] font-semibold text-green-400">Confirmed</span>
                            </div>
                        </div>

                        {/* Query box */}
                        <div className="rounded-xl bg-black/20 border border-white/5 p-4 mb-4">
                            <p className="text-[0.62rem] text-muted-foreground/50 uppercase tracking-widest mb-2 font-semibold">Research Query</p>
                            <p className="text-[0.85rem] text-foreground font-medium italic">
                                "What is the average salinity at 500m depth in the Indian Ocean for 2023?"
                            </p>
                        </div>

                        {/* Answer box */}
                        <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 mb-4">
                            <p className="text-[0.62rem] text-muted-foreground/50 uppercase tracking-widest mb-2 font-semibold">Result</p>
                            <p className="text-[0.88rem] text-primary font-bold">34.82 PSU</p>
                            <p className="text-[0.7rem] text-muted-foreground mt-1">Based on 1,247 Argo float profiles</p>
                        </div>

                        {/* TX Hash */}
                        <div className="rounded-xl bg-black/20 border border-violet-500/15 p-4 mb-4">
                            <p className="text-[0.62rem] text-muted-foreground/50 uppercase tracking-widest mb-2 font-semibold">Transaction Hash</p>
                            {inView ? <AnimatedHash /> : <code className="text-[0.65rem] text-violet-300 font-mono">Initializing…</code>}
                        </div>

                        {/* Timestamp + explorer link */}
                        <div className="flex items-center justify-between">
                            <span className="text-[0.65rem] text-muted-foreground/50">
                                {new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })} UTC
                            </span>
                            <a
                                href="https://amoy.polygonscan.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[0.68rem] font-semibold text-indigo-400 border border-indigo-400/20 bg-indigo-400/8 px-2.5 py-1 rounded-full hover:bg-indigo-400/18 transition-colors"
                            >
                                View on Explorer ↗
                            </a>
                        </div>

                        {/* Bottom glow */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />
                    </div>

                    {/* Floating badges */}
                    <div className="flex gap-3 mt-4 justify-center flex-wrap">
                        {["SHA-256 Auditable", "Polygon L2", "ERC-compatible", "Open Verification"].map(tag => (
                            <span key={tag} className="text-[0.65rem] text-muted-foreground px-3 py-1 rounded-full border border-border glass-panel">
                                {tag}
                            </span>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
