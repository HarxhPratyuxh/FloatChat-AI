import ArgoVisualization from "@/components/landing/ArgoVisualization";
import BlockchainTrust from "@/components/landing/BlockchainTrust";
import CtaSection from "@/components/landing/CtaSection";
import DataVisualization from "@/components/landing/DataVisualization";
import FeaturesSection from "@/components/landing/FeaturesSection";
import Footer from "@/components/landing/Footer";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import LaunchPopup from "@/components/landing/LaunchPopup";
import Navbar from "@/components/landing/Navbar";
import ParticleField from "@/components/landing/ParticleField";
import ResearchShowcase from "@/components/landing/ResearchShowcase";
import StatsSection from "@/components/landing/StatsSection";
import TechStack from "@/components/landing/TechStack";

/** Thin gradient rule between major sections */
const Divider = () => (
  <div className="relative mx-[8%] my-2">
    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <ParticleField />
      <Navbar />
      <HeroSection />
      <StatsSection />
      <Divider />
      <HowItWorks />
      <Divider />
      <ArgoVisualization />
      <Divider />
      <FeaturesSection />
      <Divider />
      <ResearchShowcase />
      <Divider />
      <DataVisualization />
      <Divider />
      <BlockchainTrust />
      <Divider />
      <TechStack />
      <Divider />
      <CtaSection />
      <Footer />
      <LaunchPopup />
    </div>
  );
};

export default Index;
