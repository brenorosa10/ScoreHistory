import { useEffect, type RefObject } from "react";

export function useScrollToFieldError(
  formRef: RefObject<HTMLFormElement | null>,
  submitCount: number,
) {
  useEffect(() => {
    if (submitCount === 0) {
      return;
    }

    const form = formRef.current;
    if (!form) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const target =
        form.querySelector<HTMLElement>("[data-field-error]") ??
        form.querySelector<HTMLElement>("[aria-invalid='true']");

      if (!target) {
        return;
      }

      target.scrollIntoView({ behavior: "smooth", block: "center" });
      form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [formRef, submitCount]);
}
