const Footer = () => {
  return (
    <footer className="relative z-10 border-t border-border">
      {/* Wave divider */}
      <div className="relative -mt-px overflow-hidden h-1">
        <div
          className="h-full bg-primary/20"
          style={{
            animation: "wave-flow 6s linear infinite",
            width: "200%",
          }}
        />
      </div>

      <div className="px-6 md:px-[8%] py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🌊</span>
              <span className="text-lg font-extrabold text-gradient-primary">FloatChat</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Conversational AI for the Ocean. Transforming Argo float data into human understanding.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Resources
            </h4>
            <ul className="space-y-2">
              {["GitHub", "Documentation", "About the Project", "Research Sources"].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-sm text-foreground/70 hover:text-primary transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Team */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Team
            </h4>
            <p className="text-sm text-foreground/70">Team Wavesena</p>
            <p className="text-xs text-muted-foreground mt-1">
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            © 2026 FloatChat · Built with ❤️ for ocean science
          </span>
          <span className="text-xs text-muted-foreground">
            Powered by Argo Float Network
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
