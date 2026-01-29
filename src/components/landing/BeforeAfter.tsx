import { motion } from "framer-motion";
import { useState } from "react";
import { XCircle, CheckCircle, ArrowRight, FileQuestion, Bell, AlertTriangle, FileCheck, BellRing, Shield } from "lucide-react";
import { FadeInView, StaggerContainer, StaggerItem } from "./animations";

interface ComparisonItemProps {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  type: "before" | "after";
}

const ComparisonItem = ({ icon: Icon, text, type }: ComparisonItemProps) => {
  const isBefore = type === "before";
  
  return (
    <div
      className={`flex items-center gap-4 p-6 bg-white border-l-2 ${
        isBefore 
          ? "border-red-200" 
          : "border-green-200"
      }`}
    >
      <Icon className={`w-5 h-5 ${isBefore ? "text-red-600" : "text-green-600"}`} />
      <span className={`font-normal ${isBefore ? "text-gray-700" : "text-gray-700"}`}>
        {text}
      </span>
    </div>
  );
};

export const BeforeAfter = () => {
  const [activeTab, setActiveTab] = useState<"before" | "after">("before");

  const beforeItems = [
    { icon: FileQuestion, text: "Scattered papers in glove box" },
    { icon: AlertTriangle, text: "Missed renewal deadlines" },
    { icon: XCircle, text: "Surprise fines & challans" },
  ];

  const afterItems = [
    { icon: FileCheck, text: "Everything in one secure place" },
    { icon: BellRing, text: "Smart reminders before expiry" },
    { icon: Shield, text: "Complete peace of mind" },
  ];

  return (
    <section className="py-16 md:py-24 bg-gray-50 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <FadeInView className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            There's a better way
          </h2>
          <p className="text-lg text-gray-600">
            See the difference VinDoc makes in managing your vehicle documents.
          </p>
        </FadeInView>

        {/* Mobile: Toggle tabs */}
        <div className="md:hidden mb-8">
          <div className="flex rounded-full bg-gray-100 p-1 max-w-xs mx-auto">
            <button
              onClick={() => setActiveTab("before")}
              className={`flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-all ${
                activeTab === "before"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              Without VinDoc
            </button>
            <button
              onClick={() => setActiveTab("after")}
              className={`flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-all ${
                activeTab === "after"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              With VinDoc
            </button>
          </div>
        </div>

        {/* Mobile: Single column with toggle */}
        <div className="md:hidden">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === "before" ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {(activeTab === "before" ? beforeItems : afterItems).map((item, index) => (
              <ComparisonItem 
                key={index} 
                icon={item.icon} 
                text={item.text} 
                type={activeTab} 
              />
            ))}
          </motion.div>
        </div>

        {/* Desktop: Two columns */}
        <div className="hidden md:grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Before column */}
          <div className="relative">
            <FadeInView direction="left" className="mb-6">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-xl font-semibold text-gray-900">Without VinDoc</h3>
              </div>
            </FadeInView>
            
            <StaggerContainer className="space-y-6" staggerDelay={0.15}>
              {beforeItems.map((item, index) => (
                <StaggerItem key={index}>
                  <ComparisonItem icon={item.icon} text={item.text} type="before" />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>

          {/* Arrow in the middle */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, type: "spring" }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex"
          >
            <ArrowRight className="w-6 h-6 text-gray-400" />
          </motion.div>

          {/* After column */}
          <div className="relative">
            <FadeInView direction="right" className="mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-900">With VinDoc</h3>
              </div>
            </FadeInView>
            
            <StaggerContainer className="space-y-6" staggerDelay={0.15} delay={0.2}>
              {afterItems.map((item, index) => (
                <StaggerItem key={index}>
                  <ComparisonItem icon={item.icon} text={item.text} type="after" />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </div>
    </section>
  );
};
