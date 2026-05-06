import {
  useCallback,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { apiRequest, getErrorMessage } from "../api/client";
import { emptyFilters } from "../state/forms";
import type { EventItem, FilterState } from "../types";
import { dateFilterToIso } from "../utils/date";

interface UseEventsOptions {
  token: string;
  setError: Dispatch<SetStateAction<string>>;
  setNotice: Dispatch<SetStateAction<string>>;
  setSelectedEventId: Dispatch<SetStateAction<string | null>>;
}

export function useEvents(options: UseEventsOptions) {
  const { token, setError, setNotice, setSelectedEventId } = options;
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [feedbackForm, setFeedbackForm] = useState({ rating: "5", comment: "" });

  const request = useCallback(
    <T,>(method: "get" | "post" | "patch" | "delete", url: string, data?: unknown) =>
      apiRequest<T>(method, url, token, data),
    [token],
  );

  const loadEvents = useCallback(async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (!value) {
        return;
      }
      if (key === "starts_from") {
        params.set(key, dateFilterToIso(value));
      } else if (key === "starts_until") {
        params.set(key, dateFilterToIso(value, true));
      } else {
        params.set(key, value);
      }
    });

    try {
      const suffix = params.size ? `?${params.toString()}` : "";
      const loadedEvents = await request<EventItem[]>("get", `/events${suffix}`);
      setEvents(loadedEvents);
      setSelectedEventId((current) => current || loadedEvents[0]?.id || null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }, [filters, request, setError, setSelectedEventId]);

  function setFilter(name: keyof FilterState, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  async function registerForEvent(eventId: string) {
    try {
      const updated = await request<EventItem>("post", `/events/${eventId}/register`);
      setEvents((current) =>
        current.map((event) => (event.id === eventId ? updated : event)),
      );
      setNotice("Inscriere inregistrata.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function submitFeedback(event: FormEvent, eventId: string) {
    event.preventDefault();
    try {
      await request("post", `/events/${eventId}/feedback`, {
        rating: Number(feedbackForm.rating),
        comment: feedbackForm.comment || null,
      });
      setFeedbackForm({ rating: "5", comment: "" });
      setNotice("Feedback salvat.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  return {
    events,
    filters,
    feedbackForm,
    setEvents,
    setFeedbackForm,
    loadEvents,
    setFilter,
    registerForEvent,
    submitFeedback,
  };
}
