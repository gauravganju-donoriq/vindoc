import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, AlertCircle, ArrowRight, Plus, Bell } from "lucide-react";
import { AnimatedText } from "./animations";

export const Navbar = () => {
  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200"
    >
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="bg-gray-900 p-2 rounded-lg">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-[22px] font-semibold text-gray-900 tracking-tight">VinDoc</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link 
            to="/auth" 
            className="text-sm font-normal text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
          >
            Login
          </Link>
          <Button size="sm" asChild className="rounded-full px-5 h-10 text-sm font-medium bg-gray-900 hover:bg-gray-800 border border-gray-900">
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </div>
    </motion.header>
  );
};

// Vehicle status card component - Platform Preview
const VehicleCard = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="relative w-full max-w-md mx-auto"
    >
      <div className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Mini app header */}
        <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-white" />
            <span className="text-sm font-medium text-white">VinDoc</span>
          </div>
          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
            <span className="text-[10px] text-white font-medium">U</span>
          </div>
        </div>

        {/* Vehicle info */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <span className="text-gray-900 font-bold text-sm">MH</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">MH 02 AB 1234</p>
                <p className="text-xs text-gray-500">Honda City 2022</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
              Active
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-4 flex gap-6 border-b border-gray-100">
          <button className="pb-3 text-sm font-medium text-gray-900 border-b-2 border-gray-900">
            Documents (4)
          </button>
          <button className="pb-3 text-sm font-medium text-gray-400 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            Reminders (1)
          </button>
        </div>

        {/* Document statuses */}
        <div className="p-5 space-y-3">
          <DocumentStatus 
            name="Insurance" 
            status="valid" 
            date="Dec 2026" 
            delay={0.8}
          />
          <DocumentStatus 
            name="PUCC" 
            status="warning" 
            date="7 days left" 
            delay={0.9}
          />
          <DocumentStatus 
            name="Registration" 
            status="valid" 
            date="2034" 
            delay={1.0}
          />
          <DocumentStatus 
            name="Fitness" 
            status="valid" 
            date="2028" 
            delay={1.1}
          />
        </div>

        {/* Action footer */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            <Plus className="w-4 h-4" />
            Add Document
          </button>
        </div>
      </div>
    </motion.div>
  );
};

interface DocumentStatusProps {
  name: string;
  status: "valid" | "warning" | "expired";
  date: string;
  delay: number;
}

const DocumentStatus = ({ name, status, date, delay }: DocumentStatusProps) => {
  const statusConfig = {
    valid: { 
      icon: CheckCircle, 
      color: "text-green-600", 
      bgColor: "bg-white",
      borderColor: ""
    },
    warning: { 
      icon: AlertCircle, 
      color: "text-amber-600", 
      bgColor: "bg-amber-50",
      borderColor: "border border-amber-100"
    },
    expired: { 
      icon: AlertCircle, 
      color: "text-red-600", 
      bgColor: "bg-red-50",
      borderColor: "border border-red-100"
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${config.bgColor} ${config.borderColor}`}
    >
      <div className="flex items-center gap-2.5">
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className="font-medium text-gray-900 text-sm">{name}</span>
      </div>
      <span className={`text-xs ${config.color}`}>{date}</span>
    </motion.div>
  );
};


export const HeroSection = () => {
  const headlines = [
    "Never miss a renewal.",
    "Never pay a fine.",
    "Never lose a document.",
  ];

  return (
    <section className="relative pt-28 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-white">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Headlines */}
          <div className="text-center lg:text-left">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[15px] text-gray-600 mb-6"
            >
              Your vehicle documents, simplified
            </motion.p>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-gray-900 leading-[1.15] tracking-tight mb-8">
              {headlines.map((line, index) => (
                <span key={index} className="block">
                  <AnimatedText text={line} delay={0.1 + index * 0.3} />
                </span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-lg mx-auto lg:mx-0 mb-8"
            >
              The smartest way to manage your vehicle documents. Upload once, get reminded forever.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Button size="default" asChild className="rounded-full px-6 h-12 text-sm bg-gray-900 hover:bg-gray-800 border border-gray-900 group">
                <Link to="/auth">
                  Start Free — No card required
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button 
                size="default" 
                asChild 
                className="rounded-full px-6 h-12 text-sm text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-200"
              >
                <a href="#how-it-works">See how it works</a>
              </Button>
            </motion.div>
          </div>

          {/* Right: Vehicle Card */}
          <div className="relative">
            <VehicleCard />
          </div>
        </div>
      </div>
    </section>
  );
};
