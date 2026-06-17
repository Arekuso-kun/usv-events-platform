import axios from "axios";
import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import {
  API_URL,
  AUTH_UPDATED_EVENT,
  apiRequest,
  clearStoredAuthTokens,
  getErrorMessage,
  getStoredAccessToken,
  storeAuthTokens,
} from "../api/client";
import type { AuthMode, AuthResponse, User } from "../types";

interface UseAuthOptions {
  setError: Dispatch<SetStateAction<string>>;
  setNotice: Dispatch<SetStateAction<string>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  clearMessages: () => void;
}

export function useAuth(options: UseAuthOptions) {
  const { setError, setLoading, setNotice, clearMessages } = options;
  const [token, setToken] = useState(getStoredAccessToken);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authForm, setAuthForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  const logout = useCallback(() => {
    clearStoredAuthTokens();
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
        const currentUser = await apiRequest<User>("get", "/auth/me", nextToken);
        setToken(getStoredAccessToken());
        setUser(currentUser);
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
    const hashRefreshToken = hash.get("refresh_token");
    const expiresAt = Number(hash.get("expires_at"));
    const oauthError = hash.get("error_description") || hash.get("error");

    if (oauthError) {
      setError(oauthError);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (hashAccessToken) {
      storeAuthTokens({
        access_token: hashAccessToken,
        refresh_token: hashRefreshToken,
        expires_at: Number.isFinite(expiresAt) ? expiresAt : null,
      });
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
      storeAuthTokens(response.data);
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
      const updatedUser = await apiRequest<User>("post", "/auth/password", token, {
        password,
      });
      setToken(getStoredAccessToken());
      setUser(updatedUser);
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

  useEffect(() => {
    const syncAuthState = () => {
      const nextToken = getStoredAccessToken();
      setToken(nextToken);
      if (!nextToken) {
        setUser(null);
      }
    };

    window.addEventListener(AUTH_UPDATED_EVENT, syncAuthState);
    window.addEventListener("storage", syncAuthState);
    return () => {
      window.removeEventListener(AUTH_UPDATED_EVENT, syncAuthState);
      window.removeEventListener("storage", syncAuthState);
    };
  }, []);

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
