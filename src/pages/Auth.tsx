import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { checkUserSuspension } from "@/hooks/useSuspensionCheck";
import { 
  Shield, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Bell, 
  FileText, 
  FolderOpen,
  Smartphone,
  ArrowRight,
  Loader2,
  CheckCircle
} from "lucide-react";

// Features for left panel - honest messaging
const features = [
  {
    icon: Bell,
    title: "Never miss a renewal",
    description: "Smart reminders before anything expires",
  },
  {
    icon: FileText,
    title: "All documents in one place",
    description: "Insurance, RC, PUCC — always accessible",
  },
  {
    icon: FolderOpen,
    title: "Easy organization",
    description: "Keep your vehicle documents organized",
  },
  {
    icon: Smartphone,
    title: "Access anywhere",
    description: "Works on all your devices",
  },
];

// Left Panel Component
const AuthLeftPanel = () => {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900 overflow-hidden">
      <div className="relative z-10 flex flex-col justify-between p-12 w-full">
        {/* Logo and tagline */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link to="/" className="flex items-center gap-3 group">
            <div className="bg-white p-2 rounded-lg">
              <Shield className="h-5 w-5 text-gray-900" />
            </div>
            <span className="text-2xl font-semibold text-white tracking-tight">VinDoc</span>
          </Link>
          <p className="mt-4 text-gray-400 max-w-sm">
            The simple way to manage your vehicle documents and never miss a renewal.
          </p>
        </motion.div>

        {/* Features list */}
        <div className="space-y-6 my-12">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              className="flex items-start gap-4"
            >
              <div className="w-10 h-10 border border-gray-700 flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">{feature.title}</h3>
                <p className="text-gray-500 text-sm">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Simple footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex items-center gap-4 text-gray-500 text-sm"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Free to use · No credit card required</span>
        </motion.div>
      </div>
    </div>
  );
};

// Mobile Header Component
const MobileHeader = () => {
  return (
    <div className="lg:hidden bg-gray-900 px-4 sm:px-6 py-6 sm:py-8">
      <Link to="/" className="flex items-center gap-2.5 justify-center">
        <div className="bg-white p-2 rounded-lg">
          <Shield className="h-5 w-5 text-gray-900" />
        </div>
        <span className="text-xl font-semibold text-white">VinDoc</span>
      </Link>
      <p className="text-center text-gray-400 text-sm mt-3">
        Manage your vehicle documents effortlessly
      </p>
    </div>
  );
};

// Form Panel Props
interface AuthFormPanelProps {
  isLogin: boolean;
  setIsLogin: (value: boolean) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  loading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

// Right Panel (Form) Component
const AuthFormPanel = ({
  isLogin,
  setIsLogin,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  loading,
  handleSubmit,
}: AuthFormPanelProps) => {
  return (
    <div className="w-full lg:w-1/2 flex flex-col">
      <MobileHeader />
      
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:p-12 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Form Header */}
          <div className="mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? "login" : "signup"}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                  {isLogin ? "Welcome back" : "Create your account"}
                </h1>
                <p className="text-gray-600 text-sm">
                  {isLogin 
                    ? "Sign in to access your vehicle documents" 
                    : "Start managing your vehicle documents today"}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <Label htmlFor="email" className="text-gray-700 font-medium text-sm">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 border-gray-200 bg-white focus:border-gray-900 focus:ring-gray-900 transition-colors"
                  required
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <Label htmlFor="password" className="text-gray-700 font-medium text-sm">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 border-gray-200 bg-white focus:border-gray-900 focus:ring-gray-900 transition-colors"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>

            {isLogin && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex justify-end"
              >
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Forgot password?
                </button>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button 
                type="submit" 
                className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-sm font-medium border border-gray-900"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait...
                  </>
                ) : (
                  <>
                    {isLogin ? "Sign In" : "Create Account"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.div>
          </form>

          {/* Toggle between login/signup */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-center"
          >
            <p className="text-gray-600 text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="font-medium text-gray-900 hover:underline"
              >
                {isLogin ? "Sign up for free" : "Sign in"}
              </button>
            </p>
          </motion.div>

          {/* Terms */}
          {!isLogin && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-center text-xs text-gray-500"
            >
              By creating an account, you agree to our{" "}
              <a href="#" className="underline hover:text-gray-900">Terms of Service</a>
              {" "}and{" "}
              <a href="#" className="underline hover:text-gray-900">Privacy Policy</a>
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

// Main Auth Component
const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSessionAndSuspension = async (userId: string) => {
      const { isSuspended } = await checkUserSuspension(userId);
      if (isSuspended) {
        await supabase.auth.signOut();
        toast({
          title: "Account Suspended",
          description: "Your account has been suspended. Please contact support.",
          variant: "destructive",
        });
        return false;
      }
      return true;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setTimeout(async () => {
          const canProceed = await checkSessionAndSuspension(session.user.id);
          if (canProceed) {
            navigate("/dashboard");
          }
        }, 0);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const canProceed = await checkSessionAndSuspension(session.user.id);
        if (canProceed) {
          navigate("/dashboard");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        if (data.user) {
          const { isSuspended } = await checkUserSuspension(data.user.id);
          if (isSuspended) {
            await supabase.auth.signOut();
            toast({
              title: "Account Suspended",
              description: "Your account has been suspended. Please contact support for assistance.",
              variant: "destructive",
            });
            return;
          }
        }

        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        toast({
          title: "Account created!",
          description: "Welcome to VinDoc!",
        });
      }
    } catch (error: any) {
      let errorMessage = error.message;
      if (error.message.includes("User already registered")) {
        errorMessage = "This email is already registered. Please log in instead.";
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      <AuthLeftPanel />
      <AuthFormPanel
        isLogin={isLogin}
        setIsLogin={setIsLogin}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        loading={loading}
        handleSubmit={handleSubmit}
      />
    </div>
  );
};

export default Auth;
