import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Lock } from "lucide-react";
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
import type { User } from "../types";

interface SetPasswordPageProps {
  loading: boolean;
  token: string;
  user: User | null;
  setPassword: (password: string) => Promise<boolean>;
}

export function SetPasswordPage(props: SetPasswordPageProps) {
  const [password, setPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const [localError, setLocalError] = useState("");

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    setLocalError("");

    if (password !== confirmedPassword) {
      setLocalError("Parolele nu coincid.");
      return;
    }

    const updated = await props.setPassword(password);
    if (updated) {
      setPassword("");
      setConfirmedPassword("");
      setSaved(true);
    }
  }

  if (!props.user && !props.token && !window.location.hash.includes("access_token")) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-170px)] w-full max-w-[480px] items-center">
      <Card className="w-full overflow-hidden shadow-sm">
        <CardHeader className="gap-3 border-b border-[#d7dfeb] bg-[rgba(134,193,234,0.10)]">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-1.5">
              <CardTitle className="text-2xl">Setare parola</CardTitle>
              <CardDescription>
                Alege parola pentru contul tau de organizator.
              </CardDescription>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white text-[#254591] shadow-sm ring-1 ring-[#d7dfeb]">
              <Lock className="h-5 w-5" />
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 p-5">
          {saved ? (
            <div className="grid gap-4">
              <p className="rounded-md border border-[#86C1EA] bg-[rgba(134,193,234,0.12)] px-3 py-3 text-sm text-[#192041]">
                Parola a fost setata. Te poti autentifica folosind emailul si parola
                alese.
              </p>
              <Button asChild>
                <Link to="/organizer">Continua</Link>
              </Button>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={submitPassword}>
              <div className="grid gap-2">
                <Label>Parola</Label>
                <Input
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minim 8 caractere"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Confirma parola</Label>
                <Input
                  type="password"
                  minLength={8}
                  value={confirmedPassword}
                  onChange={(event) => setConfirmedPassword(event.target.value)}
                  placeholder="Reintrodu parola"
                  required
                />
              </div>
              {localError && <p className="text-sm text-red-600">{localError}</p>}
              <Button className="h-11" disabled={props.loading}>
                Salveaza parola
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
