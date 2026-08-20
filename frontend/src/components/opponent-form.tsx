import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { OptionGroup } from "@/components/ui/option-group";
import { Textarea } from "@/components/ui/textarea";
import { HANDEDNESS_OPTIONS } from "@/lib/constants";
import type { OpponentPayload } from "@/lib/api";

export type OpponentFormValues = {
  name: string;
  handedness: string;
  strengths: string;
  weaknesses: string;
  notes: string;
};

type OpponentFormProps = {
  defaultValues?: Partial<OpponentFormValues>;
  submitLabel: string;
  pending?: boolean;
  onSubmit: (payload: OpponentPayload) => void;
};

const handednessOptions = HANDEDNESS_OPTIONS.map((option) => ({ value: option, label: option }));

export function OpponentForm({ defaultValues, submitLabel, pending, onSubmit }: OpponentFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OpponentFormValues>({
    defaultValues: {
      name: "",
      handedness: "Destro",
      strengths: "",
      weaknesses: "",
      notes: "",
      ...defaultValues,
    },
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={handleSubmit((values) =>
        onSubmit({
          name: values.name,
          handedness: values.handedness,
          strengths: values.strengths,
          weaknesses: values.weaknesses,
          notes: values.notes,
        }),
      )}
    >
      <Field label="Nome" htmlFor="opponent-name" error={errors.name?.message}>
        <Input
          id="opponent-name"
          placeholder="Nome do adversário"
          autoComplete="off"
          aria-invalid={errors.name ? true : undefined}
          {...register("name", { required: "Informe o nome." })}
        />
      </Field>

      <Field label="Mão dominante" htmlFor="handedness">
        <Controller
          control={control}
          name="handedness"
          render={({ field }) => (
            <OptionGroup
              name="handedness"
              columns={2}
              options={handednessOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Field>

      <Field label="Pontos fortes" htmlFor="opponent-strengths" hint="opcional">
        <Textarea
          id="opponent-strengths"
          placeholder="Saque, forehand, jogo na rede..."
          {...register("strengths")}
        />
      </Field>

      <Field label="Pontos fracos" htmlFor="opponent-weaknesses" hint="opcional">
        <Textarea
          id="opponent-weaknesses"
          placeholder="Backhand, segundo saque, mobilidade..."
          {...register("weaknesses")}
        />
      </Field>

      <Field label="Observações" htmlFor="opponent-notes" hint="opcional">
        <Textarea
          id="opponent-notes"
          placeholder="Estilo de jogo, histórico, anotações..."
          {...register("notes")}
        />
      </Field>

      <Button type="submit" size="lg" loading={pending}>
        {pending ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
