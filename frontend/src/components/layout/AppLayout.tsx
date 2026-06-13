import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { useLocation } from "react-router-dom";
import type { AppView, AuthMode, User } from "../../types";
import { Button } from "../ui/button";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  authMode: AuthMode;
  authForm: { full_name: string; email: string; password: string };
  loading: boolean;
  user: User | null;
  eventsCount: number;
  notice: string;
  error: string;
  children: ReactNode;
  setAuthMode: (mode: AuthMode) => void;
  setAuthForm: Dispatch<
    SetStateAction<{ full_name: string; email: string; password: string }>
  >;
  submitAuth: (event: FormEvent) => void;
  startGoogleLogin: () => void;
  logout: () => void;
  clearMessages: () => void;
}

export function AppLayout(props: AppLayoutProps) {
  const location = useLocation();
  const view = pathToView(location.pathname);

  return (
    <div className="grid min-h-screen bg-[#f5f7fb] text-[#192041] lg:grid-cols-[280px_minmax(0,1fr)]">
      <AppSidebar
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

      <main className="min-w-0 p-4 sm:p-5 lg:p-[22px]">
        <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4">
          <header className="flex items-center justify-between gap-4 border-b border-[#d7dfeb] pb-3 max-sm:flex-col max-sm:items-stretch">
            <div>
              <h1 className="m-0 text-3xl leading-tight text-[#192041]">
                {pageTitle(location.pathname, view)}
              </h1>
              <span className="text-sm text-[#667085]">
                {props.eventsCount} evenimente publicate
              </span>
            </div>
          </header>

          {(props.notice || props.error) && (
            <div
              className={[
                "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm",
                props.error
                  ? "bg-[rgba(39,46,83,0.08)] text-[#272E53]"
                  : "bg-[rgba(134,193,234,0.22)] text-[#254591]",
              ].join(" ")}
            >
              <span>{props.error || props.notice}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={props.clearMessages}
              >
                Inchide
              </Button>
            </div>
          )}

          {props.children}
        </div>
      </main>
    </div>
  );
}

function pathToView(pathname: string): AppView {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (
    segment === "calendar" ||
    segment === "organizer" ||
    segment === "admin" ||
    segment === "events"
  ) {
    return segment;
  }
  return "events";
}

function viewTitle(view: AppView): string {
  const titles: Record<AppView, string> = {
    events: "Evenimente",
    calendar: "Calendar",
    organizer: "Organizer",
    admin: "Admin",
  };
  return titles[view];
}

function pageTitle(pathname: string, view: AppView): string {
  if (pathname.startsWith("/events/")) {
    return "Detalii eveniment";
  }
  if (pathname === "/organizer/events/new") {
    return "Eveniment nou";
  }
  if (pathname.startsWith("/organizer/events/") && pathname.endsWith("/edit")) {
    return "Editare eveniment";
  }
  if (pathname.startsWith("/organizer/events/")) {
    return "Management eveniment";
  }
  return viewTitle(view);
}
