/// <reference types="bun-types" />
import { describe, expect, it } from "bun:test";
import {
  catalystEventCreateSchema,
  catalystEventSchema,
  catalystKindSchema,
  catalystSeveritySchema,
} from "./index";

describe("@rare-structure-hq/shared — catalyst-event schema", () => {
  const wellFormed = {
    id: "00000000-0000-0000-0000-000000000001",
    kind: "regulatory" as const,
    severity: "high" as const,
    headline: "EU adopts revised battery-materials directive",
    occurred_at: "2026-05-19T09:00:00Z",
    ingested_at: "2026-05-19T11:30:00Z",
    source: "regulatory-feed",
  };

  it("validates a well-formed catalyst event and applies defaults", () => {
    const parsed = catalystEventSchema.parse(wellFormed);
    expect(parsed.status).toBe("ingested");
    expect(parsed.tags).toEqual([]);
    expect(parsed.confidence).toBeNull();
  });

  it("rejects an unknown kind / severity", () => {
    expect(() => catalystKindSchema.parse("vibes")).toThrow();
    expect(() => catalystSeveritySchema.parse("apocalyptic")).toThrow();
  });

  it("rejects an empty headline and an out-of-range confidence", () => {
    expect(() => catalystEventSchema.parse({ ...wellFormed, headline: "" })).toThrow();
    expect(() => catalystEventSchema.parse({ ...wellFormed, confidence: 1.5 })).toThrow();
  });

  it("create schema omits server-assigned id + ingested_at", () => {
    const { id, ingested_at, ...rest } = wellFormed;
    void id;
    void ingested_at;
    expect(() => catalystEventCreateSchema.parse(rest)).not.toThrow();
  });
});
