import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import "./AuthTest.css";

type AuthMode = "login" | "register";

interface BackendUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  auth_provider: string;
  created_at: string;
}

const API_URL = import.meta.env.VITE_API_URL?.trim() || "http://localhost:8000";

const TOKEN_STORAGE_KEY = "usv-events-access-token";
const REFRESH_STORAGE_KEY = "usv-events-refresh-token";
const EXPIRES_AT_STORAGE_KEY = "usv-events-expires-at";

interface AuthResponse {
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expires_at: number | null;
  user: BackendUser;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "n/a";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function AuthTest() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [user, setUser] = useState<BackendUser | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"login" | "register" | "google" | "me" | "logout" | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
    const storedRefreshToken = window.localStorage.getItem(REFRESH_STORAGE_KEY);
    const storedExpiresAt = window.localStorage.getItem(EXPIRES_AT_STORAGE_KEY);

    if (storedToken) {
      setAccessToken(storedToken);
      setRefreshToken(storedRefreshToken);
      setExpiresAt(storedExpiresAt ? Number(storedExpiresAt) : null);
      void validateTokenWithBackend(storedToken, false);
    }

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashAccessToken = hash.get("access_token");
    if (hashAccessToken) {
      const hashRefreshToken = hash.get("refresh_token");
      const hashExpiresAt = hash.get("expires_at");

      persistSession(hashAccessToken, hashRefreshToken, hashExpiresAt ? Number(hashExpiresAt) : null);
      setStatus("Autentificare Google reusita.");
      void validateTokenWithBackend(hashAccessToken, false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const query = new URLSearchParams(window.location.search);
    const oauthError = query.get("oauth_error");
    if (oauthError) {
      setError("Redirectul OAuth trimis catre backend nu este valid.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  function resetFeedback() {
    setError("");
    setStatus("");
  }

  function updateField(field: "fullName" | "email" | "password", value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function persistSession(
    nextAccessToken: string,
    nextRefreshToken: string | null,
    nextExpiresAt: number | null,
  ) {
    setAccessToken(nextAccessToken);
    setRefreshToken(nextRefreshToken);
    setExpiresAt(nextExpiresAt);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, nextAccessToken);

    if (nextRefreshToken) {
      window.localStorage.setItem(REFRESH_STORAGE_KEY, nextRefreshToken);
    } else {
      window.localStorage.removeItem(REFRESH_STORAGE_KEY);
    }

    if (typeof nextExpiresAt === "number") {
      window.localStorage.setItem(EXPIRES_AT_STORAGE_KEY, String(nextExpiresAt));
    } else {
      window.localStorage.removeItem(EXPIRES_AT_STORAGE_KEY);
    }
  }

  function clearSession() {
    setAccessToken("");
    setRefreshToken(null);
    setExpiresAt(null);
    setUser(null);
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(REFRESH_STORAGE_KEY);
    window.localStorage.removeItem(EXPIRES_AT_STORAGE_KEY);
  }

  async function validateTokenWithBackend(token: string, showSuccess: boolean) {
    try {
      const response = await axios.get<BackendUser>(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(response.data);
      if (showSuccess) {
        setStatus("Backend-ul a validat tokenul curent.");
      }
    } catch (requestError) {
      clearSession();
      if (axios.isAxiosError(requestError)) {
        setError(requestError.response?.data?.detail || requestError.message);
      } else {
        setError("Validarea in backend a esuat.");
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();

    setLoading("register");
    try {
      const response = await axios.post<AuthResponse>(`${API_URL}/auth/register`, {
        email: form.email,
        password: form.password,
        full_name: form.fullName.trim(),
      });

      persistSession(response.data.access_token, response.data.refresh_token, response.data.expires_at);
      setUser(response.data.user);
      setForm((current) => ({ ...current, password: "" }));
      setStatus("Cont creat si autentificat.");
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        setError(requestError.response?.data?.detail || requestError.message);
      } else {
        setError("Crearea contului a esuat.");
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();

    setLoading("login");
    try {
      const response = await axios.post<AuthResponse>(`${API_URL}/auth/login`, {
        email: form.email,
        password: form.password,
      });

      persistSession(response.data.access_token, response.data.refresh_token, response.data.expires_at);
      setUser(response.data.user);
      setForm((current) => ({ ...current, password: "" }));
      setStatus("Login reusit.");
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        setError(requestError.response?.data?.detail || requestError.message);
      } else {
        setError("Login-ul a esuat.");
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogleLogin() {
    resetFeedback();
    setLoading("google");
    const redirectTarget = `${window.location.origin}${window.location.pathname}`;
    const authUrl = new URL(`${API_URL}/auth/google/start`);
    authUrl.searchParams.set("redirect_to", redirectTarget);
    window.location.assign(authUrl.toString());
  }

  async function handleValidateWithBackend() {
    resetFeedback();

    if (!accessToken) {
      setError("Nu exista un access token activ.");
      return;
    }

    setLoading("me");
    await validateTokenWithBackend(accessToken, true);
  }

  async function handleLogout() {
    resetFeedback();
    setLoading("logout");
    clearSession();
    setStatus("Sesiunea locala a fost stearsa.");
    setLoading(null);
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-card">
          {error && <div className="auth-alert auth-alert-error">{error}</div>}
          {status && <div className="auth-alert auth-alert-success">{status}</div>}

          {user ? (
            <div className="auth-session">
              <div className="auth-session-head">
                <div>
                  <p className="auth-eyebrow">Sesiune activa</p>
                  <h2>{user.full_name}</h2>
                </div>
                <span className="auth-provider">{user.auth_provider}</span>
              </div>

              <div className="auth-grid">
                <div className="auth-data">
                  <span>Email</span>
                  <strong>{user.email}</strong>
                </div>
                <div className="auth-data">
                  <span>User ID</span>
                  <strong>{user.id}</strong>
                </div>
                <div className="auth-data">
                  <span>Access token</span>
                  <strong>{accessToken ? `${accessToken.slice(0, 26)}...` : "n/a"}</strong>
                </div>
                <div className="auth-data">
                  <span>Expira la</span>
                  <strong>{formatDate(expiresAt ? new Date(expiresAt * 1000).toISOString() : null)}</strong>
                </div>
              </div>

              <div className="auth-actions">
                <button
                  type="button"
                  className="auth-button auth-button-secondary"
                  onClick={handleValidateWithBackend}
                  disabled={loading !== null}
                >
                  {loading === "me" ? "Verific..." : "Testeaza /auth/me"}
                </button>
                <button
                  type="button"
                  className="auth-button auth-button-ghost"
                  onClick={handleLogout}
                  disabled={loading !== null}
                >
                  {loading === "logout" ? "Se inchide..." : "Logout"}
                </button>
              </div>

              <div className="auth-backend-card">
                <p className="auth-eyebrow">Detalii backend</p>
                <div className="auth-grid compact">
                  <div className="auth-data">
                    <span>Nume</span>
                    <strong>{user.full_name}</strong>
                  </div>
                  <div className="auth-data">
                    <span>Provider</span>
                    <strong>{user.auth_provider}</strong>
                  </div>
                  <div className="auth-data">
                    <span>Creat la</span>
                    <strong>{formatDate(user.created_at)}</strong>
                  </div>
                </div>
              </div>

              {refreshToken && (
                <div className="auth-backend-card">
                  <p className="auth-eyebrow">Refresh token</p>
                  <div className="auth-data">
                    <span>Valoare</span>
                    <strong>{`${refreshToken.slice(0, 26)}...`}</strong>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="auth-switch">
                <button
                  type="button"
                  className={mode === "login" ? "is-active" : ""}
                  onClick={() => setMode("login")}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={mode === "register" ? "is-active" : ""}
                  onClick={() => setMode("register")}
                >
                  Register
                </button>
              </div>

              <form className="auth-form" onSubmit={mode === "login" ? handleLogin : handleRegister}>
                {mode === "register" && (
                  <label className="auth-field">
                    <span>Nume complet</span>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(event) => updateField("fullName", event.target.value)}
                      placeholder="Ex: Andrei Popescu"
                      required
                    />
                  </label>
                )}

                <label className="auth-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="student@usv.ro"
                    required
                  />
                </label>

                <label className="auth-field">
                  <span>Parola</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    placeholder="minimum 8 caractere"
                    required
                  />
                </label>

                <button
                  type="submit"
                  className="auth-button auth-button-primary"
                  disabled={loading !== null}
                >
                  {loading === mode
                    ? mode === "login"
                      ? "Autentificare..."
                      : "Creare cont..."
                    : mode === "login"
                      ? "Login cu email"
                      : "Register cu email"}
                </button>
              </form>

              <div className="auth-divider">
                <span>sau</span>
              </div>

              <button
                type="button"
                className="auth-button auth-button-google"
                onClick={handleGoogleLogin}
                disabled={loading !== null}
              >
                {loading === "google" ? "Redirect..." : "Continua cu Google"}
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
