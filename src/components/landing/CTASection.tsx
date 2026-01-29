import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { FadeInView } from "./animations";

export const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background with solid color */}
      <div className="absolute inset-0 bg-gray-900" />
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <FadeInView>
            <p className="text-white/80 text-sm mb-8">
              Get early access
            </p>
          </FadeInView>

          <FadeInView delay={0.1}>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Your vehicle deserves better <br className="hidden sm:block" />
              <span className="text-gray-400">
                than a glove box.
              </span>
            </h2>
          </FadeInView>

          <FadeInView delay={0.2}>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              Stop scrambling for papers. Stop paying fines. Start managing your vehicle documents like it's 2026.
            </p>
          </FadeInView>

          <FadeInView delay={0.3}>
            <Button 
              size="default" 
              asChild 
              className="rounded-full px-8 h-12 text-sm bg-white text-gray-900 hover:bg-gray-100 border border-white"
            >
              <Link to="/auth">
                Get Started for Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </FadeInView>

          <FadeInView delay={0.4}>
            <p className="mt-6 text-sm text-gray-500">
              No credit card required · Setup in 30 seconds · Cancel anytime
            </p>
          </FadeInView>

        </div>
      </div>
    </section>
  );
};
