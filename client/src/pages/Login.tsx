import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@erp.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await login(email, password);
      nav("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <div className="brand-icon" style={{ width: "48px", height: "48px", borderRadius: "12px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
        </div>
        <h1>Nexus ERP</h1>
        <p className="login-sub">Sign in to your operations workspace</p>
        <label className="field">
          <span>Email Address</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="admin@erp.test" />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
        </label>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" disabled={busy} style={{ width: "100%", marginTop: "0.5rem", padding: "0.75rem" }}>
          {busy ? "Signing in…" : "Sign In"}
        </button>
        <div className="hint" style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <span>Quick Demo Logins (Password: <b>password123</b>):</span>
          <div className="quick-login-chips">
            <button type="button" className="chip-btn" onClick={() => fillDemo("admin@erp.test")}>👑 Admin</button>
            <button type="button" className="chip-btn" onClick={() => fillDemo("sales@erp.test")}>💼 Sales</button>
            <button type="button" className="chip-btn" onClick={() => fillDemo("warehouse@erp.test")}>📦 Warehouse</button>
          </div>
        </div>
      </form>
    </div>
  );
}
