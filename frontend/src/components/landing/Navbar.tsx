import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 px-6 md:px-[8%] py-4 flex items-center justify-between glass-panel border-b border-border"
      style={{ background: "hsla(218, 78%, 10%, 0.85)", backdropFilter: "blur(20px)" }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">🌊</span>
        <span className="text-lg font-extrabold tracking-tight text-gradient-primary">
          FloatChat
        </span>
      </div>

      <div className="flex gap-3 items-center">
        <a
          href="https://github.com/HarxhPratyuxh/FloatChat-AI"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors text-sm hidden sm:block"
        >
          GitHub
        </a>
        <a
          href="#features"
          className="text-muted-foreground hover:text-foreground transition-colors text-sm hidden sm:block"
        >
          Features
        </a>
        <button
          onClick={() => navigate("/auth?tab=register")}
          className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Get Started
        </button>
      </div>
    </motion.nav>
  );
};

export default Navbar;
