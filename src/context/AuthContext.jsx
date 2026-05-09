import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "@/api/authApi";

const AuthContext = createContext(null);

function saveAuth(data) {
  localStorage.setItem("accessToken", data.token);

  // Remove old key so there is no mismatch in future
  localStorage.removeItem("token");

  const user = {
    id: data.userId,
    fullName: data.fullName,
    email: data.email,
    role: data.role,
  };

  localStorage.setItem("user", JSON.stringify(user));

  return user;
}

function clearAuth() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("paypalCheckoutShipping");
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      clearAuth();
      setAuthLoading(false);
      return;
    }

    authApi
      .me()
      .then((data) => {
        const normalizedUser = {
          id: data.id || data.userId || data._id,
          fullName: data.fullName,
          email: data.email,
          role: data.role,
        };

        setUser(normalizedUser);
        localStorage.setItem("user", JSON.stringify(normalizedUser));
      })
      .catch(() => {
        clearAuth();
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      clearAuth();
      setUser(null);
    };

    window.addEventListener("auth-expired", handleAuthExpired);

    return () => {
      window.removeEventListener("auth-expired", handleAuthExpired);
    };
  }, []);

  const login = async (payload) => {
    try {
      const data = await authApi.login(payload);
      const user = saveAuth(data);
      setUser(user);
      return data;
    } catch (err) {
      clearAuth();
      setUser(null);
      throw err;
    }
  };

  const register = async (payload) => {
    try {
      const data = await authApi.register(payload);
      const user = saveAuth(data);
      setUser(user);
      return data;
    } catch (err) {
      clearAuth();
      setUser(null);
      throw err;
    }
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      authLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      setUser,
    }),
    [user, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}