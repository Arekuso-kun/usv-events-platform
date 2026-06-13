import axios from "axios";
import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { API_URL, getErrorMessage } from "../api/client";
import type { AuthMode, AuthResponse, User } from "../types";

const TOKEN_KEY = "usv-events-access-token";

interface UseAuthOptions {
  setError: Dispatch<SetStateAction<string>>;
  setNotice: Dispatch<SetStateAction<string>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  clearMessages: () => void;
}

export function useAuth(options: UseAuthOptions) {
  const { setError, setLoading, setNotice, clearMessages } = options;
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authForm, setAuthForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setNotice("");
  }, [setNotice]);

  const loadMe = useCallback(
    async (nextToken: string) => {
      if (!nextToken) {
        return;
      }
      try {
        const response = await axios.get<User>(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${nextToken}` },
        });
        setUser(response.data);
      } catch (requestError) {
        setError(getErrorMessage(requestError));
        logout();
      }
    },
    [logout, setError],
  );

  const handleOAuthRedirect = useCallback(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashAccessToken = hash.get("access_token");
    const oauthError = hash.get("error_description") || hash.get("error");

    if (oauthError) {
      setError(oauthError);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (hashAccessToken) {
      localStorage.setItem(TOKEN_KEY, hashAccessToken);
      setToken(hashAccessToken);
      setNotice("Autentificare Google reusita.");
      void loadMe(hashAccessToken);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const queryError = query.get("oauth_error");
    if (queryError) {
      setError("Redirectul OAuth nu este permis de configuratia backend.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [loadMe, setError, setNotice]);

  useEffect(() => {
    handleOAuthRedirect();
  }, [handleOAuthRedirect]);

  useEffect(() => {
    if (token) {
      void loadMe(token);
    }
  }, [loadMe, token]);

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      const response = await axios.post<AuthResponse>(`${API_URL}/auth/login`, {
        email: authForm.email,
        password: authForm.password,
      });
      localStorage.setItem(TOKEN_KEY, response.data.access_token);
      setToken(response.data.access_token);
      setUser(response.data.user);
      setAuthForm((current) => ({ ...current, password: "" }));
      setNotice("Sesiune activa.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function setPassword(password: string) {
    if (!token) {
      setError("Sesiunea de invitatie lipseste sau a expirat.");
      return false;
    }

    setLoading(true);
    clearMessages();
    try {
      const response = await axios.post<User>(
        `${API_URL}/auth/password`,
        { password },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setUser(response.data);
      setNotice("Parola a fost setata.");
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    } finally {
      setLoading(false);
    }
  }

  function startGoogleLogin() {
    const redirectTo = `${window.location.origin}/events`;
    window.location.assign(
      `${API_URL}/auth/google/start?redirect_to=${encodeURIComponent(redirectTo)}`,
    );
  }

  return {
    token,
    user,
    authMode,
    authForm,
    setAuthMode,
    setAuthForm,
    submitAuth,
    setPassword,
    startGoogleLogin,
    logout,
  };
}
