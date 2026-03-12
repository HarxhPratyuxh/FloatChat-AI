import { motion } from "framer-motion";
import { Brain, Compass, GitBranch, GraduationCap, Layers, Radio, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Ocean Intelligence",
    desc: "Ask natural language questions about ocean trends, currents, and temperature data. Powered by Groq streaming for instant answers.",
    accent: "text-cyan-400",
    bg: "bg-cyan-400/10 group-hover:bg-cyan-400/20 border-cyan-400/15",
  },
  {
    icon: Radio,
    title: "Real-Time Scientific Data",
    desc: "Powered by the global Argo float sensor network collecting millions of oceanographic measurements from every ocean basin.",
    accent: "text-blue-400",
    bg: "bg-blue-400/10 group-hover:bg-blue-400/20 border-blue-400/15",
  },
  {
    icon: Compass,
    title: "Interactive Exploration",
    desc: "Explore ocean regions, temperature anomalies, salinity trends and climate insights through intuitive conversation.",
    accent: "text-indigo-400",
    bg: "bg-indigo-400/10 group-hover:bg-indigo-400/20 border-indigo-400/15",
  },
  {
    icon: GraduationCap,
    title: "Research-Friendly",
    desc: "Designed for researchers, students, and climate scientists. Every query is blockchain-verified and independently citable.",
    accent: "text-violet-400",
    bg: "bg-violet-400/10 group-hover:bg-violet-400/20 border-violet-400/15",
  },
  {
    icon: Zap,
    title: "Groq-Powered Speed",
    desc: "Under 500ms inference time. Groq's LPU hardware ensures you never wait — answers stream in as fast as you can read.",
    accent: "text-yellow-400",
    bg: "bg-yellow-400/10 group-hover:bg-yellow-400/20 border-yellow-400/15",
  },
  {
    icon: Shield,
    title: "Blockchain-Notarized",
    desc: "SHA-256 hashes written to Polygon Amoy for every query. Your methodology is tamper-proof and publicly auditable forever.",
    accent: "text-purple-400",
    bg: "bg-purple-400/10 group-hover:bg-purple-400/20 border-purple-400/15",
  },
  {
    icon: Layers,
    title: "Intelligent SQL Generation",
    desc: "No query language needed. FloatChat translates plain English into optimized SQL tuned for the Argo data schema.",
    accent: "text-teal-400",
    bg: "bg-teal-400/10 group-hover:bg-teal-400/20 border-teal-400/15",
  },
  {
    icon: GitBranch,
    title: "Full Audit Trail",
    desc: "Every conversation is saved with timestamps, SQL generated, results, and blockchain TX. Nothing is ever lost or changed.",
    accent: "text-rose-400",
    bg: "bg-rose-400/10 group-hover:bg-rose-400/20 border-rose-400/15",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="relative z-10 px-6 md:px-[8%] py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[0.72rem] font-semibold mb-5">
          🌟 Features
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
          Everything a researcher needs.{" "}
          <span className="text-gradient-primary">Nothing they don't.</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
          FloatChat combines cutting-edge AI, live oceanographic data, and cryptographic verification into one seamless tool.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.07 }}
            whileHover={{ y: -4 }}
            className="glass-panel rounded-2xl p-6 transition-all duration-300 cursor-default group hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
          >
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 transition-colors ${f.bg}`}>
              <f.icon className={`w-5 h-5 ${f.accent}`} />
            </div>
            <h3 className="text-[0.88rem] font-bold mb-2 text-foreground">{f.title}</h3>
            <p className="text-[0.76rem] text-muted-foreground leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;
