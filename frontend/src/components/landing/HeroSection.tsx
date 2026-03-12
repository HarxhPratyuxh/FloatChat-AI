import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();
  const [showResponse, setShowResponse] = useState(false);
  const [typedText, setTypedText] = useState("");
  const fullResponse = "Surface temperature in the Pacific has increased by 0.6°C over the past decade based on Argo float data.";

  useEffect(() => {
    const timer = setTimeout(() => setShowResponse(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showResponse) return;
    let i = 0;
    const interval = setInterval(() => {
      setTypedText(fullResponse.slice(0, i + 1));
      i++;
      if (i >= fullResponse.length) clearInterval(interval);
    }, 25);
    return () => clearInterval(interval);
  }, [showResponse]);

  return (
    <section className="relative z-10 px-6 md:px-[8%] pt-24 md:pt-32 pb-20 flex flex-col items-center text-center gap-7">
      {/* Tag */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium border border-primary/30 bg-primary/10 text-primary"
      >
        <span className="animate-pulse-glow">●</span>
        Powered by 4,000+ Argo Floats Worldwide
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.05]"
      >
        Talk to the{" "}
        <span className="text-gradient-primary">Ocean.</span>
      </motion.h1>

      {/* Sub */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed"
      >
        FloatChat transforms global ocean sensor data into natural conversations
        powered by AI. Every query is verified on-chain.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex gap-3 flex-wrap justify-center"
      >
        <button
          onClick={() => navigate("/auth?tab=register")}
          className="bg-primary text-primary-foreground px-8 py-3.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all glow-cyan"
        >
          Start Researching →
        </button>
        <button className="border border-border text-foreground px-8 py-3.5 rounded-xl text-sm font-medium hover:bg-secondary transition-all">
          View Documentation
        </button>
      </motion.div>

      {/* Chat Demo */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5 }}
        className="mt-8 w-full max-w-2xl glass-panel rounded-2xl p-6 text-left"
      >
        {/* User message */}
        <div className="flex gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs shrink-0">
            🧑‍🔬
          </div>
          <div className="bg-secondary rounded-2xl rounded-tl-md px-4 py-3 text-sm text-foreground">
            Ask about ocean temperature trends in the Pacific...
          </div>
        </div>

        {/* AI response */}
        {showResponse && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs shrink-0">
              🌊
            </div>
            <div className="flex-1">
              <div className="bg-ocean-mid/60 rounded-2xl rounded-tl-md px-4 py-3 text-sm text-foreground/90 leading-relaxed">
                {typedText}
                {typedText.length < fullResponse.length && (
                  <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary/30 text-primary">
                  ⛓ Verified · 0x2a7f…c391
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-accent/30 text-accent">
                  147 profiles analyzed
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
};

export default HeroSection;
