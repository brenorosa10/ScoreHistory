import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { meQueryKey, registerAndLoadUser } from "@/lib/queries";

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
};

export function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: ({ email, password, name }: RegisterFormValues) =>
      registerAndLoadUser(email, password, name),
    onSuccess: async (user) => {
      queryClient.setQueryData(meQueryKey, user);
      await navigate({ to: "/", replace: true });
    },
  });

  return (
    <AuthShell
      title="Criar conta"
      description="Comece a registrar seus jogos e a evolução em quadra."
      footer={
        <>
          Já tem conta?{" "}
          <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <Field label="Nome" htmlFor="name" hint="opcional">
          <Input id="name" autoComplete="name" placeholder="Como quer ser chamado" {...register("name")} />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
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

        <Field
          label="Senha"
          htmlFor="password"
          hint="mín. 8 caracteres"
          error={errors.password?.message}
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Crie uma senha"
            aria-invalid={errors.password ? true : undefined}
            {...register("password", {
              required: "Informe a senha.",
              minLength: {
                value: 8,
                message: "A senha deve ter pelo menos 8 caracteres.",
              },
            })}
          />
        </Field>

        {mutation.isError ? (
          <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Não foi possível criar o usuário."}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="mt-1" disabled={mutation.isPending}>
          {mutation.isPending ? "Criando..." : "Criar conta"}
        </Button>
      </form>
    </AuthShell>
  );
}
