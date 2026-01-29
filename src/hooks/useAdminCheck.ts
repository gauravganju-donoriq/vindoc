import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AdminCheckResult {
  isAdmin: boolean;
  isLoading: boolean;
  userEmail: string | null;
}

// Check if user has super_admin role using the database function
async function checkSuperAdminRole(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });
    
    if (error) {
      console.error("Error checking admin role:", error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error("Error checking admin role:", error);
    return false;
  }
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

        // Check super_admin role from database
        const hasAdminRole = await checkSuperAdminRole(session.user.id);

        if (hasAdminRole) {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session && redirectOnFail) {
        navigate("/auth");
        return;
      }
      
      if (session) {
        const hasAdminRole = await checkSuperAdminRole(session.user.id);
        if (!hasAdminRole && redirectOnFail) {
          navigate("/dashboard");
        }
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
        if (session) {
          const hasAdminRole = await checkSuperAdminRole(session.user.id);
          setIsAdmin(hasAdminRole);
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session) {
        const hasAdminRole = await checkSuperAdminRole(session.user.id);
        setIsAdmin(hasAdminRole);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { isAdmin, isLoading };
}
