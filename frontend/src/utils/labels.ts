import type { ParticipationMode } from "../types";

const participationModeLabels: Record<ParticipationMode, string> = {
  physical: "Fizic",
  online: "Online",
  hybrid: "Hibrid",
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

export function formatCategoryName(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  return categoryLabels[value.trim().toLowerCase()] ?? value;
}
