import axios, { type AxiosError } from "axios";

export const API_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://127.0.0.1:8000";

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: unknown }>;
    return formatApiDetail(axiosError.response?.data?.detail) || axiosError.message;
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
  const response = await axios.request<T>({
    method,
    url: `${API_URL}${url}`,
    data,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return response.data;
}
