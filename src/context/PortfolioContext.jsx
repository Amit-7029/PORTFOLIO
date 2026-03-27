import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

const PortfolioContext = createContext(null);

export function PortfolioProvider({ children }) {
  const [portfolio, setPortfolio] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("portfolio-token"));
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  async function loadPublicPortfolio() {
    const data = await apiFetch("/api/portfolio/public");
    setPortfolio(data);
    return data;
  }

  async function loadAdminContent() {
    const data = await apiFetch("/api/admin/content");
    setPortfolio(data);
    return data;
  }

  async function login(credentials) {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    localStorage.setItem("portfolio-token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  async function logout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    localStorage.removeItem("portfolio-token");
    setToken(null);
    setUser(null);
  }

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      if (!token) {
        setAuthReady(true);
        return;
      }

      try {
        const data = await apiFetch("/api/auth/me");
        if (mounted) setUser(data.user);
      } catch {
        localStorage.removeItem("portfolio-token");
        if (mounted) setToken(null);
      } finally {
        if (mounted) setAuthReady(true);
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.addEventListener("portfolio:update", (event) => {
      const data = JSON.parse(event.data);
      setPortfolio(data);
    });
    return () => source.close();
  }, []);

  const value = useMemo(
    () => ({
      portfolio,
      setPortfolio,
      token,
      user,
      authReady,
      login,
      logout,
      loadPublicPortfolio,
      loadAdminContent,
    }),
    [portfolio, token, user, authReady],
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error("usePortfolio must be used within PortfolioProvider");
  return context;
}
