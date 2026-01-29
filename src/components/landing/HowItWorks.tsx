import { motion } from "framer-motion";
import { useRef } from "react";
import { Search, Camera, CheckCircle2 } from "lucide-react";
import { FadeInView } from "./animations";

interface Step {
  number: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

const steps: Step[] = [
  {
    number: "01",
    title: "Enter your vehicle number",
    description: "Just type in your registration number to create your vehicle profile.",
    icon: Search,
    color: "text-gray-900",
    bgColor: ""
  },
  {
    number: "02",
    title: "Snap your documents",
    description: "Take photos of your insurance, RC, PUCC, and other papers. Our AI reads and extracts all the details instantly.",
    icon: Camera,
    color: "text-gray-900",
    bgColor: ""
  },
  {
    number: "03",
    title: "You're all set",
    description: "That's it. We organize everything and set up smart reminders. You'll never miss a renewal deadline again.",
    icon: CheckCircle2,
    color: "text-gray-900",
    bgColor: ""
  }
];

const TimelineStep = ({ step, index, isLast }: { step: Step; index: number; isLast: boolean }) => {
  const Icon = step.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay: index * 0.2 }}
      className="relative flex gap-8"
    >
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: index * 0.2 + 0.2, type: "spring" }}
          className="relative z-10 w-14 h-14 border-2 border-gray-900 bg-white flex items-center justify-center"
        >
          <Icon className={`w-6 h-6 ${step.color}`} />
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">
            {step.number}
          </div>
        </motion.div>
        
        {/* Connecting line */}
        {!isLast && (
          <motion.div
            initial={{ height: 0 }}
            whileInView={{ height: "100%" }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.2 + 0.3 }}
            className="w-px bg-gray-200 flex-1 mt-4"
          />
        )}
      </div>

      {/* Content */}
      <div className={`pb-16 ${isLast ? "pb-0" : ""}`}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: index * 0.2 + 0.3 }}
          className="bg-white rounded-3xl p-8 border border-gray-200"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {step.title}
          </h3>
          <p className="text-gray-600 leading-relaxed">
            {step.description}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export const HowItWorks = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <section id="how-it-works" ref={containerRef} className="py-16 md:py-24 bg-white relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <FadeInView className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-sm text-gray-600 mb-8">
            Takes less than 60 seconds
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Get started in three simple steps
          </h2>
          <p className="text-lg text-gray-600">
            No complicated setup. No manual data entry. Just snap, upload, and relax.
          </p>
        </FadeInView>

        <div className="max-w-2xl mx-auto">
          {steps.map((step, index) => (
            <TimelineStep 
              key={index} 
              step={step} 
              index={index} 
              isLast={index === steps.length - 1} 
            />
          ))}
        </div>

        {/* Completion celebration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="max-w-2xl mx-auto mt-8"
        >
          <div className="bg-white rounded-3xl p-8 border-2 border-gray-900 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
              <CheckCircle2 className="w-8 h-8 text-gray-900" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              You're protected!
            </h3>
            <p className="text-gray-600">
              Sit back and relax. We'll remind you before any document expires.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
