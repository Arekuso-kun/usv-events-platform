import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { GraduationCap, Lock, Mail, UserRound } from "lucide-react";
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
import { Label } from "../components/ui/label";
import type { AuthMode } from "../types";

interface LoginPageProps {
  authMode: AuthMode;
  authForm: { full_name: string; email: string; password: string };
  loading: boolean;
  setAuthMode: (mode: AuthMode) => void;
  setAuthForm: Dispatch<
    SetStateAction<{ full_name: string; email: string; password: string }>
  >;
  submitAuth: (event: FormEvent) => void;
  startGoogleLogin: () => void;
}

export function LoginPage(props: LoginPageProps) {
  const isLogin = props.authMode === "login";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-170px)] w-full max-w-[480px] items-center">
      <Card className="w-full overflow-hidden shadow-sm">
        <CardHeader className="gap-3 border-b border-[#d7dfeb] bg-[rgba(134,193,234,0.10)]">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-1.5">
              <Badge className="w-fit">Autentificare</Badge>
              <CardTitle className="text-2xl">
                {isLogin ? "Conectare" : "Creare cont"}
              </CardTitle>
              <CardDescription>
                {isLogin
                  ? "Intra in cont pentru a continua."
                  : "Creeaza un cont nou pentru platforma."}
              </CardDescription>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white text-[#254591] shadow-sm ring-1 ring-[#d7dfeb]">
              <Lock className="h-5 w-5" />
            </span>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-5">
          <div className="grid grid-cols-2 rounded-md border border-[#d7dfeb] bg-[rgba(39,46,83,0.06)] p-1">
            <Button
              type="button"
              variant="ghost"
              className={segmentButtonClass(isLogin)}
              onClick={() => props.setAuthMode("login")}
            >
              Conectare
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={segmentButtonClass(props.authMode === "register")}
              onClick={() => props.setAuthMode("register")}
            >
              Cont nou
            </Button>
          </div>

          <form className="grid gap-4" onSubmit={props.submitAuth}>
            {props.authMode === "register" && (
              <Field label="Nume complet" icon={<UserRound className="h-4 w-4" />}>
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
              </Field>
            )}
            <Field label="Email" icon={<Mail className="h-4 w-4" />}>
              <Input
                type="email"
                value={props.authForm.email}
                onChange={(event) =>
                  props.setAuthForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="email@usv.ro"
                required
              />
            </Field>
            <Field label="Parola" icon={<Lock className="h-4 w-4" />}>
              <Input
                type="password"
                value={props.authForm.password}
                onChange={(event) =>
                  props.setAuthForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="Parola"
                required
              />
            </Field>
            <Button className="h-11" disabled={props.loading}>
              {isLogin ? "Conectare" : "Creeaza cont"}
            </Button>
          </form>

          <div className="grid gap-3">
            <div className="flex items-center gap-3 text-xs text-[#667085]">
              <span className="h-px flex-1 bg-[#d7dfeb]" />
              <span>Studenti</span>
              <span className="h-px flex-1 bg-[#d7dfeb]" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={props.startGoogleLogin}
            >
              <GraduationCap />
              Continua cu Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field(props: { children: ReactNode; icon: ReactNode; label: string }) {
  return (
    <div className="grid gap-2">
      <Label className="flex items-center gap-2 text-[#272E53]">
        <span className="text-[#254591]">{props.icon}</span>
        {props.label}
      </Label>
      {props.children}
    </div>
  );
}

function segmentButtonClass(active: boolean): string {
  return [
    "h-9 rounded px-3 py-2 text-sm font-medium transition-colors hover:bg-white",
    active
      ? "bg-white text-[#192041] shadow-sm"
      : "text-[#667085] hover:text-[#192041]",
  ].join(" ");
}
