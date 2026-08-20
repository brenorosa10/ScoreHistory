import { useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { RacketPreview, DEFAULT_FRAME_COLOR, DEFAULT_GRIP_COLOR, DEFAULT_STRING_COLOR } from "@/components/racket-preview";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { OptionGroup } from "@/components/ui/option-group";
import { Textarea } from "@/components/ui/textarea";
import type { RacketPayload, RacketServiceKind, RacketServicePayload } from "@/lib/api";
import { formatFullDate } from "@/lib/format";

export type RacketFormValues = {
  name: string;
  stringName: string;
  tensionLb: string;
  grip: string;
  notes: string;
  frameColor: string;
  stringColor: string;
  gripColor: string;
};

type RacketFormProps = {
  defaultValues?: Partial<RacketFormValues>;
  defaultServices?: RacketServicePayload[];
  submitLabel: string;
  pending?: boolean;
  onSubmit: (payload: RacketPayload) => void;
};

const serviceKinds: { value: RacketServiceKind; label: string }[] = [
  { value: "Corda", label: "Corda" },
  { value: "Overgrip", label: "Overgrip" },
  { value: "Grip", label: "Grip" },
  { value: "Outro", label: "Outro" },
];

function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function parseTension(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function RacketForm({
  defaultValues,
  defaultServices = [],
  submitLabel,
  pending,
  onSubmit,
}: RacketFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RacketFormValues>({
    defaultValues: {
      name: "",
      stringName: "",
      tensionLb: "",
      grip: "",
      notes: "",
      frameColor: DEFAULT_FRAME_COLOR,
      stringColor: DEFAULT_STRING_COLOR,
      gripColor: DEFAULT_GRIP_COLOR,
      ...defaultValues,
    },
  });
  const [services, setServices] = useState<RacketServicePayload[]>(defaultServices);
  const [kind, setKind] = useState<RacketServiceKind>("Corda");
  const [changedAt, setChangedAt] = useState(today);
  const [detail, setDetail] = useState("");
  const [serviceTension, setServiceTension] = useState("");

  const name = watch("name");
  const stringName = watch("stringName");
  const tensionLb = watch("tensionLb");
  const grip = watch("grip");
  const frameColor = watch("frameColor");
  const stringColor = watch("stringColor");
  const gripColor = watch("gripColor");

  function addService() {
    const tension = kind === "Corda" ? parseTension(serviceTension) : null;
    const next: RacketServicePayload = {
      id: crypto.randomUUID(),
      kind,
      changedAt: new Date(`${changedAt}T12:00:00`).toISOString(),
      detail: detail.trim() || undefined,
      tensionLb: tension,
    };
    setServices((current) =>
      [...current, next].sort((a, b) => b.changedAt.localeCompare(a.changedAt)),
    );

    if (kind === "Corda") {
      if (detail.trim()) {
        setValue("stringName", detail.trim());
      }
      if (tension != null) {
        setValue("tensionLb", String(tension));
      }
    }
    if (kind === "Grip" && detail.trim()) {
      setValue("grip", detail.trim());
    }

    setDetail("");
    setServiceTension("");
    setChangedAt(today());
  }

  function removeService(id: string | undefined, index: number) {
    setServices((current) => current.filter((item, itemIndex) => (id ? item.id !== id : itemIndex !== index)));
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={handleSubmit((values) =>
        onSubmit({
          name: values.name,
          stringName: values.stringName,
          tensionLb: parseTension(values.tensionLb),
          grip: values.grip,
          notes: values.notes,
          frameColor: values.frameColor,
          stringColor: values.stringColor,
          gripColor: values.gripColor,
          services: services.map((service) => ({
            kind: service.kind,
            changedAt: service.changedAt,
            detail: service.detail,
            tensionLb: service.tensionLb,
          })),
        }),
      )}
    >
      <div className="grid gap-4 rounded-2xl border bg-card p-4 shadow-xs">
        <Field label="Raquete" htmlFor="racket-name" error={errors.name?.message}>
          <Input
            id="racket-name"
            placeholder="Ex.: Wilson Blade 98"
            aria-invalid={errors.name ? true : undefined}
            {...register("name", { required: "Informe a raquete." })}
          />
        </Field>
        <Field label="Corda" htmlFor="racket-string" hint="opcional">
          <Input id="racket-string" placeholder="Ex.: Luxilon ALU Power" {...register("stringName")} />
        </Field>
        <Field label="Tensão (lb)" htmlFor="racket-tension" hint="opcional">
          <Input
            id="racket-tension"
            inputMode="decimal"
            placeholder="Ex.: 52"
            {...register("tensionLb", {
              validate: (value) =>
                !value.trim() || parseTension(value) != null || "Informe uma tensão válida.",
            })}
          />
        </Field>
        <Field label="Grip" htmlFor="racket-grip" hint="opcional">
          <Input id="racket-grip" placeholder="Ex.: Wilson Pro Overgrip" {...register("grip")} />
        </Field>
        <Field label="Observações" htmlFor="racket-notes" hint="opcional">
          <Textarea id="racket-notes" placeholder="Peso, balanceamento, encordoamento..." {...register("notes")} />
        </Field>
      </div>

      <RacketPreview
        name={name}
        stringName={stringName}
        tensionLb={tensionLb}
        grip={grip}
        frameColor={frameColor}
        stringColor={stringColor}
        gripColor={gripColor}
        onFrameColorChange={(color) => setValue("frameColor", color)}
        onStringColorChange={(color) => setValue("stringColor", color)}
        onGripColorChange={(color) => setValue("gripColor", color)}
      />

      <section className="grid gap-4 rounded-2xl border bg-card p-4 shadow-xs">
        <div>
          <h2 className="text-sm font-semibold">Histórico de trocas</h2>
          <p className="text-xs text-muted-foreground">Corda, overgrip, grip e outras manutenções.</p>
        </div>

        <Field label="Tipo" htmlFor="service-kind">
          <OptionGroup
            name="service-kind"
            options={serviceKinds}
            value={kind}
            onChange={(value) => setKind(value as RacketServiceKind)}
            columns={2}
          />
        </Field>
        <Field label="Data" htmlFor="service-date">
          <Input id="service-date" type="date" max={today()} value={changedAt} onChange={(event) => setChangedAt(event.target.value)} />
        </Field>
        <Field label="Detalhe" htmlFor="service-detail" hint="opcional">
          <Input
            id="service-detail"
            placeholder={kind === "Corda" ? "Modelo da corda" : kind === "Overgrip" ? "Modelo do overgrip" : "O que foi trocado"}
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
          />
        </Field>
        {kind === "Corda" ? (
          <Field label="Tensão (lb)" htmlFor="service-tension" hint="opcional">
            <Input
              id="service-tension"
              inputMode="decimal"
              placeholder="Ex.: 52"
              value={serviceTension}
              onChange={(event) => setServiceTension(event.target.value)}
            />
          </Field>
        ) : null}
        <Button type="button" variant="outline" onClick={addService}>
          <Plus />
          Adicionar troca
        </Button>

        {services.length === 0 ? (
          <p className="rounded-xl bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
            Nenhuma troca registrada ainda.
          </p>
        ) : (
          <ol className="grid gap-2">
            {services.map((service, index) => (
              <li key={service.id ?? `${service.kind}-${service.changedAt}-${index}`} className="flex items-start gap-3 rounded-xl border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{service.kind}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFullDate(service.changedAt)}
                    {service.detail ? ` · ${service.detail}` : ""}
                    {service.tensionLb != null ? ` · ${service.tensionLb} lb` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remover troca"
                  onClick={() => removeService(service.id, index)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <Button type="submit" size="lg" loading={pending}>
        {pending ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
