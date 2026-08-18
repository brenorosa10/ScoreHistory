import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAndLoadUser, meQueryKey } from "@/lib/queries";

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("admin@scorehistory.local");
  const [password, setPassword] = useState("Admin123!");

  const mutation = useMutation({
    mutationFn: () => loginAndLoadUser(email, password),
    onSuccess: async (user) => {
      queryClient.setQueryData(meQueryKey, user);
      await navigate({ to: "/", replace: true });
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ScoreHistory</CardTitle>
          <CardDescription>Entre para acessar o sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          {mutation.isError ? (
            <p className="mt-4 text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : "Falha no login."}
            </p>
          ) : null}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link to="/cadastro" className="text-foreground underline-offset-4 hover:underline">
              Criar usuário
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
