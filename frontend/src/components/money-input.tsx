import { Input } from "@/components/ui/input";
import { maskMoneyTyping } from "@/lib/format";
import { cn } from "@/lib/utils";

type MoneyInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  className?: string;
  placeholder?: string;
};

export function MoneyInput({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  className,
  placeholder = "0,00",
}: MoneyInputProps) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      className={cn("tabular-nums", className)}
      placeholder={placeholder}
      aria-invalid={invalid ? true : undefined}
      value={value}
      onBlur={onBlur}
      onChange={(event) => onChange(maskMoneyTyping(event.target.value))}
    />
  );
}
