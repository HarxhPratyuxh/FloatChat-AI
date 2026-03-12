import { motion } from "framer-motion";

const steps = [
    {
        number: "01",
        icon: "💬",
        title: "Ask in Plain English",
        desc: "No SQL knowledge needed. Type your ocean science question exactly as you'd ask a colleague — FloatChat understands.",
        color: "from-cyan-500/20 to-blue-500/10",
        border: "border-cyan-500/20",
        glow: "hsla(193, 100%, 50%, 0.12)",
    },
    {
        number: "02",
        icon: "🤖",
        title: "AI Generates SQL",
        desc: "Groq's LLM instantly translates your question into a precise SQL query tuned for the Argo float schema.",
        color: "from-blue-500/20 to-indigo-500/10",
        border: "border-blue-500/20",
        glow: "hsla(218, 91%, 60%, 0.12)",
    },
    {
        number: "03",
        icon: "🗄️",
        title: "Queries Argo Database",
        desc: "Real oceanographic data from 4,000+ profiling floats — temperature, salinity, pressure — queried in milliseconds.",
        color: "from-indigo-500/20 to-violet-500/10",
        border: "border-indigo-500/20",
        glow: "hsla(243, 75%, 59%, 0.12)",
    },
    {
        number: "04",
        icon: "⛓️",
        title: "Blockchain Logged",
        desc: "The query, SQL, and results are hashed and written to Polygon Amoy. Your research is now immutably citable.",
        color: "from-violet-500/20 to-purple-500/10",
        border: "border-violet-500/20",
        glow: "hsla(263, 70%, 50%, 0.12)",
    },
    {
        number: "05",
        icon: "✅",
        title: "Answer Delivered",
        desc: "Streamed in real-time via Groq. With a blockchain TX hash you can cite in any research paper — forever.",
        color: "from-teal-500/20 to-cyan-500/10",
        border: "border-teal-500/20",
        glow: "hsla(172, 66%, 50%, 0.12)",
    },
];

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function HowItWorks() {
    return (
        <section className="relative z-10 px-6 md:px-[8%] py-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-16"
            >
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[0.72rem] font-semibold mb-5">
                    ⚡ How It Works
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
                    From question to verified answer{" "}
                    <span className="text-gradient-primary">in under 3 seconds.</span>
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
                    Five elegant steps. Zero friction. Complete scientific integrity.
                </p>
            </motion.div>

            {/* Step cards */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="relative max-w-5xl mx-auto"
            >
                {/* Connecting line (desktop) */}
                <div className="hidden lg:block absolute top-[52px] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                    {steps.map((step, i) => (
                        <motion.div
                            key={step.number}
                            variants={itemVariants}
                            className={`relative flex flex-col items-center text-center p-6 rounded-2xl bg-gradient-to-br ${step.color} border ${step.border} glass-panel-hover group cursor-default transition-all duration-300`}
                            style={{ boxShadow: `0 0 0 0 ${step.glow}` }}
                            whileHover={{ boxShadow: `0 0 30px ${step.glow}`, y: -4 }}
                        >
                            {/* Step number */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[0.6rem] font-black text-muted-foreground/40 tracking-widest">
                                {step.number}
                            </div>

                            {/* Icon circle */}
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 bg-gradient-to-br ${step.color} border ${step.border}`}>
                                {step.icon}
                            </div>

                            <h3 className="text-[0.88rem] font-bold text-foreground mb-2">{step.title}</h3>
                            <p className="text-[0.75rem] text-muted-foreground leading-relaxed">{step.desc}</p>

                            {/* Arrow between steps (desktop) — hidden on last */}
                            {i < steps.length - 1 && (
                                <div className="hidden lg:flex absolute -right-3 top-12 text-muted-foreground/30 text-sm z-10">
                                    →
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Bottom time badge */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="flex justify-center mt-10"
            >
                <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full glass-panel border border-primary/20">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[0.78rem] text-muted-foreground">
                        Average response time: <span className="text-primary font-semibold">2.4 seconds</span> · Blockchain confirmation: <span className="text-primary font-semibold">&lt;5 seconds</span>
                    </span>
                </div>
            </motion.div>
        </section>
    );
}
