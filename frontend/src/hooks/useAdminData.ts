import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { apiRequest, getErrorMessage } from "../api/client";
import type { AdminReport, EventItem, OrganizerCreatePayload, User } from "../types";

interface UseAdminDataOptions {
  token: string;
  setError: Dispatch<SetStateAction<string>>;
  setNotice: Dispatch<SetStateAction<string>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  clearMessages: () => void;
  reloadEvents: () => Promise<void>;
}

export function useAdminData(options: UseAdminDataOptions) {
  const { token, setError, setNotice, setLoading, clearMessages, reloadEvents } =
    options;
  const [pendingEvents, setPendingEvents] = useState<EventItem[]>([]);
  const [organizerUsers, setOrganizerUsers] = useState<User[]>([]);
  const [report, setReport] = useState<AdminReport | null>(null);

  const request = useCallback(
    <T,>(method: "get" | "post" | "patch" | "delete", url: string, data?: unknown) =>
      apiRequest<T>(method, url, token, data),
    [token],
  );

  const loadAdminData = useCallback(async () => {
    try {
      const [pending, summary, organizers] = await Promise.all([
        request<EventItem[]>("get", "/admin/events/pending"),
        request<AdminReport>("get", "/admin/reports/summary"),
        request<User[]>("get", "/admin/users/organizers"),
      ]);
      setPendingEvents(pending);
      setReport(summary);
      setOrganizerUsers(organizers);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }, [request, setError]);

  async function approveEvent(eventId: string) {
    try {
      await request<EventItem>("post", `/admin/events/${eventId}/approve`);
      setNotice("Eveniment publicat.");
      await Promise.all([reloadEvents(), loadAdminData()]);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function rejectEvent(eventId: string) {
    const reason = window.prompt("Motiv respingere");
    if (!reason) {
      return;
    }
    try {
      await request<EventItem>("post", `/admin/events/${eventId}/reject`, {
        rejection_reason: reason,
      });
      setNotice("Eveniment respins.");
      await loadAdminData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function createOrganizer(payload: OrganizerCreatePayload) {
    setLoading(true);
    clearMessages();
    try {
      await request<User>("post", "/admin/users/organizers", payload);
      setNotice("Utilizator organizer creat.");
      await loadAdminData();
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRole(userId: string, role: "organizer" | "admin") {
    try {
      await request<User>("patch", `/admin/users/${userId}`, { role });
      setNotice("Rol actualizat.");
      await loadAdminData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  return {
    pendingEvents,
    organizerUsers,
    report,
    loadAdminData,
    approveEvent,
    rejectEvent,
    createOrganizer,
    updateUserRole,
  };
}
