import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import {
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import usvLogo from "../../assets/usv_logo.png";
import { cn } from "../../lib/utils";
import type { AuthMode, User } from "../../types";
import { AuthPanel } from "../AuthPanel";

interface AppSidebarProps {
  authMode: AuthMode;
  authForm: { full_name: string; email: string; password: string };
  loading: boolean;
  user: User | null;
  setAuthMode: (mode: AuthMode) => void;
  setAuthForm: Dispatch<
    SetStateAction<{ full_name: string; email: string; password: string }>
  >;
  submitAuth: (event: FormEvent) => void;
  startGoogleLogin: () => void;
  logout: () => void;
}

export function AppSidebar(props: AppSidebarProps) {
  return (
    <aside className="flex flex-col border-r border-[#d7dfeb] bg-white/95 p-4 text-[#192041] shadow-[8px_0_24px_rgba(25,32,65,0.04)] lg:sticky lg:top-0 lg:h-screen">
      <div className="px-1 py-2">
        <div className="flex min-h-12 items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md">
            <img className="h-12 w-12 object-contain" src={usvLogo} alt="USV" />
          </span>
          <div className="min-w-0">
            <strong className="block text-sm leading-tight text-[#192041]">
              Platforma Evenimente
            </strong>
            <span className="block truncate text-xs text-[#667085]">
              Univ. Stefan cel Mare
            </span>
          </div>
        </div>
      </div>

      <nav className="mt-5 flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        <NavSection title="Studenti">
          <SidebarLink icon={GraduationCap} to="/events" label="Evenimente" />
          <SidebarLink icon={CalendarDays} to="/calendar" label="Calendar" />
        </NavSection>
        <NavSection title="Organizatori">
          <SidebarLink
            end
            icon={LayoutDashboard}
            to="/organizer"
            label="Evenimentele mele"
          />
          <SidebarLink
            icon={PlusCircle}
            to="/organizer/events/new"
            label="Creeaza eveniment"
          />
        </NavSection>
        <NavSection title="Admin">
          <SidebarLink icon={ShieldCheck} to="/admin" label="Administrare" />
        </NavSection>
      </nav>

      {props.user ? (
        <div className="mt-4">
          <AuthPanel
            authMode={props.authMode}
            authForm={props.authForm}
            loading={props.loading}
            user={props.user}
            setAuthMode={props.setAuthMode}
            setAuthForm={props.setAuthForm}
            submitAuth={props.submitAuth}
            startGoogleLogin={props.startGoogleLogin}
            logout={props.logout}
          />
        </div>
      ) : (
        <div className="mt-4 border-t border-[#d7dfeb] pt-4">
          <NavLink
            to="/login"
            className={({ isActive }) =>
              cn(
                "inline-flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-[#192041] no-underline transition-colors",
                "hover:bg-[rgba(134,193,234,0.22)] hover:text-[#254591]",
                isActive &&
                  "bg-[rgba(134,193,234,0.26)] text-[#254591] shadow-sm ring-1 ring-[#86C1EA]/45",
              )
            }
          >
            <LogIn className="h-4 w-4" />
            Autentificare
          </NavLink>
        </div>
      )}
    </aside>
  );
}

function NavSection(props: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-[#667085]">
        {props.title}
      </span>
      <div className="grid gap-1">{props.children}</div>
    </div>
  );
}

function SidebarLink(props: {
  end?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to: string;
}) {
  const Icon = props.icon;
  return (
    <NavLink
      end={props.end}
      to={props.to}
      className={({ isActive }) =>
        cn(
          "group relative inline-flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-[#192041] no-underline transition-colors",
          "hover:bg-[rgba(134,193,234,0.22)] hover:text-[#254591]",
          isActive &&
            "bg-[rgba(134,193,234,0.26)] text-[#254591] shadow-sm ring-1 ring-[#86C1EA]/45",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-transparent transition-colors",
              isActive && "bg-[#254591]",
            )}
          />
          <Icon
            className={cn(
              "h-4 w-4 text-[#667085] transition-colors group-hover:text-[#254591]",
              isActive && "text-[#254591]",
            )}
          />
          <span>{props.label}</span>
        </>
      )}
    </NavLink>
  );
}
