import { describe, it, expect } from "vitest";
import { paginate } from "@/components/pagination/Paginator";

describe("paginate", () => {
  const items = Array.from({ length: 45 }, (_, i) => i + 1); // [1..45]

  it("returns the first page by default", () => {
    const { pageItems, totalPages } = paginate(items, 20, 0);
    expect(pageItems).toEqual(items.slice(0, 20));
    expect(totalPages).toBe(3); // 45 / 20 -> 3 pages
  });

  it("returns the correct slice for a middle page", () => {
    const { pageItems } = paginate(items, 20, 1);
    expect(pageItems).toEqual(items.slice(20, 40));
  });

  it("returns a partial last page", () => {
    const { pageItems } = paginate(items, 20, 2);
    expect(pageItems).toEqual(items.slice(40, 45));
    expect(pageItems.length).toBe(5);
  });

  it("clamps a negative page index to the first page", () => {
    const { pageItems } = paginate(items, 20, -3);
    expect(pageItems).toEqual(items.slice(0, 20));
  });

  it("clamps an out-of-range page index to the last page", () => {
    const { pageItems, totalPages } = paginate(items, 20, 99);
    expect(pageItems).toEqual(items.slice(40, 45));
    expect(totalPages).toBe(3);
  });

  it("reports exactly one page for an empty list, with no items", () => {
    const { pageItems, totalPages } = paginate([], 20, 0);
    expect(pageItems).toEqual([]);
    expect(totalPages).toBe(1);
  });

  it("handles a list smaller than one page", () => {
    const { pageItems, totalPages } = paginate([1, 2, 3], 20, 0);
    expect(pageItems).toEqual([1, 2, 3]);
    expect(totalPages).toBe(1);
  });
});
