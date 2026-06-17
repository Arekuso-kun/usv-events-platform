import axios, { type AxiosError, type AxiosRequestConfig } from "axios";

export const API_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://127.0.0.1:8000";

export const ACCESS_TOKEN_KEY = "usv-events-access-token";
export const REFRESH_TOKEN_KEY = "usv-events-refresh-token";
export const AUTH_UPDATED_EVENT = "usv-events-auth-updated";

interface AuthTokenPayload {
  access_token: string;
  refresh_token?: string | null;
  expires_at?: number | null;
}

let refreshRequest: Promise<AuthTokenPayload> | null = null;

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: unknown }>;
    return formatApiDetail(axiosError.response?.data?.detail) || axiosError.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "A aparut o eroare.";
}

function formatApiDetail(detail: unknown): string {
  if (!detail) {
    return "";
  }
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail.map(formatValidationItem).filter(Boolean).join(" ");
  }
  if (typeof detail === "object") {
    return formatValidationItem(detail);
  }
  return String(detail);
}

function formatValidationItem(item: unknown): string {
  if (!item || typeof item !== "object") {
    return String(item || "");
  }
  const data = item as { loc?: unknown; msg?: unknown; input?: unknown };
  const field = Array.isArray(data.loc)
    ? data.loc.filter((part) => part !== "body").join(".")
    : "";
  const message = typeof data.msg === "string" ? data.msg : "";
  return field && message ? `${field}: ${message}.` : message;
}

export async function apiRequest<T>(
  method: "get" | "post" | "patch" | "delete",
  url: string,
  token: string,
  data?: unknown,
): Promise<T> {
  return requestWithRefresh<T>(
    {
      method,
      url: `${API_URL}${url}`,
      data,
    },
    token,
  );
}

export async function apiBlobRequest(url: string, token: string): Promise<Blob> {
  return requestWithRefresh<Blob>(
    {
      method: "get",
      url: `${API_URL}${url}`,
      responseType: "blob",
    },
    token,
  );
}

export function getStoredAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || "";
}

export function storeAuthTokens(payload: AuthTokenPayload) {
  localStorage.setItem(ACCESS_TOKEN_KEY, payload.access_token);
  if (payload.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, payload.refresh_token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  dispatchAuthUpdated();
}

export function clearStoredAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  dispatchAuthUpdated();
}

async function requestWithRefresh<T>(
  config: AxiosRequestConfig,
  token: string,
): Promise<T> {
  const accessToken = getStoredAccessToken() || token;
  try {
    return await sendRequest<T>(config, accessToken);
  } catch (error) {
    if (!shouldRefresh(error, accessToken)) {
      throw error;
    }

    const refreshed = await refreshStoredSession();
    return sendRequest<T>(config, refreshed.access_token);
  }
}

async function sendRequest<T>(
  config: AxiosRequestConfig,
  accessToken: string,
): Promise<T> {
  const response = await axios.request<T>({
    ...config,
    headers: {
      ...config.headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  return response.data;
}

function shouldRefresh(error: unknown, accessToken: string) {
  return (
    Boolean(accessToken) &&
    Boolean(getStoredRefreshToken()) &&
    axios.isAxiosError(error) &&
    error.response?.status === 401
  );
}

async function refreshStoredSession(): Promise<AuthTokenPayload> {
  if (refreshRequest) {
    return refreshRequest;
  }

  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    clearStoredAuthTokens();
    throw new Error("Sesiunea a expirat. Autentifica-te din nou.");
  }

  refreshRequest = axios
    .post<AuthTokenPayload>(`${API_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    })
    .then((response) => {
      storeAuthTokens(response.data);
      return response.data;
    })
    .catch((error) => {
      clearStoredAuthTokens();
      throw new Error(getRefreshErrorMessage(error));
    })
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
}

function getRefreshErrorMessage(error: unknown) {
  const message = getErrorMessage(error);
  return message === "Network Error"
    ? message
    : "Sesiunea a expirat. Autentifica-te din nou.";
}

function dispatchAuthUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_UPDATED_EVENT));
  }
}
