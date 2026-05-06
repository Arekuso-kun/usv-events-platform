import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { GraduationCap, Lock, Mail } from "lucide-react";
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

interface LoginPageProps {
  authForm: { full_name: string; email: string; password: string };
  loading: boolean;
  setAuthForm: Dispatch<
    SetStateAction<{ full_name: string; email: string; password: string }>
  >;
  submitAuth: (event: FormEvent) => void;
  startGoogleLogin: () => void;
}

export function LoginPage(props: LoginPageProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-170px)] w-full max-w-[480px] items-center">
      <Card className="w-full overflow-hidden shadow-sm">
        <CardHeader className="gap-3 border-b border-[#d7dfeb] bg-[rgba(134,193,234,0.10)]">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-1.5">
              <Badge className="w-fit">Autentificare</Badge>
              <CardTitle className="text-2xl">Conectare</CardTitle>
              <CardDescription>
                Organizatorii si administratorii folosesc email si parola.
              </CardDescription>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white text-[#254591] shadow-sm ring-1 ring-[#d7dfeb]">
              <Lock className="h-5 w-5" />
            </span>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-5">
          <form className="grid gap-4" onSubmit={props.submitAuth}>
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
              Conectare
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
          <p className="text-center text-xs text-[#667085]">
            Conturile de organizator sunt create de administrator.
          </p>
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
