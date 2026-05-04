import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { AuthMode, User } from "../types";

interface AuthPanelProps {
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

export function AuthPanel(props: AuthPanelProps) {
  if (props.user) {
    return (
      <section className="grid gap-2 border-t border-[#d7dfeb] pt-4">
        <Badge className="w-fit">Sesiune</Badge>
        <strong className="text-sm text-[#192041]">{props.user.full_name}</strong>
        <span className="text-xs text-[#667085]">{props.user.role}</span>
        <span className="break-all text-xs text-[#667085]">{props.user.email}</span>
        <Button type="button" variant="secondary" onClick={props.logout}>
          Logout
        </Button>
      </section>
    );
  }

  return (
    <section className="grid gap-3 border-t border-[#d7dfeb] pt-4">
      <div className="grid grid-cols-2 rounded-md bg-[rgba(39,46,83,0.08)] p-1">
        <button
          className={segmentButtonClass(props.authMode === "login")}
          onClick={() => props.setAuthMode("login")}
          type="button"
        >
          Login
        </button>
        <button
          className={segmentButtonClass(props.authMode === "register")}
          onClick={() => props.setAuthMode("register")}
          type="button"
        >
          Register
        </button>
      </div>
      <form onSubmit={props.submitAuth} className="grid gap-2">
        {props.authMode === "register" && (
          <Input
            value={props.authForm.full_name}
            onChange={(event) =>
              props.setAuthForm((current) => ({
                ...current,
                full_name: event.target.value,
              }))
            }
            placeholder="Nume complet"
            required
          />
        )}
        <Input
          type="email"
          value={props.authForm.email}
          onChange={(event) =>
            props.setAuthForm((current) => ({ ...current, email: event.target.value }))
          }
          placeholder="email"
          required
        />
        <Input
          type="password"
          value={props.authForm.password}
          onChange={(event) =>
            props.setAuthForm((current) => ({
              ...current,
              password: event.target.value,
            }))
          }
          placeholder="parola"
          required
        />
        <Button disabled={props.loading}>
          {props.authMode === "login" ? "Login" : "Creeaza cont"}
        </Button>
      </form>
      <Button type="button" variant="secondary" onClick={props.startGoogleLogin}>
        Google student
      </Button>
    </section>
  );
}

function segmentButtonClass(active: boolean): string {
  return [
    "rounded px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-white text-[#192041] shadow-sm"
      : "text-[#667085] hover:text-[#192041]",
  ].join(" ");
}
