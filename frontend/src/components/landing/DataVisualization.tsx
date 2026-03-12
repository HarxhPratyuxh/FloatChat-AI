import { motion } from "framer-motion";

const currentPaths = [
  "M0,120 Q150,80 300,130 T600,100 T900,140",
  "M0,180 Q200,150 400,190 T700,160 T900,200",
  "M0,240 Q100,220 250,250 T500,230 T900,260",
];

const DataVisualization = () => {
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
          Transforming ocean science into{" "}
          <span className="text-gradient-primary">human conversation.</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
          Visualize global ocean currents, temperature anomalies, and salinity
          patterns through an intelligent conversational layer.
        </p>
      </motion.div>

      {/* Ocean Current Map */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="max-w-4xl mx-auto glass-panel rounded-2xl p-8 relative overflow-hidden"
      >
        <svg
          viewBox="0 0 900 350"
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid */}
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`vg-${i}`}
              x1={i * 100}
              y1={0}
              x2={i * 100}
              y2={350}
              stroke="hsla(193, 100%, 50%, 0.05)"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={`hg-${i}`}
              x1={0}
              y1={i * 50}
              x2={900}
              y2={i * 50}
              stroke="hsla(193, 100%, 50%, 0.05)"
              strokeWidth={1}
            />
          ))}

          {/* Current paths */}
          {currentPaths.map((d, i) => (
            <g key={i}>
              <path
                d={d}
                fill="none"
                stroke="hsla(193, 100%, 50%, 0.15)"
                strokeWidth={2}
              />
              <path
                d={d}
                fill="none"
                stroke="hsla(193, 100%, 50%, 0.6)"
                strokeWidth={2}
                strokeDasharray="20 30"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="50"
                  to="0"
                  dur={`${3 + i}s`}
                  repeatCount="indefinite"
                />
              </path>
            </g>
          ))}

          {/* Data points */}
          {[
            { cx: 150, cy: 100, r: 4 },
            { cx: 320, cy: 140, r: 3 },
            { cx: 480, cy: 110, r: 5 },
            { cx: 620, cy: 170, r: 3 },
            { cx: 750, cy: 130, r: 4 },
            { cx: 200, cy: 220, r: 3 },
            { cx: 400, cy: 200, r: 4 },
            { cx: 550, cy: 250, r: 3 },
            { cx: 700, cy: 230, r: 5 },
          ].map((point, i) => (
            <g key={i}>
              <circle
                cx={point.cx}
                cy={point.cy}
                r={point.r}
                fill="hsl(193, 100%, 50%)"
                opacity={0.8}
              >
                <animate
                  attributeName="opacity"
                  values="0.4;1;0.4"
                  dur={`${2 + (i % 3)}s`}
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                cx={point.cx}
                cy={point.cy}
                r={point.r * 3}
                fill="none"
                stroke="hsl(193, 100%, 50%)"
                strokeWidth={0.5}
                opacity={0.2}
              >
                <animate
                  attributeName="r"
                  values={`${point.r * 2};${point.r * 4};${point.r * 2}`}
                  dur={`${3 + (i % 2)}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.3;0.1;0.3"
                  dur={`${3 + (i % 2)}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          ))}
        </svg>

        {/* Label overlays */}
        <div className="absolute top-4 right-4 flex gap-4 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Data Points
          </div>
          <div className="flex items-center gap-1">
            <span className="w-6 h-0.5 bg-primary/60" />
            Currents
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default DataVisualization;
