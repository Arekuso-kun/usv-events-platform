import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { NavLink } from "react-router-dom";
import usvLogo from "../../assets/usv_logo.png";
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
    <aside className="flex flex-col gap-5 border-r border-[#d7dfeb] bg-white p-5 lg:sticky lg:top-0 lg:h-screen">
      <div className="flex min-h-12 items-center gap-3">
        <img
          className="h-[54px] w-[54px] shrink-0 object-contain"
          src={usvLogo}
          alt="USV"
        />
        <div>
          <strong className="block text-[#192041]">Events</strong>
          <span className="block text-sm text-[#667085]">
            Platforma universitara
          </span>
        </div>
      </div>

      <nav className="flex flex-col gap-2">
        <NavSection title="Studenti">
          <NavLink className={({ isActive }) => navLinkClass(isActive)} to="/events">
            Evenimente
          </NavLink>
          <NavLink
            className={({ isActive }) => navLinkClass(isActive)}
            to="/calendar"
          >
            Calendar
          </NavLink>
        </NavSection>
        <NavSection title="Organizatori">
          <NavLink
            end
            className={({ isActive }) => navLinkClass(isActive)}
            to="/organizer"
          >
            Management
          </NavLink>
          <NavLink
            className={({ isActive }) => navLinkClass(isActive)}
            to="/organizer/events/new"
          >
            Creeaza eveniment
          </NavLink>
        </NavSection>
        <NavSection title="Admin">
          <NavLink className={({ isActive }) => navLinkClass(isActive)} to="/admin">
            Admin
          </NavLink>
        </NavSection>
      </nav>

      {props.user ? (
        <div className="mt-auto">
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
        <div className="mt-auto border-t border-[#d7dfeb] pt-4">
          <NavLink className={({ isActive }) => loginLinkClass(isActive)} to="/login">
            Login
          </NavLink>
        </div>
      )}
    </aside>
  );
}

function NavSection(props: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 pt-2">
      <span className="px-3 pb-1.5 text-[11px] font-bold uppercase text-[#667085]">
        {props.title}
      </span>
      {props.children}
    </div>
  );
}

function navLinkClass(isActive: boolean): string {
  return [
    "rounded-md px-3 py-2.5 text-sm text-[#192041] no-underline transition-colors",
    "hover:bg-[rgba(134,193,234,0.22)] hover:text-[#254591]",
    isActive ? "bg-[rgba(134,193,234,0.22)] text-[#254591]" : "",
  ].join(" ");
}

function loginLinkClass(isActive: boolean): string {
  return [
    "inline-flex min-h-10 w-full items-center justify-center rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors",
    "bg-[rgba(134,193,234,0.22)] text-[#192041] hover:bg-[rgba(134,193,234,0.34)]",
    isActive ? "text-[#254591]" : "",
  ].join(" ");
}
