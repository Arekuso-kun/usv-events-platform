import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { apiBlobRequest, apiRequest, getErrorMessage } from "../api/client";
import type { EventItem, EventStats, EventStatus, Registration, User } from "../types";

interface UseManagedEventsOptions {
  token: string;
  user: User | null;
  events: EventItem[];
  pendingEvents: EventItem[];
  selectedEventId: string | null;
  setSelectedEventId: Dispatch<SetStateAction<string | null>>;
  setError: Dispatch<SetStateAction<string>>;
  setNotice: Dispatch<SetStateAction<string>>;
  reloadEvents: () => Promise<void>;
  reloadAdmin: () => Promise<void>;
}

export function useManagedEvents(options: UseManagedEventsOptions) {
  const {
    token,
    user,
    events,
    pendingEvents,
    selectedEventId,
    setSelectedEventId,
    setError,
    setNotice,
    reloadEvents,
    reloadAdmin,
  } = options;
  const [managedEvents, setManagedEvents] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);

  const request = useCallback(
    <T,>(method: "get" | "post" | "patch" | "delete", url: string, data?: unknown) =>
      apiRequest<T>(method, url, token, data),
    [token],
  );

  const selectedEvent = useMemo(
    () =>
      events.find((event) => event.id === selectedEventId) ||
      managedEvents.find((event) => event.id === selectedEventId) ||
      pendingEvents.find((event) => event.id === selectedEventId) ||
      null,
    [events, managedEvents, pendingEvents, selectedEventId],
  );

  const canManageSelected =
    Boolean(user && selectedEvent) &&
    (user?.role === "admin" || selectedEvent?.creator_id === user?.id);

  const loadManagedEvents = useCallback(async () => {
    try {
      const loadedEvents = await request<EventItem[]>("get", "/events/manage/mine");
      setManagedEvents(loadedEvents);
      setSelectedEventId((current) => current || loadedEvents[0]?.id || null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }, [request, setError, setSelectedEventId]);

  const loadManagerData = useCallback(
    async (eventId: string) => {
      try {
        const [registrationData, statsData] = await Promise.all([
          request<Registration[]>("get", `/events/${eventId}/registrations`),
          request<EventStats>("get", `/events/${eventId}/stats`),
        ]);
        setRegistrations(registrationData);
        setStats(statsData);
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      }
    },
    [request, setError],
  );

  const clearManagerData = useCallback(() => {
    setRegistrations([]);
    setStats(null);
  }, []);

  async function deleteManagedEvent(eventId: string) {
    const confirmed = window.confirm("Stergi definitiv acest eveniment?");
    if (!confirmed) {
      return false;
    }
    try {
      await request("delete", `/events/${eventId}`);
      setNotice("Eveniment sters.");
      setSelectedEventId((current) => (current === eventId ? null : current));
      await Promise.all([reloadEvents(), loadManagedEvents()]);
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      return false;
    }
  }

  async function updateSelectedEventStatus(status: EventStatus) {
    if (!selectedEvent) {
      return;
    }
    try {
      await request<EventItem>("patch", `/events/${selectedEvent.id}`, { status });
      setNotice("Status actualizat.");
      await Promise.all([
        reloadEvents(),
        loadManagedEvents(),
        user?.role === "admin" ? reloadAdmin() : Promise.resolve(),
        loadManagerData(selectedEvent.id),
      ]);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function exportRegistrations(eventId: string) {
    try {
      const blob = await apiBlobRequest(
        `/events/${eventId}/registrations/export`,
        token,
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `event-${eventId}-registrations.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function checkIn(eventId: string, registrationId: string) {
    try {
      await request(
        "post",
        `/events/${eventId}/registrations/${registrationId}/check-in`,
      );
      setNotice("Check-in facut.");
      await loadManagerData(eventId);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  return {
    managedEvents,
    registrations,
    stats,
    selectedEvent,
    canManageSelected,
    loadManagedEvents,
    loadManagerData,
    clearManagerData,
    deleteManagedEvent,
    updateSelectedEventStatus,
    exportRegistrations,
    checkIn,
  };
}
