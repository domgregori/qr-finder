import { describe, it, expect } from "vitest";
import { cn, formatDuration } from "../../packages/shared/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("deduplicates conflicting Tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "skipped", "added")).toBe("base added");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null)).toBe("base");
  });

  it("returns empty string with no inputs", () => {
    expect(cn()).toBe("");
  });
});

describe("formatDuration", () => {
  it("formats zero seconds", () => {
    expect(formatDuration(0)).toBe("00:00:00");
  });

  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("00:00:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90)).toBe("00:01:30");
  });

  it("formats hours, minutes, and seconds", () => {
    expect(formatDuration(3661)).toBe("01:01:01");
  });

  it("pads single-digit values with leading zeros", () => {
    expect(formatDuration(3600)).toBe("01:00:00");
  });

  it("handles large hour values", () => {
    expect(formatDuration(36000)).toBe("10:00:00");
  });
});
