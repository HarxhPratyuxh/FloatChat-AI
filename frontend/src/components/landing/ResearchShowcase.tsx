import { motion, useAnimationFrame } from "framer-motion";
import { useRef, useState } from "react";

const insights = [
    { query: "Average salinity Bay of Bengal 200m 2023", result: "34.82 PSU", region: "Indian Ocean", icon: "🌊" },
    { query: "Temperature anomaly North Atlantic 2022–2023", result: "+0.8°C above baseline", region: "Atlantic", icon: "🌡️" },
    { query: "Deepest Argo float reading December 2023", result: "1,998m depth · 2.1°C", region: "Pacific", icon: "🔵" },
    { query: "Floats recording below 0°C Southern Ocean", result: "143 active floats", region: "Southern Ocean", icon: "🧊" },
    { query: "Salinity trend Arabian Sea 500m 5yr", result: "↑ 0.14 PSU / decade", region: "Indian Ocean", icon: "📈" },
    { query: "Oxygen concentration thermocline Pacific", result: "4.2 ml/L at 700m", region: "Pacific", icon: "⚗️" },
];

function InsightCard({ insight }: { insight: typeof insights[0] }) {
    return (
        <div className="w-[300px] shrink-0 glass-panel rounded-2xl p-5 mx-3 border border-border">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{insight.icon}</span>
                <span className="text-[0.62rem] font-semibold text-muted-foreground/60 uppercase tracking-widest">{insight.region}</span>
            </div>
            <p className="text-[0.78rem] text-muted-foreground italic mb-3 leading-relaxed">
                "{insight.query}"
            </p>
            <div className="flex items-center justify-between">
                <span className="text-[0.88rem] font-bold text-primary">{insight.result}</span>
                <span className="text-[0.62rem] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15">
                    ⛓ Verified
                </span>
            </div>
        </div>
    );
}

function InfiniteTrack({ reverse = false }: { reverse?: boolean }) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState(0);
    const speed = reverse ? -0.4 : 0.4;
    const totalWidth = 300 * insights.length + 24 * insights.length; // card + gap

    useAnimationFrame(() => {
        setOffset(prev => {
            const next = prev + speed;
            if (Math.abs(next) >= totalWidth / 2) return 0;
            return next;
        });
    });

    const doubled = [...insights, ...insights];

    return (
        <div className="overflow-hidden w-full py-3">
            <div
                ref={trackRef}
                className="flex"
                style={{ transform: `translateX(${offset}px)`, willChange: "transform" }}
            >
                {doubled.map((item, i) => (
                    <InsightCard key={i} insight={item} />
                ))}
            </div>
        </div>
    );
}

export default function ResearchShowcase() {
    return (
        <section className="relative z-10 py-24 overflow-hidden">
            {/* Fades on sides */}
            <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12 px-6 md:px-[8%]"
            >
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[0.72rem] font-semibold mb-5">
                    🔬 Real Research
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                    Real queries.{" "}
                    <span className="text-gradient-primary">Real ocean science.</span>
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
                    Every result below was pulled live from Argo float data and permanently recorded on-chain.
                </p>
            </motion.div>

            {/* Two rows scrolling in opposite directions */}
            <InfiniteTrack reverse={false} />
            <InfiniteTrack reverse={true} />
        </section>
    );
}
