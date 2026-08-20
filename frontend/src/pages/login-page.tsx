import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { loginAndLoadUser, meQueryKey } from "@/lib/queries";

type LoginFormValues = {
  email: string;
  password: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: ({ email, password }: LoginFormValues) => loginAndLoadUser(email, password),
    onSuccess: async (user) => {
      queryClient.setQueryData(meQueryKey, user);
      await navigate({ to: "/", replace: true });
    },
  });

  return (
    <AuthShell
      title="ScoreHistory"
      description="Acompanhe suas partidas, evolua a cada jogo."
      footer={
        <>
          Não tem conta?{" "}
          <Link to="/cadastro" className="font-medium text-foreground underline-offset-4 hover:underline">
            Criar usuário
          </Link>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="seu@email.com"
            aria-invalid={errors.email ? true : undefined}
            {...register("email", {
              required: "Informe o email.",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Informe um email válido.",
              },
            })}
          />
        </Field>

        <Field label="Senha" htmlFor="password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            aria-invalid={errors.password ? true : undefined}
            {...register("password", { required: "Informe a senha." })}
          />
        </Field>

        {mutation.isError ? (
          <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : "Falha no login."}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="mt-1" loading={mutation.isPending}>
          {mutation.isPending ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </AuthShell>
  );
}
