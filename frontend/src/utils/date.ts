import type { EventItem, CalendarDay } from "../types";

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function toApiDateTime(value: string): string | null {
  if (!value) {
    return null;
  }
  return new Date(value).toISOString();
}

export function dateFilterToIso(value: string, endOfDay = false): string {
  const suffix = endOfDay ? "T23:59:59" : "T00:00:00";
  return new Date(`${value}${suffix}`).toISOString();
}

export function getGoogleCalendarUrl(event: EventItem): string {
  const start = new Date(event.starts_at)
    .toISOString()
    .replace(/[-:]|\.\d{3}/g, "");
  const end = new Date(event.ends_at || event.starts_at)
    .toISOString()
    .replace(/[-:]|\.\d{3}/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description || "",
    location: event.venue_name || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildCalendarDays(events: EventItem[]): CalendarDay[] {
  const base = new Date();
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      date,
      inMonth: date.getMonth() === base.getMonth(),
      events: events.filter((event) => event.starts_at.slice(0, 10) === key),
    };
  });
}
