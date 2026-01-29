import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield, Settings, LogOut, ChevronLeft } from "lucide-react";
import { useIsAdminUser } from "@/hooks/useAdminCheck";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  backLink?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export const DashboardLayout = ({
  children,
  title,
  subtitle,
  backLink,
  backLabel = "Back",
  actions,
}: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { isAdmin } = useIsAdminUser();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100"
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-16 flex items-center justify-between">
          {/* Left: Logo or Back button */}
          {backLink ? (
            <Link
              to={backLink}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
            >
              <ChevronLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-sm font-medium">{backLabel}</span>
            </Link>
          ) : (
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="bg-gray-900 p-2 rounded-xl group-hover:bg-gray-800 transition-colors">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900 tracking-tight">VinDoc</span>
            </Link>
          )}

          {/* Right: Navigation */}
          <div className="flex items-center gap-1">
            {isAdmin && (
              <Button variant="ghost" size="sm" asChild className="text-gray-600 hover:text-gray-900">
                <Link to="/admin">Admin</Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" asChild className="text-gray-600 hover:text-gray-900">
              <Link to="/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Page Header (optional) */}
      {(title || actions) && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                {title && (
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="text-2xl font-semibold text-gray-900"
                  >
                    {title}
                  </motion.h1>
                )}
                {subtitle && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="text-gray-500 mt-1"
                  >
                    {subtitle}
                  </motion.p>
                )}
              </div>
              {actions && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="flex-shrink-0"
                >
                  {actions}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

// Loading skeleton for dashboard
export const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-16 flex items-center justify-between">
          <div className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-8 w-8 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
          <div className="mt-8 grid gap-3 xl:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-white border border-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
