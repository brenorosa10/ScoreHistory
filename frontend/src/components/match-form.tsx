import { Controller, useForm } from "react-hook-form";
import { OpponentPicker } from "@/components/opponent-picker";
import { ScoreBuilder } from "@/components/score-builder";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { OptionGroup, ResultToggle } from "@/components/ui/option-group";
import { Textarea } from "@/components/ui/textarea";
import type { MatchPayload } from "@/lib/api";
import { COURT_TYPE_OPTIONS } from "@/lib/constants";
import { emptySet, formatScore, hasResult, resolveWinner, type ScoreEntry } from "@/lib/score";

export type MatchFormValues = {
  opponentId: string;
  sets: ScoreEntry[];
  won: "true" | "false";
  courtType: string;
  playedAt: string;
  notes: string;
  strengths: string;
  weaknesses: string;
  opponentStrengths: string;
  opponentWeaknesses: string;
};

type MatchFormProps = {
  defaultValues?: Partial<MatchFormValues>;
  submitLabel: string;
  pending: boolean;
  error?: Error | null;
  onSubmit: (payload: MatchPayload) => void;
};

const courtOptions = COURT_TYPE_OPTIONS.map((option) => ({ value: option, label: option }));

function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function MatchForm({
  defaultValues,
  submitLabel,
  pending,
  error,
  onSubmit,
}: MatchFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MatchFormValues>({
    defaultValues: {
      opponentId: "",
      sets: [emptySet(), emptySet()],
      won: "true",
      courtType: "Saibro",
      playedAt: today(),
      notes: "",
      strengths: "",
      weaknesses: "",
      opponentStrengths: "",
      opponentWeaknesses: "",
      ...defaultValues,
    },
  });

  const sets = watch("sets");
  const won = watch("won");
  const scoreWinner = resolveWinner(sets);
  const scoreMismatch = scoreWinner !== null && (scoreWinner === "home") !== (won === "true");

  return (
    <form
      className="grid gap-4 px-4 pt-4"
      onSubmit={handleSubmit((values) =>
        onSubmit({
          opponentId: values.opponentId,
          score: formatScore(values.sets),
          won: values.won === "true",
          courtType: values.courtType,
          playedAt: new Date(`${values.playedAt}T12:00:00`).toISOString(),
          notes: values.notes,
          strengths: values.strengths,
          weaknesses: values.weaknesses,
          opponentStrengths: values.opponentStrengths,
          opponentWeaknesses: values.opponentWeaknesses,
        }),
      )}
    >
      <section className="grid gap-4 rounded-2xl border bg-card p-4 shadow-xs">
        <Controller
          control={control}
          name="won"
          render={({ field }) => <ResultToggle value={field.value} onChange={field.onChange} />}
        />

        <Field label="Placar" htmlFor="sets" error={errors.sets?.root?.message}>
          <Controller
            control={control}
            name="sets"
            rules={{
              validate: (value) => hasResult(value) || "Informe os games de pelo menos um set.",
            }}
            render={({ field }) => <ScoreBuilder value={field.value} onChange={field.onChange} />}
          />
          {scoreMismatch ? (
            <p className="rounded-xl bg-warning/10 px-3 py-2 text-sm text-foreground">
              O placar aponta {scoreWinner === "home" ? "vitória" : "derrota"}, mas você marcou{" "}
              {won === "true" ? "vitória" : "derrota"}.
            </p>
          ) : null}
        </Field>

        <Field label="Adversário" htmlFor="opponentId" error={errors.opponentId?.message}>
          <Controller
            control={control}
            name="opponentId"
            rules={{ required: "Selecione o adversário." }}
            render={({ field }) => (
              <OpponentPicker
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(errors.opponentId)}
              />
            )}
          />
        </Field>

        <Field label="Data" htmlFor="playedAt">
          <Input id="playedAt" type="date" max={today()} {...register("playedAt")} />
        </Field>

        <Field label="Tipo de quadra" htmlFor="courtType">
          <Controller
            control={control}
            name="courtType"
            render={({ field }) => (
              <OptionGroup
                name="courtType"
                options={courtOptions}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
      </section>

      <section className="grid gap-4 rounded-2xl border bg-card p-4 shadow-xs">
        <h2 className="text-sm font-semibold">Seu desempenho</h2>
        <Field label="Pontos fortes" htmlFor="strengths" hint="opcional">
          <Textarea id="strengths" placeholder="O que funcionou no seu jogo" {...register("strengths")} />
        </Field>
        <Field label="Pontos fracos" htmlFor="weaknesses" hint="opcional">
          <Textarea
            id="weaknesses"
            placeholder="O que travou o seu rendimento"
            {...register("weaknesses")}
          />
        </Field>
      </section>

      <section className="grid gap-4 rounded-2xl border bg-card p-4 shadow-xs">
        <h2 className="text-sm font-semibold">O adversário nesta partida</h2>
        <Field label="Pontos fortes" htmlFor="opponentStrengths" hint="opcional">
          <Textarea
            id="opponentStrengths"
            placeholder="O que ele impôs nesta partida"
            {...register("opponentStrengths")}
          />
        </Field>
        <Field label="Pontos fracos" htmlFor="opponentWeaknesses" hint="opcional">
          <Textarea
            id="opponentWeaknesses"
            placeholder="Onde ele sofreu nesta partida"
            {...register("opponentWeaknesses")}
          />
        </Field>
      </section>

      <section className="grid gap-4 rounded-2xl border bg-card p-4 shadow-xs">
        <Field label="Observações" htmlFor="notes" hint="opcional">
          <Textarea id="notes" placeholder="Clima, momento, tática, lesão..." {...register("notes")} />
        </Field>
      </section>

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          {error.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" loading={pending}>
        {pending ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
