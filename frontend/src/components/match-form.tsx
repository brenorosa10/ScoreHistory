import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { OpponentPicker } from "@/components/opponent-picker";
import { ScoreBuilder } from "@/components/score-builder";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { OptionGroup, ResultToggle } from "@/components/ui/option-group";
import { Textarea } from "@/components/ui/textarea";
import { useScrollToFieldError } from "@/hooks/use-scroll-to-field-error";
import type { MatchPayload } from "@/lib/api";
import { COURT_TYPE_OPTIONS } from "@/lib/constants";
import { dateInputError, formatInputDate, todayInputValue } from "@/lib/format";
import {
  PLAYER_SPORTS,
  courtApplies,
  defaultMatchSport,
  isDoublesSport,
  opponentPlaysSport,
  rememberMatchSport,
  shouldAskMatchSport,
  sportsOrTennis,
} from "@/lib/player-sports";
import { meQueryOptions, opponentQueryOptions } from "@/lib/queries";
import {
  emptySet,
  formatScore,
  isValidScore,
  resultMismatchMessage,
  scoreFieldError,
  type MatchResultChoice,
  type ScoreEntry,
} from "@/lib/score";

export type MatchFormValues = {
  sport: string;
  opponentId: string;
  partnerName: string;
  secondOpponentName: string;
  sets: ScoreEntry[];
  won: MatchResultChoice;
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
  extra?: React.ReactNode;
};

const courtOptions = COURT_TYPE_OPTIONS.map((option) => ({ value: option, label: option }));
const sportOptions = PLAYER_SPORTS.map((option) => ({ value: option, label: option }));

function formErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const record = error as { message?: unknown; root?: { message?: unknown } };
  if (typeof record.message === "string" && record.message) {
    return record.message;
  }
  if (typeof record.root?.message === "string" && record.root.message) {
    return record.root.message;
  }
  return undefined;
}

export function MatchForm({
  defaultValues,
  submitLabel,
  pending,
  error,
  onSubmit,
  extra,
}: MatchFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    setError,
    trigger,
    formState: { errors, submitCount },
  } = useForm<MatchFormValues>({
    defaultValues: {
      sport: defaultValues?.sport || defaultMatchSport(undefined),
      opponentId: "",
      partnerName: "",
      secondOpponentName: "",
      sets: [emptySet()],
      won: "true",
      courtType: "Saibro",
      playedAt: todayInputValue(),
      notes: "",
      strengths: "",
      weaknesses: "",
      opponentStrengths: "",
      opponentWeaknesses: "",
      ...defaultValues,
    },
  });

  const { data: user } = useQuery(meQueryOptions());
  const userSports = sportsOrTennis(user?.sports);
  const askSport = shouldAskMatchSport(user?.sports);
  const sets = watch("sets");
  const won = watch("won");
  const playedAt = watch("playedAt");
  const sport = watch("sport");
  const opponentId = watch("opponentId");
  const { data: selectedOpponent } = useQuery({
    ...opponentQueryOptions(opponentId),
    enabled: Boolean(opponentId),
  });
  const scoreError = formErrorMessage(errors.sets);
  const mismatch = isValidScore(sets) ? resultMismatchMessage(sets, won) : null;
  const playedAtLabel = formatInputDate(playedAt);
  useScrollToFieldError(formRef, submitCount);

  useEffect(() => {
    if (!askSport && user?.sports && getValues("sport") !== userSports[0]) {
      setValue("sport", userSports[0]);
    }
  }, [askSport, getValues, setValue, user?.sports, userSports]);

  useEffect(() => {
    if (
      selectedOpponent &&
      selectedOpponent.sports &&
      !opponentPlaysSport(selectedOpponent.sports, sport)
    ) {
      setValue("opponentId", "");
    }
  }, [selectedOpponent, setValue, sport]);

  useEffect(() => {
    if (submitCount > 0) {
      void trigger("sets");
    }
  }, [submitCount, trigger, won]);

  return (
    <form
      ref={formRef}
      noValidate
      className="grid gap-4 px-4 pt-4"
      onSubmit={handleSubmit(
        (values) => {
          const message = scoreFieldError(values.sets, values.won);
          if (message) {
            setError("sets", { type: "validate", message });
            return;
          }

          rememberMatchSport(values.sport);
          onSubmit({
          sport: values.sport,
          opponentId: values.opponentId,
          partnerName: isDoublesSport(values.sport) ? values.partnerName : "",
          secondOpponentName: isDoublesSport(values.sport) ? values.secondOpponentName : "",
          score: formatScore(values.sets),
          won: values.won === "draw" ? null : values.won === "true",
          courtType: courtApplies(values.sport) ? values.courtType : "",
          playedAt: new Date(`${values.playedAt}T12:00:00`).toISOString(),
          notes: values.notes,
          strengths: values.strengths,
          weaknesses: values.weaknesses,
          opponentStrengths: values.opponentStrengths,
          opponentWeaknesses: values.opponentWeaknesses,
        });
        },
        () => {
          const message = scoreFieldError(getValues("sets"), getValues("won"));
          if (message) {
            setError("sets", { type: "validate", message });
          }
        },
      )}
    >
      <section className="grid gap-4 rounded-2xl border bg-card p-4 shadow-xs">
        {askSport ? (
          <Field label="Esporte da partida" htmlFor="sport">
            <Controller
              control={control}
              name="sport"
              render={({ field }) => (
                <OptionGroup
                  name="sport"
                  options={sportOptions.filter((option) => userSports.includes(option.value))}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Field>
        ) : null}

        <Controller
          control={control}
          name="won"
          render={({ field }) => <ResultToggle value={field.value} onChange={field.onChange} />}
        />

        <Field label="Placar" htmlFor="sets" error={scoreError}>
          <Controller
            control={control}
            name="sets"
            rules={{
              validate: (value) => scoreFieldError(value, getValues("won")) ?? true,
            }}
            render={({ field }) => (
              <ScoreBuilder value={field.value} onChange={field.onChange} invalid={Boolean(scoreError)} />
            )}
          />
          {mismatch && !scoreError ? (
            <p className="rounded-xl bg-warning/10 px-3 py-2 text-sm text-foreground">{mismatch}</p>
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
                sport={sport}
                onChange={field.onChange}
                invalid={Boolean(errors.opponentId)}
              />
            )}
          />
        </Field>

        <Field label="Data" htmlFor="playedAt" hint={playedAtLabel ?? undefined} error={errors.playedAt?.message}>
          <Input
            id="playedAt"
            type="date"
            lang="pt-BR"
            max={todayInputValue()}
            aria-invalid={errors.playedAt ? true : undefined}
            {...register("playedAt", {
              validate: (value) => dateInputError(value, { max: todayInputValue() }),
            })}
          />
        </Field>

        {courtApplies(sport) ? (
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
        ) : null}

        {isDoublesSport(sport) ? (
          <>
            <Field label="Sua dupla" htmlFor="partnerName" hint="opcional">
              <Input id="partnerName" placeholder="Quem jogou com você" {...register("partnerName")} />
            </Field>
            <Field label="Segundo adversário" htmlFor="secondOpponentName" hint="opcional">
              <Input
                id="secondOpponentName"
                placeholder="A outra pessoa da dupla adversária"
                {...register("secondOpponentName")}
              />
            </Field>
          </>
        ) : null}
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
      {extra}
    </form>
  );
}
