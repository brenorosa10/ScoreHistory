import { useForm } from "react-hook-form";
import { History, Plus, Settings2 } from "lucide-react";
import { useState } from "react";
import { RacketPreview, DEFAULT_FRAME_COLOR, DEFAULT_GRIP_COLOR, DEFAULT_STRING_COLOR } from "@/components/racket-preview";
import { RacketServiceHistory } from "@/components/racket-service-history";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { OptionGroup } from "@/components/ui/option-group";
import { Textarea } from "@/components/ui/textarea";
import type { RacketPayload, RacketServiceKind, RacketServicePayload } from "@/lib/api";

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
  const [addOpen, setAddOpen] = useState(defaultServices.length === 0);

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
    setAddOpen(false);
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
      <section className="grid gap-4 rounded-2xl border bg-card p-4 shadow-xs">
        <SectionHeader
          icon={<Settings2 className="size-4" />}
          title="Configuração"
          description="Modelo, corda, tensão e grip em uso."
        />

        <Field label="Raquete" htmlFor="racket-name" error={errors.name?.message}>
          <Input
            id="racket-name"
            placeholder="Ex.: Wilson Blade 98"
            aria-invalid={errors.name ? true : undefined}
            {...register("name", { required: "Informe a raquete." })}
          />
        </Field>

        <div className="grid gap-4 rounded-xl bg-muted/50 p-3">
          <Field label="Corda" htmlFor="racket-string" hint="opcional">
            <Input
              id="racket-string"
              className="bg-background"
              placeholder="Ex.: Luxilon ALU Power"
              {...register("stringName")}
            />
          </Field>
          <Field
            label="Tensão"
            htmlFor="racket-tension"
            hint="lb"
            error={errors.tensionLb?.message}
          >
            <Input
              id="racket-tension"
              inputMode="decimal"
              className="bg-background"
              placeholder="Ex.: 52"
              aria-invalid={errors.tensionLb ? true : undefined}
              {...register("tensionLb", {
                validate: (value) =>
                  !value.trim() || parseTension(value) != null || "Informe uma tensão válida.",
              })}
            />
          </Field>
          <Field label="Grip" htmlFor="racket-grip" hint="opcional">
            <Input
              id="racket-grip"
              className="bg-background"
              placeholder="Ex.: Wilson Pro Overgrip"
              {...register("grip")}
            />
          </Field>
        </div>

        <Field label="Observações" htmlFor="racket-notes" hint="opcional">
          <Textarea id="racket-notes" placeholder="Peso, balanceamento, encordoamento..." {...register("notes")} />
        </Field>
      </section>

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
        <SectionHeader
          icon={<History className="size-4" />}
          title="Histórico de trocas"
          description="Corda, overgrip, grip e outras manutenções."
          action={
            services.length > 0 && !addOpen ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                <Plus />
                Registrar
              </Button>
            ) : null
          }
        />

        {addOpen ? (
          <div className="grid animate-rise gap-4 rounded-xl border border-dashed bg-muted/40 p-3">
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
              <Input
                id="service-date"
                type="date"
                className="bg-background"
                max={today()}
                value={changedAt}
                onChange={(event) => setChangedAt(event.target.value)}
              />
            </Field>
            <Field label="Detalhe" htmlFor="service-detail" hint="opcional">
              <Input
                id="service-detail"
                className="bg-background"
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
                  className="bg-background"
                  placeholder="Ex.: 52"
                  value={serviceTension}
                  onChange={(event) => setServiceTension(event.target.value)}
                />
              </Field>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" onClick={addService}>
                <Plus />
                Adicionar troca
              </Button>
              {services.length > 0 ? (
                <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <RacketServiceHistory services={services} onRemove={removeService} />
      </section>

      <Button type="submit" size="lg" loading={pending}>
        {pending ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
