import type { EventItem, EventStatus } from "../types";
import { formatEventStatus } from "../utils/labels";
import { Badge } from "./ui/badge";
import type { BadgeProps } from "./ui/badge";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

const eventStatusConfig: Record<
  EventStatus,
  { variant: BadgeVariant }
> = {
  draft: { variant: "neutral" },
  pending_approval: { variant: "warning" },
  published: { variant: "info" },
  rejected: { variant: "danger" },
  cancelled: { variant: "danger" },
  completed: { variant: "success" },
};

const eventTimingConfig: Record<
  EventTimingStatus,
  { label: string; variant: BadgeVariant }
> = {
  upcoming: { label: "Urmeaza", variant: "info" },
  ongoing: { label: "In desfasurare", variant: "success" },
  finished: { label: "Finalizat", variant: "neutral" },
};

const registrationStatusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  registered: { label: "Inscris", variant: "info" },
  checked_in: { label: "Check-in efectuat", variant: "success" },
  waitlisted: { label: "Lista de asteptare", variant: "warning" },
  cancelled: { label: "Anulat", variant: "danger" },
};

export type EventTimingStatus = "upcoming" | "ongoing" | "finished";

export function StatusBadge({ status }: { status: EventStatus }) {
  const config = eventStatusConfig[status];

  return <Badge variant={config.variant}>{formatEventStatus(status)}</Badge>;
}

export function EventTimingBadge({
  event,
}: {
  event: Pick<EventItem, "starts_at" | "ends_at">;
}) {
  const timing = getEventTiming(event);
  const config = eventTimingConfig[timing];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function RegistrationStatusBadge({ status }: { status: string }) {
  const config = registrationStatusConfig[status] ?? {
    label: status,
    variant: "neutral" as const,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function getEventTiming(
  event: Pick<EventItem, "starts_at" | "ends_at">,
): EventTimingStatus {
  const now = Date.now();
  const startsAt = new Date(event.starts_at).getTime();
  const endsAt = event.ends_at ? new Date(event.ends_at).getTime() : startsAt;

  if (Number.isNaN(startsAt)) {
    return "upcoming";
  }

  if (now < startsAt) {
    return "upcoming";
  }

  if (Number.isNaN(endsAt) || now <= endsAt) {
    return "ongoing";
  }

  return "finished";
}
