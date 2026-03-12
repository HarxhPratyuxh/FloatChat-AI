import { motion } from "framer-motion";
import { useState } from "react";

const floatData = [
  { id: 1, x: "20%", temp: "22.4°C", salinity: "35.1 PSU", depth: "150m", location: "Pacific" },
  { id: 2, x: "45%", temp: "18.7°C", salinity: "34.8 PSU", depth: "320m", location: "Atlantic" },
  { id: 3, x: "72%", temp: "25.1°C", salinity: "35.6 PSU", depth: "80m", location: "Indian" },
];

const ArgoVisualization = () => {
  const [hoveredFloat, setHoveredFloat] = useState<number | null>(null);

  return (
    <section className="relative z-10 px-6 md:px-[8%] py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
          How Argo Floats <span className="text-gradient-primary">Explore the Deep</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
          Over 4,000 Argo floats continuously monitor the global ocean. FloatChat turns this
          massive stream of oceanographic data into simple conversations.
        </p>
      </motion.div>

      {/* Ocean Layer Visualization */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative max-w-3xl mx-auto h-[400px] rounded-2xl overflow-hidden glass-panel"
      >
        {/* Ocean layers */}
        <div className="absolute inset-0">
          {/* Surface */}
          <div
            className="absolute top-0 left-0 right-0 h-[30%]"
            style={{
              background: "linear-gradient(180deg, hsla(193, 100%, 50%, 0.08) 0%, hsla(207, 73%, 21%, 0.3) 100%)",
            }}
          >
            <div className="absolute bottom-0 left-0 right-0 h-px bg-primary/20" />
            <span className="absolute top-3 left-4 text-[10px] text-primary/60 font-medium uppercase tracking-widest">
              Surface · 0–200m
            </span>
          </div>

          {/* Mid depth */}
          <div
            className="absolute top-[30%] left-0 right-0 h-[35%]"
            style={{
              background: "linear-gradient(180deg, hsla(207, 73%, 21%, 0.3) 0%, hsla(218, 78%, 10%, 0.5) 100%)",
            }}
          >
            <div className="absolute bottom-0 left-0 right-0 h-px bg-primary/10" />
            <span className="absolute top-3 left-4 text-[10px] text-primary/40 font-medium uppercase tracking-widest">
              Mid-depth · 200–1000m
            </span>
          </div>

          {/* Deep */}
          <div
            className="absolute top-[65%] left-0 right-0 h-[35%]"
            style={{
              background: "linear-gradient(180deg, hsla(218, 78%, 10%, 0.5) 0%, hsla(218, 78%, 6%, 0.8) 100%)",
            }}
          >
            <span className="absolute top-3 left-4 text-[10px] text-primary/25 font-medium uppercase tracking-widest">
              Deep Ocean · 1000–2000m
            </span>
          </div>
        </div>

        {/* Floating devices */}
        {floatData.map((f, i) => (
          <motion.div
            key={f.id}
            className="absolute cursor-pointer"
            style={{ left: f.x, top: "25%" }}
            animate={{ y: [0, -20, 10, -15, 0] }}
            transition={{
              duration: 6 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            onMouseEnter={() => setHoveredFloat(f.id)}
            onMouseLeave={() => setHoveredFloat(null)}
          >
            {/* Float device */}
            <div
              className={`w-4 h-8 rounded-full transition-all duration-300 ${
                hoveredFloat === f.id ? "glow-cyan-strong bg-primary" : "bg-primary/60"
              }`}
            />

            {/* Data tooltip */}
            {hoveredFloat === f.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute left-6 top-0 glass-panel rounded-lg p-3 min-w-[160px] z-10"
              >
                <p className="text-[10px] text-primary font-semibold mb-2">{f.location} Ocean</p>
                <div className="space-y-1 text-[11px]">
                  <p className="text-foreground/80">🌡 Temp: <span className="text-primary">{f.temp}</span></p>
                  <p className="text-foreground/80">🧪 Salinity: <span className="text-accent">{f.salinity}</span></p>
                  <p className="text-foreground/80">📏 Depth: <span className="text-muted-foreground">{f.depth}</span></p>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}

        {/* Wave animation at top */}
        <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden">
          <div
            className="h-full bg-primary/30"
            style={{ animation: "wave-flow 4s linear infinite" }}
          />
        </div>
      </motion.div>
    </section>
  );
};

export default ArgoVisualization;
