import { motion } from "framer-motion";

const stats = [
  { value: "3.9B", label: "People depend on oceans" },
  { value: "4,000+", label: "Active Argo floats" },
  { value: "2M+", label: "Ocean profiles collected" },
  { value: "100%", label: "Open & verifiable data" },
];

const StatsSection = () => {
  return (
    <section className="relative z-10 px-6 md:px-[8%] py-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="text-center"
          >
            <p className="text-3xl md:text-4xl font-extrabold text-gradient-primary tracking-tight">
              {s.value}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default StatsSection;
