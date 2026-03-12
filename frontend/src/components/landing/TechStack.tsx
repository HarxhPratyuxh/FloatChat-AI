import { motion } from "framer-motion";

const technologies = [
    {
        name: "Groq",
        role: "AI Engine",
        desc: "Ultra-fast LLM inference powering natural language to SQL translation and answer generation.",
        icon: "⚡",
        color: "text-yellow-400",
        bg: "bg-yellow-400/10 border-yellow-400/20",
        stat: "< 500ms",
        statLabel: "inference time",
    },
    {
        name: "Argo Network",
        role: "Ocean Data",
        desc: "The global array of 4,000+ profiling floats collecting temperature, salinity and pressure data.",
        icon: "🌊",
        color: "text-cyan-400",
        bg: "bg-cyan-400/10 border-cyan-400/20",
        stat: "3.9B",
        statLabel: "data points",
    },
    {
        name: "Polygon",
        role: "Blockchain",
        desc: "Every query is immutably logged on Polygon Amoy testnet — cryptographically verifiable forever.",
        icon: "⛓️",
        color: "text-violet-400",
        bg: "bg-violet-400/10 border-violet-400/20",
        stat: "100%",
        statLabel: "on-chain verified",
    },
    {
        name: "Supabase",
        role: "Auth & Storage",
        desc: "Secure authentication and persistent chat history. Your research sessions, always recoverable.",
        icon: "🔐",
        color: "text-green-400",
        bg: "bg-green-400/10 border-green-400/20",
        stat: "E2E",
        statLabel: "encrypted",
    },
    {
        name: "FastAPI",
        role: "Backend",
        desc: "High-performance Python backend orchestrating the RAG pipeline, SQL generation and blockchain writes.",
        icon: "🐍",
        color: "text-blue-400",
        bg: "bg-blue-400/10 border-blue-400/20",
        stat: "RAG",
        statLabel: "pipeline",
    },
    {
        name: "React + Vite",
        role: "Frontend",
        desc: "Blazing-fast UI with real-time streaming responses and an Apple-inspired glassmorphism design.",
        icon: "⚛️",
        color: "text-sky-400",
        bg: "bg-sky-400/10 border-sky-400/20",
        stat: "HMR",
        statLabel: "hot updates",
    },
];

export default function TechStack() {
    return (
        <section className="relative z-10 px-6 md:px-[8%] py-24">
            {/* Background gradient blob */}
            <div
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[500px] pointer-events-none"
                style={{
                    background: "radial-gradient(ellipse 60% 60% at 50% 50%, hsla(193,100%,50%,0.04) 0%, transparent 70%)",
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-16 relative"
            >
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[0.72rem] font-semibold mb-5">
                    🏗️ Technology Stack
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                    Built on{" "}
                    <span className="text-gradient-primary">world-class infrastructure.</span>
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
                    Every component chosen for reliability, speed and scientific integrity.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto relative">
                {technologies.map((tech, i) => (
                    <motion.div
                        key={tech.name}
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.08 }}
                        whileHover={{ y: -5 }}
                        className="glass-panel rounded-2xl p-6 group cursor-default transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
                        style={{ borderColor: "hsl(var(--glass-border))" }}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-11 h-11 rounded-xl border flex items-center justify-center text-xl ${tech.bg}`}>
                                {tech.icon}
                            </div>
                            {/* Mini stat */}
                            <div className="text-right">
                                <p className={`text-[1rem] font-extrabold tracking-tight ${tech.color}`}>{tech.stat}</p>
                                <p className="text-[0.6rem] text-muted-foreground/50 uppercase tracking-widest">{tech.statLabel}</p>
                            </div>
                        </div>

                        <div className="mb-1">
                            <span className={`text-[0.62rem] font-bold uppercase tracking-widest ${tech.color} opacity-70`}>{tech.role}</span>
                        </div>
                        <h3 className="text-[1rem] font-bold text-foreground mb-2">{tech.name}</h3>
                        <p className="text-[0.78rem] text-muted-foreground leading-relaxed">{tech.desc}</p>

                        {/* Subtle bottom accent */}
                        <div className={`mt-5 h-0.5 rounded-full bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${tech.bg.replace('bg-', 'from-').replace('/10', '/30')} to-transparent`} />
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
