import { motion } from "framer-motion";
import { useState } from "react";
import { Zap, Smartphone, Bell, FolderOpen, CheckCircle, ChevronDown, LifeBuoy } from "lucide-react";
import { FadeInView, StaggerContainer, StaggerItem } from "./animations";

const trustBadges = [
  { icon: Zap, label: "Simple Setup" },
  { icon: Smartphone, label: "Multi-device Access" },
  { icon: Bell, label: "Renewal Reminders" },
  { icon: LifeBuoy, label: "Roadside Help" },
  { icon: FolderOpen, label: "Document Storage" },
];

const whyChooseUs = [
  "All your documents in one place",
  "Never miss a renewal deadline",
  "Smart reminders via email or push notification",
  "Roadside assistance on demand",
  "Easy parts sourcing for repairs",
  "Service history tracking",
  "Easy to share with buyers",
  "Works on all devices",
];

const faqs = [
  {
    question: "Is my data secure?",
    answer: "Yes, your data is stored securely and is only accessible to you. We take your privacy seriously."
  },
  {
    question: "How does it work?",
    answer: "Simply enter your vehicle number and upload photos of your documents. VinDoc organizes everything and reminds you before anything expires."
  },
  {
    question: "How does roadside assistance work?",
    answer: "Simply open VinDoc, select your vehicle, and tap Request Assistance. Describe your situation and location, and we will connect you with verified help nearby."
  },
  {
    question: "Can I request vehicle parts through VinDoc?",
    answer: "Yes! You can request used or OEM parts for any of your vehicles. Our team sources quotes from trusted vendors and delivers them to you."
  },
  {
    question: "What happens when a document is about to expire?",
    answer: "We send you reminders starting 30 days before expiry. You can choose to be notified via email or push notification."
  },
  {
    question: "Can I add multiple vehicles?",
    answer: "Yes! You can add and manage as many vehicles as you want. Cars, bikes, trucks, all supported. Each vehicle has its own dedicated profile and document set."
  },
];

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

const FAQItem = ({ question, answer, isOpen, onToggle }: FAQItemProps) => {
  return (
    <motion.div
      initial={false}
      className="border-b border-gray-200 last:border-0"
    >
      <button
        onClick={onToggle}
        className="w-full py-5 flex items-center justify-between text-left group"
      >
        <span className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 ml-4"
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
        className="overflow-hidden"
      >
        <p className="pb-5 text-gray-500 leading-relaxed">
          {answer}
        </p>
      </motion.div>
    </motion.div>
  );
};

export const TrustSection = () => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  return (
    <section className="py-16 md:py-24 bg-gray-50 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Trust Badges */}
        <FadeInView className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Why VinDoc?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Keep your vehicle documents organized, accessible, and always up to date.
          </p>
        </FadeInView>

        <StaggerContainer className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-5xl mx-auto mb-12">
          {trustBadges.map((badge, index) => (
            <StaggerItem key={index}>
              <div className="flex flex-col items-center text-center p-6 bg-white border border-gray-200">
                <badge.icon className="w-6 h-6 text-gray-900 mb-4" />
                <span className="text-sm font-medium text-gray-700">{badge.label}</span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Two column layout */}
        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Why Choose Us */}
          <FadeInView direction="left">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">
              Why vehicle owners choose VinDoc
            </h3>
            <ul className="space-y-5">
              {whyChooseUs.map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle className="w-5 h-5 text-gray-900 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">{item}</span>
                </motion.li>
              ))}
            </ul>
          </FadeInView>

          {/* FAQ */}
          <FadeInView direction="right">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">
              Frequently asked questions
            </h3>
            <div className="bg-white border border-gray-200 p-8">
              {faqs.map((faq, index) => (
                <FAQItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openFAQ === index}
                  onToggle={() => setOpenFAQ(openFAQ === index ? null : index)}
                />
              ))}
            </div>
          </FadeInView>
        </div>
      </div>
    </section>
  );
};
