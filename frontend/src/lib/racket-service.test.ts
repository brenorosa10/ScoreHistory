import { describe, expect, it } from "vitest";
import { servicesToPayload } from "@/lib/racket-service";

describe("racket service payload", () => {
  it("keeps existing service ids so a racket save upserts instead of duplicating expenses", () => {
    const payload = servicesToPayload([
      {
        id: "svc-1",
        kind: "Overgrip",
        changedAt: "2026-10-02T15:00:00.000Z",
        detail: "branco",
        tensionLb: null,
      },
      {
        id: "svc-2",
        kind: "Corda",
        changedAt: "2026-09-01T15:00:00.000Z",
        detail: null,
        tensionLb: 52,
      },
    ]);

    expect(payload.map((service) => service.id)).toEqual(["svc-1", "svc-2"]);
    expect(payload[1].tensionLb).toBe(52);
  });
});