import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "lestero@ignitecinc.com";

interface AdminCheckResult {
  isAdmin: boolean;
  isLoading: boolean;
  userEmail: string | null;
}

export function useAdminCheck(redirectOnFail = true): AdminCheckResult {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (redirectOnFail) {
            navigate("/auth");
          }
          setIsLoading(false);
          return;
        }

        const email = session.user.email;
        setUserEmail(email || null);

        if (email === ADMIN_EMAIL) {
          setIsAdmin(true);
        } else if (redirectOnFail) {
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        if (redirectOnFail) {
          navigate("/dashboard");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && redirectOnFail) {
        navigate("/auth");
      } else if (session?.user.email !== ADMIN_EMAIL && redirectOnFail) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectOnFail]);

  return { isAdmin, isLoading, userEmail };
}

export function useIsAdminUser(): { isAdmin: boolean; isLoading: boolean } {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAdmin(session?.user?.email === ADMIN_EMAIL);
      } catch {
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAdmin(session?.user?.email === ADMIN_EMAIL);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isAdmin, isLoading };
}
