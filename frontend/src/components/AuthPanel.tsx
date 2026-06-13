import { LogOut } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import type { User } from "../types";

interface AuthPanelProps {
  user: User | null;
  logout: () => void;
}

export function AuthPanel(props: AuthPanelProps) {
  if (!props.user) {
    return null;
  }

  return (
    <section className="grid min-w-0 gap-3 border-t border-[#d7dfeb] pt-4">
      <div className="flex min-w-0 items-center gap-3 rounded-md p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#254591] text-sm font-semibold text-white">
          {userInitials(props.user.full_name)}
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <strong className="min-w-0 truncate text-sm text-[#192041]">
              {props.user.full_name}
            </strong>
            <Badge variant="neutral" className="shrink-0">
              {roleLabel(props.user.role)}
            </Badge>
          </div>
          <span className="block truncate text-xs text-[#667085]">
            {props.user.email}
          </span>
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="h-10 w-full justify-start"
        onClick={props.logout}
      >
        <LogOut />
        Deconectare
      </Button>
    </section>
  );
}

function userInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return initials.toUpperCase() || "U";
}

function roleLabel(role: User["role"]): string {
  const labels: Record<User["role"], string> = {
    admin: "Admin",
    organizer: "Organizator",
    student: "Student",
  };
  return labels[role];
}
