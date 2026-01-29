import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Lock,
  ArrowRight,
  ArrowLeft,
  Bell,
  FileText,
  FolderOpen,
  Smartphone,
  AlertTriangle,
  Clock,
  Search,
  CheckCircle,
  Car,
  Upload,
  Zap,
  Calendar,
  Users,
  Wrench,
  Globe,
  Mail,
  Store,
  UserCheck,
  BadgeCheck,
  HandCoins,
  ShieldCheck,
  ClipboardCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Access code for the presentation
const ACCESS_CODE = "vindoc46amg";

// Password Gate Component
const PasswordGate = ({ onAccessGranted }: { onAccessGranted: () => void }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.toLowerCase() === ACCESS_CODE) {
      sessionStorage.setItem("deck_access", "granted");
      onAccessGranted();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="bg-gray-900 p-2 rounded-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">VinDoc</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Private Presentation
          </h1>
          <p className="text-gray-600 text-sm">
            Enter the access code to view this deck
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Access code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`pl-10 h-11 border-gray-200 bg-white focus:border-gray-900 focus:ring-gray-900 ${
                error ? "border-red-500 focus:border-red-500" : ""
              }`}
              autoFocus
            />
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-sm text-center"
            >
              Invalid access code
            </motion.p>
          )}
          <Button
            type="submit"
            className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-sm font-medium"
          >
            View Presentation
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

// Slide Components
const TitleSlide = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <div className="inline-flex items-center gap-3 mb-8">
        <div className="bg-gray-900 p-3 rounded-lg">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <span className="text-4xl font-semibold text-gray-900">VinDoc</span>
      </div>
    </motion.div>
    <motion.h1
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="text-4xl md:text-5xl font-semibold text-gray-900 mb-6 max-w-3xl"
    >
      Your Vehicle Documents, Simplified
    </motion.h1>
    <motion.p
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="text-xl text-gray-600 mb-12 max-w-2xl"
    >
      One app to organize, track, and never miss a renewal
    </motion.p>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="flex items-center gap-2 text-gray-400 text-sm"
    >
      <Lock className="h-4 w-4" />
      <span>Private Investor Presentation</span>
    </motion.div>
  </div>
);

const ProblemSlide = () => {
  const problems = [
    {
      icon: AlertTriangle,
      title: "Scattered Documents",
      description: "Insurance in email, RC in a drawer, PUCC... somewhere",
    },
    {
      icon: Clock,
      title: "Missed Renewals",
      description: "Fines, legal issues, and last-minute scrambles",
    },
    {
      icon: Search,
      title: "Manual Tracking",
      description: "Spreadsheets, calendar reminders, mental notes",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <p className="text-gray-500 text-sm font-medium mb-3">THE PROBLEM</p>
        <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
          Vehicle documents are a mess
        </h2>
        <p className="text-gray-600 max-w-xl">
          Every vehicle owner deals with this. Multiple documents, different expiry dates, no single source of truth.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl w-full">
        {problems.map((problem, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            className="bg-white border border-gray-200 p-6 text-center"
          >
            <div className="w-12 h-12 border border-gray-200 flex items-center justify-center mx-auto mb-4">
              <problem.icon className="h-6 w-6 text-gray-900" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{problem.title}</h3>
            <p className="text-gray-600 text-sm">{problem.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const SolutionSlide = () => (
  <div className="flex flex-col items-center justify-center h-full px-8 bg-gray-900 text-white">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center max-w-3xl"
    >
      <p className="text-gray-400 text-sm font-medium mb-3">THE SOLUTION</p>
      <h2 className="text-3xl md:text-4xl font-semibold mb-6">
        VinDoc brings everything together
      </h2>
      <p className="text-gray-400 text-lg mb-12">
        A simple, beautiful app that stores all your vehicle documents and reminds you before anything expires.
      </p>

      <div className="grid md:grid-cols-3 gap-8 text-left">
        {[
          { icon: FolderOpen, text: "All documents in one place" },
          { icon: Bell, text: "Smart renewal reminders" },
          { icon: Smartphone, text: "Access from any device" },
        ].map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 border border-gray-700 flex items-center justify-center flex-shrink-0">
              <item.icon className="h-5 w-5 text-white" />
            </div>
            <span className="text-gray-300">{item.text}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  </div>
);

const FeaturesSlide = () => {
  const features = [
    {
      icon: Bell,
      title: "Smart Reminders",
      description: "Get notified before any document expires via email or push notification",
    },
    {
      icon: FolderOpen,
      title: "Document Storage",
      description: "Store photos of all your documents — insurance, RC, PUCC, fitness certificate",
    },
    {
      icon: Car,
      title: "Vehicle Profiles",
      description: "Create profiles for all your vehicles with complete document history",
    },
    {
      icon: Smartphone,
      title: "Multi-device Access",
      description: "Access your documents from your phone, tablet, or computer",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <p className="text-gray-500 text-sm font-medium mb-3">KEY FEATURES</p>
        <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">
          Everything you need
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl w-full">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
            className="bg-white border border-gray-200 p-6 flex gap-4"
          >
            <div className="w-12 h-12 border border-gray-900 flex items-center justify-center flex-shrink-0">
              <feature.icon className="h-6 w-6 text-gray-900" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const MarketplaceSlide = () => {
  const benefits = [
    {
      icon: Store,
      title: "Sell Direct to Community",
      description: "List your vehicle directly to VinDoc users — no middlemen, no agent fees",
    },
    {
      icon: BadgeCheck,
      title: "Verified Vehicle History",
      description: "Your complete document and service history builds instant buyer trust",
    },
    {
      icon: UserCheck,
      title: "VinDoc Expert Inspections",
      description: "Coming soon: Hire certified inspectors to verify any vehicle for a fee",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 bg-gray-900 text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <p className="text-gray-400 text-sm font-medium mb-3">MARKETPLACE</p>
        <h2 className="text-3xl md:text-4xl font-semibold mb-4">
          Sell your car. Skip the agents.
        </h2>
        <p className="text-gray-400 max-w-2xl">
          The VinDoc marketplace connects verified sellers with trusted buyers. 
          Your documented history is your selling advantage.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full">
        {benefits.map((benefit, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            className="border border-gray-700 p-6 text-center"
          >
            <div className="w-14 h-14 border border-gray-600 flex items-center justify-center mx-auto mb-4">
              <benefit.icon className="h-7 w-7 text-white" />
            </div>
            <h3 className="font-semibold text-white mb-2">{benefit.title}</h3>
            <p className="text-gray-400 text-sm">{benefit.description}</p>
            {benefit.title.includes("Coming soon") || index === 2 ? (
              <span className="inline-block mt-3 text-xs bg-gray-800 text-gray-400 px-2 py-1 border border-gray-700">
                Coming Soon
              </span>
            ) : null}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-12 flex items-center gap-8 text-gray-500 text-sm"
      >
        <div className="flex items-center gap-2">
          <HandCoins className="h-4 w-4" />
          <span>No listing fees</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          <span>Verified profiles</span>
        </div>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          <span>Complete history</span>
        </div>
      </motion.div>
    </div>
  );
};

const HowItWorksSlide = () => {
  const steps = [
    {
      number: "01",
      icon: Car,
      title: "Add Your Vehicle",
      description: "Enter your vehicle registration number to create a profile",
    },
    {
      number: "02",
      icon: Upload,
      title: "Upload Documents",
      description: "Take photos of your documents — we'll organize them for you",
    },
    {
      number: "03",
      icon: Bell,
      title: "Get Reminders",
      description: "Receive timely notifications before anything expires",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <p className="text-gray-500 text-sm font-medium mb-3">HOW IT WORKS</p>
        <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">
          Simple as 1-2-3
        </h2>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-8 max-w-4xl w-full">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.15 }}
            className="flex-1 text-center"
          >
            <div className="relative mb-6">
              <div className="w-16 h-16 border-2 border-gray-900 flex items-center justify-center mx-auto">
                <step.icon className="h-7 w-7 text-gray-900" />
              </div>
              <span className="absolute -top-2 -right-2 md:right-auto md:-left-2 bg-gray-900 text-white text-xs font-bold px-2 py-1">
                {step.number}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
            <p className="text-gray-600 text-sm">{step.description}</p>
            {index < steps.length - 1 && (
              <div className="hidden md:block absolute top-8 left-full w-full">
                <ArrowRight className="h-6 w-6 text-gray-300 mx-auto" />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const RoadmapSlide = () => {
  const roadmapItems = [
    {
      phase: "Now",
      status: "current",
      items: [
        { icon: FolderOpen, text: "Document storage" },
        { icon: Bell, text: "Email reminders" },
        { icon: Car, text: "Vehicle profiles" },
      ],
    },
    {
      phase: "Next",
      status: "planned",
      items: [
        { icon: Store, text: "VinDoc Marketplace" },
        { icon: UserCheck, text: "Expert inspections" },
        { icon: BadgeCheck, text: "Verified seller badges" },
      ],
    },
    {
      phase: "Future",
      status: "vision",
      items: [
        { icon: Zap, text: "Document scanning (OCR)" },
        { icon: Wrench, text: "Service center integration" },
        { icon: Globe, text: "Pan-India coverage" },
      ],
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <p className="text-gray-500 text-sm font-medium mb-3">ROADMAP</p>
        <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">
          Where we're headed
        </h2>
        <p className="text-gray-600 max-w-xl">
          Our vision is to become the complete vehicle ownership companion
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full">
        {roadmapItems.map((phase, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            className={`p-6 border ${
              phase.status === "current" 
                ? "border-gray-900 bg-gray-50" 
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-sm font-semibold ${
                phase.status === "current" ? "text-gray-900" : "text-gray-500"
              }`}>
                {phase.phase}
              </span>
              {phase.status === "current" && (
                <span className="text-xs bg-gray-900 text-white px-2 py-0.5">
                  Building
                </span>
              )}
            </div>
            <div className="space-y-3">
              {phase.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <item.icon className={`h-4 w-4 ${
                    phase.status === "current" ? "text-gray-900" : "text-gray-400"
                  }`} />
                  <span className={`text-sm ${
                    phase.status === "current" ? "text-gray-900" : "text-gray-600"
                  }`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const CTASlide = () => (
  <div className="flex flex-col items-center justify-center h-full px-8 bg-gray-900 text-white">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center max-w-2xl"
    >
      <div className="inline-flex items-center gap-3 mb-8">
        <div className="bg-white p-2 rounded-lg">
          <Shield className="h-6 w-6 text-gray-900" />
        </div>
        <span className="text-2xl font-semibold">VinDoc</span>
      </div>
      
      <h2 className="text-3xl md:text-4xl font-semibold mb-6">
        Let's build the future of vehicle ownership together
      </h2>
      
      <p className="text-gray-400 text-lg mb-10">
        We're looking for early users and investors who share our vision of simplifying vehicle document management for millions of vehicle owners.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <div className="flex items-center gap-2 text-gray-300">
          <Mail className="h-5 w-5" />
          <span>hello@vindoc.in</span>
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-gray-500 text-sm"
      >
        Thank you for your time
      </motion.p>
    </motion.div>
  </div>
);

// Main Deck Component
const Deck = () => {
  const [hasAccess, setHasAccess] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    { id: "title", component: TitleSlide, bg: "bg-white" },
    { id: "problem", component: ProblemSlide, bg: "bg-gray-50" },
    { id: "solution", component: SolutionSlide, bg: "bg-gray-900" },
    { id: "features", component: FeaturesSlide, bg: "bg-white" },
    { id: "marketplace", component: MarketplaceSlide, bg: "bg-gray-900" },
    { id: "how-it-works", component: HowItWorksSlide, bg: "bg-gray-50" },
    { id: "roadmap", component: RoadmapSlide, bg: "bg-white" },
    { id: "cta", component: CTASlide, bg: "bg-gray-900" },
  ];

  const totalSlides = slides.length;

  // Check for existing access on mount
  useEffect(() => {
    const access = sessionStorage.getItem("deck_access");
    if (access === "granted") {
      setHasAccess(true);
    }
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setCurrentSlide((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Escape") {
      sessionStorage.removeItem("deck_access");
      setHasAccess(false);
    }
  }, [totalSlides]);

  useEffect(() => {
    if (hasAccess) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [hasAccess, handleKeyDown]);

  if (!hasAccess) {
    return <PasswordGate onAccessGranted={() => setHasAccess(true)} />;
  }

  const CurrentSlideComponent = slides[currentSlide].component;

  return (
    <div className={`min-h-screen ${slides[currentSlide].bg} relative overflow-hidden`}>
      {/* Slide Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="h-screen"
        >
          <CurrentSlideComponent />
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      <div className="fixed inset-y-0 left-0 flex items-center p-4">
        <button
          onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
          disabled={currentSlide === 0}
          className={`w-12 h-12 flex items-center justify-center border transition-all ${
            slides[currentSlide].bg === "bg-gray-900"
              ? "border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 disabled:opacity-30"
              : "border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-300 disabled:opacity-30"
          }`}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="fixed inset-y-0 right-0 flex items-center p-4">
        <button
          onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1))}
          disabled={currentSlide === totalSlides - 1}
          className={`w-12 h-12 flex items-center justify-center border transition-all ${
            slides[currentSlide].bg === "bg-gray-900"
              ? "border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 disabled:opacity-30"
              : "border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-300 disabled:opacity-30"
          }`}
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>

      {/* Progress Dots */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlide
                ? slides[currentSlide].bg === "bg-gray-900"
                  ? "bg-white w-6"
                  : "bg-gray-900 w-6"
                : slides[currentSlide].bg === "bg-gray-900"
                  ? "bg-gray-600 hover:bg-gray-500"
                  : "bg-gray-300 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>

      {/* Slide Counter */}
      <div className={`fixed bottom-6 right-6 text-sm font-medium ${
        slides[currentSlide].bg === "bg-gray-900" ? "text-gray-500" : "text-gray-400"
      }`}>
        {currentSlide + 1} / {totalSlides}
      </div>

      {/* Keyboard Hint */}
      <div className={`fixed bottom-6 left-6 text-xs ${
        slides[currentSlide].bg === "bg-gray-900" ? "text-gray-600" : "text-gray-400"
      }`}>
        Use arrow keys to navigate · Esc to exit
      </div>
    </div>
  );
};

export default Deck;
