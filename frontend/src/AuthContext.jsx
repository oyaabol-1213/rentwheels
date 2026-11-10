import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Which auth drawer panel is open: null | "login" | "signup"
  const [drawer, setDrawer] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/me");
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/login", { email, password });
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (payload) => {
    const { data } = await api.post("/signup", payload);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/logout");
    } finally {
      setUser(null);
      // New session => new CSRF token for the next request
      await api.get("/me").catch(() => {});
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isLoggedIn: !!user,
      isAdmin: user?.account_type === "admin",
      isSuperAdmin: user?.role === "super_admin",
      setUser,
      refresh,
      login,
      signup,
      logout,
      drawer,
      openLogin: () => setDrawer("login"),
      openSignup: () => setDrawer("signup"),
      closeDrawer: () => setDrawer(null),
    }),
    [user, loading, drawer, refresh, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
