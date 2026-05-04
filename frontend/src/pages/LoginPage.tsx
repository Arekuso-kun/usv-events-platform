import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import type { AuthMode, User } from "../types";

interface LoginPageProps {
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

export function LoginPage(props: LoginPageProps) {
  if (props.user) {
    return (
      <Card className="mx-auto mt-9 w-full max-w-[460px]">
        <CardHeader>
          <Badge className="mb-2 w-fit">Sesiune activa</Badge>
          <CardTitle>{props.user.full_name}</CardTitle>
          <CardDescription>{props.user.email}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Badge variant="secondary" className="w-fit">
            {props.user.role}
          </Badge>
          <Button variant="secondary" onClick={props.logout}>
            Logout
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto mt-9 w-full max-w-[460px]">
      <CardHeader>
        <Badge className="mb-2 w-fit">Autentificare</Badge>
        <CardTitle>Conectare la USV Events</CardTitle>
        <CardDescription>Acceseaza evenimentele si instrumentele platformei.</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 rounded-md bg-[rgba(39,46,83,0.08)] p-1">
          <button
            type="button"
            className={segmentButtonClass(props.authMode === "login")}
            onClick={() => props.setAuthMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={segmentButtonClass(props.authMode === "register")}
            onClick={() => props.setAuthMode("register")}
          >
            Register
          </button>
        </div>

        <form className="grid gap-3" onSubmit={props.submitAuth}>
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
      </CardContent>
    </Card>
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
