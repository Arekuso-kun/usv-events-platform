import type { EventStatus } from "../types";
import { Badge } from "./ui/badge";

export function StatusBadge({ status }: { status: EventStatus }) {
  const variant =
    status === "published" || status === "completed" ? "default" : "secondary";

  return <Badge variant={variant}>{status}</Badge>;
}
