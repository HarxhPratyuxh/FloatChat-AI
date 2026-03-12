import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const CtaSection = () => {
  const navigate = useNavigate();
  return (
    <section className="relative z-10 px-6 md:px-[8%] py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="glass-panel rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 0%, hsla(193, 100%, 50%, 0.08) 0%, transparent 70%)",
          }}
        />

        <p className="text-primary text-sm font-semibold mb-3 relative z-10">Ready to start?</p>
        <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-4 relative z-10">
          The data exists. The question is:{" "}
          <span className="text-gradient-primary">Can you ask it?</span>
        </h2>
        <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto mb-8 relative z-10">
          Join FloatChat and start querying Argo ocean data in plain English — results
          on-chain in seconds.
        </p>
        <button
          onClick={() => navigate("/auth?tab=register")}
          className="relative z-10 bg-primary text-primary-foreground px-10 py-4 rounded-xl text-sm font-bold hover:opacity-90 transition-all glow-cyan"
        >
          Create Free Account →
        </button>
      </motion.div>
    </section>
  );
};

export default CtaSection;
