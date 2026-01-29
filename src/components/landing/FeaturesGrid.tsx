import { motion } from "framer-motion";
import { FileText, Bell, Car, Store, UserCheck, ShieldCheck } from "lucide-react";
import { FadeInView } from "./animations";

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  className?: string;
  iconBg: string;
  iconColor: string;
  animation: "pulse" | "bounce" | "shake" | "none";
  badge?: string;
}

const features: Feature[] = [
  {
    icon: Store,
    title: "Sell Direct — No Agents",
    description: "List your vehicle directly to the VinDoc community. Skip the middlemen, avoid agent fees, and connect with verified buyers.",
    className: "md:col-span-2 md:row-span-1",
    iconBg: "",
    iconColor: "text-gray-900",
    animation: "none",
    badge: "Coming Soon"
  },
  {
    icon: FileText,
    title: "All Documents in One Place",
    description: "Insurance, RC, PUCC, fitness — securely stored and instantly accessible.",
    className: "md:col-span-1",
    iconBg: "",
    iconColor: "text-gray-900",
    animation: "none"
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Get notified before anything expires via email or push notification.",
    className: "md:col-span-1",
    iconBg: "",
    iconColor: "text-gray-900",
    animation: "none"
  },
  {
    icon: UserCheck,
    title: "Expert Inspections",
    description: "Hire a VinDoc-certified expert to inspect any vehicle before you buy. Peace of mind for a small fee.",
    className: "md:col-span-1",
    iconBg: "",
    iconColor: "text-gray-900",
    animation: "none",
    badge: "Coming Soon"
  },
  {
    icon: Car,
    title: "Vehicle Profiles",
    description: "Create profiles for all your vehicles with complete document history.",
    className: "md:col-span-1",
    iconBg: "",
    iconColor: "text-gray-900",
    animation: "none"
  },
  {
    icon: ShieldCheck,
    title: "Verified Seller Status",
    description: "Build trust with complete document verification. Stand out from other sellers with your verified badge.",
    className: "md:col-span-2",
    iconBg: "",
    iconColor: "text-gray-900",
    animation: "none",
    badge: "Coming Soon"
  }
];

const FeatureCard = ({ feature, index }: { feature: Feature; index: number }) => {
  const Icon = feature.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`relative overflow-hidden rounded-3xl bg-white p-10 border border-gray-200 ${feature.className}`}
    >
      {/* Badge */}
      {feature.badge && (
        <div className="absolute top-6 right-6">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 border border-gray-200">
            {feature.badge}
          </span>
        </div>
      )}

      {/* Icon */}
      <div className="w-12 h-12 border-2 border-gray-900 flex items-center justify-center mb-6">
        <Icon className={`w-6 h-6 ${feature.iconColor}`} />
      </div>
      
      {/* Content */}
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        {feature.title}
      </h3>
      <p className="text-gray-500 leading-loose">
        {feature.description}
      </p>
    </motion.div>
  );
};

export const FeaturesGrid = () => {
  return (
    <section className="py-16 md:py-24 bg-white relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <FadeInView className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything you need. Nothing you don't.
          </h2>
          <p className="text-lg text-gray-600">
            A complete suite of tools designed to take the hassle out of vehicle ownership.
          </p>
        </FadeInView>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
