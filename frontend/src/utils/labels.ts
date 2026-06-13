import type { EventStatus, ParticipationMode } from "../types";

const participationModeLabels: Record<ParticipationMode, string> = {
  physical: "Fizic",
  online: "Online",
  hybrid: "Hibrid",
};

const eventStatusLabels: Record<EventStatus, string> = {
  draft: "Ciorna",
  pending_approval: "In asteptare",
  published: "Publicat",
  rejected: "Respins",
  cancelled: "Anulat",
  completed: "Finalizat",
};

const categoryLabels: Record<string, string> = {
  academic: "Academic",
  career: "Cariera",
  culture: "Cultura",
  sport: "Sport",
  workshop: "Workshop",
};

export function formatParticipationMode(value: ParticipationMode): string {
  return participationModeLabels[value] ?? value;
}

export function formatEventStatus(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return eventStatusLabels[value as EventStatus] ?? value;
}

export function formatCategoryName(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return categoryLabels[value.trim().toLowerCase()] ?? value;
}
