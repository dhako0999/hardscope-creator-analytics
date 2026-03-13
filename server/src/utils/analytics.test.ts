import { describe, expect, it } from "vitest";
import { calculateEngagementRate } from "./analytics";

describe("calculateEngagementRate", () => {
  it("returns 0 when views are 0", () => {
    expect(calculateEngagementRate(0, 100, 20)).toBe(0);
  });

  it("calculates engagement rate correctly", () => {
    expect(calculateEngagementRate(1000, 50, 10)).toBe(6);
  });

  it("rounds up to 4 decimal places", () => {
    expect(calculateEngagementRate(333, 10, 5)).toBe(4.5045);
  });
});
