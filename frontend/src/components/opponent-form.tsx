import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { OptionGroup } from "@/components/ui/option-group";
import { Textarea } from "@/components/ui/textarea";
import { useScrollToFieldError } from "@/hooks/use-scroll-to-field-error";
import { SportMultiSelect } from "@/components/sport-multi-select";
import { HANDEDNESS_OPTIONS, OPPONENT_CLASS_OPTIONS } from "@/lib/constants";
import { findOpponentByName, type OpponentPayload } from "@/lib/api";
import { sportsOrTennis, type PlayerSport } from "@/lib/player-sports";
import { meQueryOptions } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";

export type OpponentFormValues = {
  name: string;
  handedness: string;
  class: string;
  strengths: string;
  weaknesses: string;
  notes: string;
  sports: PlayerSport[];
};

type OpponentFormProps = {
  defaultValues?: Partial<OpponentFormValues>;
  submitLabel: string;
  pending?: boolean;
  ignoreId?: string;
  defaultSports?: string[];
  lockSports?: boolean;
  onSubmit: (payload: OpponentPayload) => void;
};

const handednessOptions = HANDEDNESS_OPTIONS.map((option) => ({ value: option, label: option }));

export function OpponentForm({
  defaultValues,
  submitLabel,
  pending,
  ignoreId,
  defaultSports,
  lockSports = false,
  onSubmit,
}: OpponentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [checking, setChecking] = useState(false);
  const [duplicateName, setDuplicateName] = useState<string | null>(null);
  const pendingPayload = useRef<OpponentPayload | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, submitCount },
  } = useForm<OpponentFormValues>({
    defaultValues: {
      name: "",
      handedness: "Destro",
      class: "",
      strengths: "",
      weaknesses: "",
      notes: "",
      sports: sportsOrTennis(defaultSports),
      ...defaultValues,
    },
  });
  const { data: user } = useQuery(meQueryOptions());
  useScrollToFieldError(formRef, submitCount);
  const seededSports = useRef(Boolean(defaultValues?.sports || defaultSports));
  useEffect(() => {
    if (seededSports.current || !user?.sports?.length) {
      return;
    }
    seededSports.current = true;
    setValue("sports", sportsOrTennis(user.sports));
  }, [setValue, user?.sports]);

  function toPayload(values: OpponentFormValues): OpponentPayload {
    return {
      name: values.name,
      handedness: values.handedness,
      class: values.class,
      strengths: values.strengths,
      weaknesses: values.weaknesses,
      notes: values.notes,
      sports: values.sports,
    };
  }

  return (
    <form
      ref={formRef}
      className="grid gap-4"
      onSubmit={handleSubmit(async (values) => {
        const payload = toPayload(values);
        setDuplicateName(null);
        setChecking(true);
        try {
          const existing = await findOpponentByName(payload.name, ignoreId);
          if (existing) {
            pendingPayload.current = payload;
            setDuplicateName(existing.name);
            return;
          }
        } catch {
          // A failed lookup should not block saving the opponent.
        } finally {
          setChecking(false);
        }

        onSubmit(payload);
      })}
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

      <Field label="Classe" htmlFor="opponent-class" error={errors.class?.message}>
        <NativeSelect
          id="opponent-class"
          aria-invalid={errors.class ? true : undefined}
          {...register("class", { required: "Selecione a classe." })}
        >
          <option value="">Selecione a classe</option>
          {OPPONENT_CLASS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label="Esportes" htmlFor="opponent-sports" error={errors.sports?.message}>
        <Controller
          control={control}
          name="sports"
          rules={{ validate: (value) => value.length > 0 || "Escolha pelo menos um esporte." }}
          render={({ field }) => (
            <SportMultiSelect
              value={lockSports && defaultSports ? sportsOrTennis(defaultSports) : field.value}
              invalid={Boolean(errors.sports)}
              onChange={(next) => field.onChange(lockSports && defaultSports ? sportsOrTennis(defaultSports) : next)}
            />
          )}
        />
        {lockSports ? (
          <p className="text-xs text-muted-foreground">Este adversário entra já marcado neste esporte. Você pode incluir outros depois.</p>
        ) : user?.sports && user.sports.length === 1 ? (
          <p className="text-xs text-muted-foreground">Sugerimos o esporte do seu perfil. Ajuste se a pessoa joga outros.</p>
        ) : null}
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

      {duplicateName ? (
        <div role="alert" className="grid gap-3 rounded-xl bg-warning/10 px-3 py-3 text-sm">
          <p>
            Já existe um adversário chamado <span className="font-semibold">{duplicateName}</span>. O
            nome repete na lista e no seletor de partidas. Deseja cadastrar mesmo assim?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => setDuplicateName(null)}>
              Voltar
            </Button>
            <Button
              type="button"
              onClick={() => {
                const payload = pendingPayload.current;
                setDuplicateName(null);
                if (payload) {
                  onSubmit(payload);
                }
              }}
            >
              Continuar mesmo assim
            </Button>
          </div>
        </div>
      ) : null}

      <Button type="submit" size="lg" loading={pending || checking}>
        {pending ? "Salvando..." : checking ? "Verificando..." : submitLabel}
      </Button>
    </form>
  );
}
