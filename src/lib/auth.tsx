import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "admin" | "kasir";

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI?.isElectron;

interface LocalUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | LocalUser | null;
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  profile: {
    username: string;
    full_name: string | null;
  } | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isOffline: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage key for Electron auth
const ELECTRON_AUTH_KEY = 'nexapos_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | LocalUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<{ username: string; full_name: string | null } | null>(null);

  // Electron auth functions
  const electronAuth = {
    async login(email: string, password: string) {
      const api = (window as any).electronAPI;
      const result = await api.login(email, password);
      
      if (result.error) {
        return { error: new Error(result.error.message) };
      }
      
      // Save to localStorage
      localStorage.setItem(ELECTRON_AUTH_KEY, JSON.stringify(result.data));
      
      setUser(result.data.user);
      setProfile(result.data.profile);
      setRole(result.data.role as UserRole);
      
      return { error: null };
    },

    async register(email: string, password: string, username: string, fullName: string) {
      const api = (window as any).electronAPI;
      const result = await api.register(email, password, username, fullName);
      
      if (result.error) {
        return { error: new Error(result.error.message) };
      }
      
      // Save to localStorage
      localStorage.setItem(ELECTRON_AUTH_KEY, JSON.stringify(result.data));
      
      setUser(result.data.user);
      setProfile(result.data.profile);
      setRole(result.data.role as UserRole);
      
      return { error: null };
    },

    async logout() {
      localStorage.removeItem(ELECTRON_AUTH_KEY);
      setUser(null);
      setProfile(null);
      setRole(null);
    },

    async checkSession() {
      const saved = localStorage.getItem(ELECTRON_AUTH_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          // Verify user still exists
          const api = (window as any).electronAPI;
          const result = await api.getProfile(data.user.id);
          
          if (result.data?.profile) {
            setUser(data.user);
            setProfile(result.data.profile);
            setRole(result.data.role as UserRole);
          } else {
            localStorage.removeItem(ELECTRON_AUTH_KEY);
          }
        } catch (e) {
          localStorage.removeItem(ELECTRON_AUTH_KEY);
        }
      }
      setLoading(false);
    },

    async refreshProfile() {
      if (!user) return;
      const api = (window as any).electronAPI;
      const result = await api.getProfile(user.id);
      if (result.data) {
        setProfile(result.data.profile);
        setRole(result.data.role as UserRole);
      }
    }
  };

  // Supabase auth functions
  const fetchUserData = async (userId: string) => {
    try {
      // Fetch role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (roleData) {
        setRole(roleData.role as UserRole);
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", userId)
        .single();

      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    if (isElectron) {
      // Electron mode - use local auth
      electronAuth.checkSession();
    } else {
      // Supabase mode
      // Set up auth state listener FIRST
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            // Defer Supabase calls with setTimeout
            setTimeout(() => {
              fetchUserData(session.user.id);
            }, 0);
          } else {
            setRole(null);
            setProfile(null);
          }
          
          setLoading(false);
        }
      );

      // THEN check for existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserData(session.user.id);
        }
        
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    if (isElectron) {
      return electronAuth.login(email, password);
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error as Error | null };
    }
  };

  const signUp = async (email: string, password: string, username: string, fullName: string) => {
    if (isElectron) {
      return electronAuth.register(email, password, username, fullName);
    } else {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username,
            full_name: fullName,
          },
        },
      });
      return { error: error as Error | null };
    }
  };

  const signOut = async () => {
    if (isElectron) {
      await electronAuth.logout();
    } else {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (isElectron) {
      await electronAuth.refreshProfile();
    } else if (user) {
      await fetchUserData(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        role,
        profile,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        isOffline: isElectron,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
