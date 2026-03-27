import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortfolio } from "../context/PortfolioContext";
import { useToast } from "../components/ToastProvider";
import { hasFirebaseConfig } from "../lib/firebase";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = usePortfolio();
  const toast = useToast();
  const [form, setForm] = useState({ username: "admin", password: "admin123" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await login(form);
      toast({ title: "Welcome back", message: "Admin session started.", type: "success" });
      navigate("/admin");
    } catch (error) {
      toast({ title: "Login failed", message: error.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <p className="section-label">Portfolio CMS</p>
        <h1>Admin Login</h1>
        <p>Use the seeded credentials below and change them later in a future auth upgrade.</p>
        <label>
          Username
          <input
            value={form.username}
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
        </label>
        <button type="submit" className="primary-button">
          {loading ? "Signing in..." : "Sign In"}
        </button>
        <small className="helper-text">
          Firebase database env status: {hasFirebaseConfig ? "configured" : "not configured yet"}
        </small>
      </form>
    </div>
  );
}
