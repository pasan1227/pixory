import { describe, expect, it } from "vitest";

import { DEFAULT_CROP } from "@/lib/crop";
import {
  distributePhotos,
  type DistributablePhoto,
} from "@/lib/distribute";
import { spreadBounds } from "@/lib/print-specs";
import type { Spread } from "@/types/book";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function photo(
  id: string,
  width: number,
  height: number,
  iso: string | null,
): DistributablePhoto {
  return {
    id,
    width,
    height,
    capturedAt: iso === null ? null : new Date(iso),
  };
}

// 4:3 landscape / 3:4 portrait fixtures.
function landscape(id: string, iso: string | null): DistributablePhoto {
  return photo(id, 1600, 1200, iso);
}

function portrait(id: string, iso: string | null): DistributablePhoto {
  return photo(id, 1200, 1600, iso);
}

// All photo ids placed on spreads, in reading order.
function placedIds(spreads: Spread[]): string[] {
  return spreads.flatMap((spread) =>
    spread.slots.flatMap((slot) =>
      slot.kind === "photo" ? [slot.photoId] : [],
    ),
  );
}

// Photo count per spread, ignoring trailing all-empty padding spreads.
function photoCountsPerFilledSpread(spreads: Spread[]): number[] {
  return spreads
    .map((spread) => spread.slots.filter((s) => s.kind === "photo").length)
    .filter((count) => count > 0);
}

// Distinct UTC day per index: 2024-01-01 .. 2024-02-29 (explicit calendar
// mapping, supports index 0..59).
function isoOnDay(index: number): string {
  const month = index < 31 ? "01" : "02";
  const day = index < 31 ? index + 1 : index - 30;
  return `2024-${month}-${String(day).padStart(2, "0")}T12:00:00.000Z`;
}

// Same UTC day, one minute apart per index (supports index 0..1439).
function isoAtMinute(index: number): string {
  const hours = String(Math.floor(index / 60)).padStart(2, "0");
  const minutes = String(index % 60).padStart(2, "0");
  return `2024-03-15T${hours}:${minutes}:00.000Z`;
}

// ---------------------------------------------------------------------------
// Chronological ordering
// ---------------------------------------------------------------------------

describe("distributePhotos — chronological ordering", () => {
  it("places shuffled photos in capturedAt ascending order", () => {
    const photos = [
      landscape("c", "2024-05-03T09:00:00.000Z"),
      landscape("a", "2024-05-01T09:00:00.000Z"),
      landscape("d", "2024-05-04T09:00:00.000Z"),
      landscape("b", "2024-05-02T09:00:00.000Z"),
    ];
    const result = distributePhotos(photos, "square_20");
    expect(placedIds(result.spreads)).toEqual(["a", "b", "c", "d"]);
  });

  it("orders null capturedAt after all dated photos, preserving input order", () => {
    const photos = [
      landscape("n1", null),
      landscape("b", "2024-01-02T00:00:00.000Z"),
      landscape("n2", null),
      landscape("a", "2024-01-01T00:00:00.000Z"),
    ];
    const result = distributePhotos(photos, "square_20");
    expect(placedIds(result.spreads)).toEqual(["a", "b", "n1", "n2"]);
  });

  it("keeps input order for identical timestamps (stable sort)", () => {
    const photos = [
      landscape("first", "2024-06-01T10:00:00.000Z"),
      landscape("second", "2024-06-01T10:00:00.000Z"),
      landscape("third", "2024-06-01T10:00:00.000Z"),
    ];
    const result = distributePhotos(photos, "square_20");
    expect(placedIds(result.spreads)).toEqual(["first", "second", "third"]);
  });

  it("does not mutate the input array", () => {
    const photos = [
      landscape("b", "2024-01-02T00:00:00.000Z"),
      landscape("a", "2024-01-01T00:00:00.000Z"),
    ];
    distributePhotos(photos, "square_20");
    expect(photos.map((p) => p.id)).toEqual(["b", "a"]);
  });
});

// ---------------------------------------------------------------------------
// Layout selection per chunk
// ---------------------------------------------------------------------------

describe("distributePhotos — layout selection", () => {
  const day = "2024-04-10";
  const at = (hour: number) =>
    `${day}T${String(hour).padStart(2, "0")}:00:00.000Z`;

  it("single landscape photo gets spread-full", () => {
    const result = distributePhotos([landscape("a", at(8))], "square_20");
    expect(result.spreads[0].layoutId).toBe("spread-full");
  });

  it("single portrait photo gets spread-single", () => {
    const result = distributePhotos([portrait("a", at(8))], "square_20");
    expect(result.spreads[0].layoutId).toBe("spread-single");
  });

  it("square photo (width === height) counts as landscape", () => {
    const result = distributePhotos(
      [photo("sq", 1000, 1000, at(8))],
      "square_20",
    );
    expect(result.spreads[0].layoutId).toBe("spread-full");
  });

  it("two landscapes get spread-pages", () => {
    const result = distributePhotos(
      [landscape("a", at(8)), landscape("b", at(9))],
      "square_20",
    );
    expect(result.spreads[0].layoutId).toBe("spread-pages");
  });

  it("two photos with any portrait get spread-duo", () => {
    const mixed = distributePhotos(
      [landscape("a", at(8)), portrait("b", at(9))],
      "square_20",
    );
    expect(mixed.spreads[0].layoutId).toBe("spread-duo");

    const bothPortrait = distributePhotos(
      [portrait("a", at(8)), portrait("b", at(9))],
      "square_20",
    );
    expect(bothPortrait.spreads[0].layoutId).toBe("spread-duo");
  });

  it("three photos with landscape first get spread-trio-right", () => {
    const result = distributePhotos(
      [landscape("a", at(8)), portrait("b", at(9)), portrait("c", at(10))],
      "square_20",
    );
    expect(result.spreads[0].layoutId).toBe("spread-trio-right");
  });

  it("three photos with portrait first get spread-trio-left", () => {
    const result = distributePhotos(
      [portrait("a", at(8)), landscape("b", at(9)), landscape("c", at(10))],
      "square_20",
    );
    expect(result.spreads[0].layoutId).toBe("spread-trio-left");
  });

  it("four photos get spread-quad", () => {
    const result = distributePhotos(
      [
        portrait("a", at(8)),
        landscape("b", at(9)),
        portrait("c", at(10)),
        landscape("d", at(11)),
      ],
      "square_20",
    );
    expect(result.spreads[0].layoutId).toBe("spread-quad");
  });
});

// ---------------------------------------------------------------------------
// Day-based grouping and run chunking
// ---------------------------------------------------------------------------

describe("distributePhotos — day grouping", () => {
  it("breaks chunks at UTC calendar day boundaries", () => {
    const photos = [
      // Day 1: two photos.
      landscape("d1a", "2024-07-01T08:00:00.000Z"),
      landscape("d1b", "2024-07-01T18:00:00.000Z"),
      // Day 2: three photos.
      landscape("d2a", "2024-07-02T06:00:00.000Z"),
      landscape("d2b", "2024-07-02T12:00:00.000Z"),
      landscape("d2c", "2024-07-02T20:00:00.000Z"),
      // Day 3: one photo.
      landscape("d3a", "2024-07-03T09:00:00.000Z"),
    ];
    const result = distributePhotos(photos, "square_20");
    expect(photoCountsPerFilledSpread(result.spreads)).toEqual([2, 3, 1]);
    expect(placedIds(result.spreads)).toEqual([
      "d1a",
      "d1b",
      "d2a",
      "d2b",
      "d2c",
      "d3a",
    ]);
  });

  it("uses the UTC date, not local time, for day boundaries", () => {
    // 23:30Z and next day 00:30Z are different UTC days.
    const photos = [
      landscape("late", "2024-07-01T23:30:00.000Z"),
      landscape("early", "2024-07-02T00:30:00.000Z"),
    ];
    const result = distributePhotos(photos, "square_20");
    expect(photoCountsPerFilledSpread(result.spreads)).toEqual([1, 1]);
  });

  it("splits a run of 5 as 3 + 2, never 4 + 1", () => {
    const photos = Array.from({ length: 5 }, (_, i) =>
      landscape(`p${i}`, isoAtMinute(i)),
    );
    const result = distributePhotos(photos, "square_20");
    expect(photoCountsPerFilledSpread(result.spreads)).toEqual([3, 2]);
  });

  it("splits runs of 6, 7, 8 and 9 as 4+2, 4+3, 4+4 and 4+3+2", () => {
    const expectations: Array<[number, number[]]> = [
      [6, [4, 2]],
      [7, [4, 3]],
      [8, [4, 4]],
      [9, [4, 3, 2]],
    ];
    for (const [count, expected] of expectations) {
      const photos = Array.from({ length: count }, (_, i) =>
        landscape(`p${i}`, isoAtMinute(i)),
      );
      const result = distributePhotos(photos, "square_20");
      expect(photoCountsPerFilledSpread(result.spreads)).toEqual(expected);
    }
  });

  it("groups all undated photos into one trailing run, separate from dated days", () => {
    const photos = [
      landscape("d1a", "2024-07-01T08:00:00.000Z"),
      landscape("d1b", "2024-07-01T09:00:00.000Z"),
      landscape("u1", null),
      landscape("u2", null),
      landscape("u3", null),
    ];
    const result = distributePhotos(photos, "square_20");
    expect(photoCountsPerFilledSpread(result.spreads)).toEqual([2, 3]);
    expect(placedIds(result.spreads)).toEqual([
      "d1a",
      "d1b",
      "u1",
      "u2",
      "u3",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Minimum spread padding
// ---------------------------------------------------------------------------

describe("distributePhotos — min spread padding", () => {
  it("pads 3 photos in square_20 to 10 spreads with empty duos", () => {
    const { minSpreads } = spreadBounds("square_20");
    expect(minSpreads).toBe(10);

    const photos = [
      landscape("a", "2024-02-01T08:00:00.000Z"),
      landscape("b", "2024-02-01T09:00:00.000Z"),
      landscape("c", "2024-02-01T10:00:00.000Z"),
    ];
    const result = distributePhotos(photos, "square_20");

    expect(result.spreads).toHaveLength(10);
    expect(result.spreads[0].layoutId).toBe("spread-trio-right");
    for (const spread of result.spreads.slice(1)) {
      expect(spread.layoutId).toBe("spread-duo");
      expect(spread.slots).toEqual([{ kind: "empty" }, { kind: "empty" }]);
    }
  });

  it("produces minSpreads all-empty spreads for zero photos", () => {
    const result = distributePhotos([], "landscape_a4");
    const { minSpreads } = spreadBounds("landscape_a4");
    expect(result.spreads).toHaveLength(minSpreads);
    expect(result.leftoverPhotoIds).toEqual([]);
    for (const spread of result.spreads) {
      expect(spread.layoutId).toBe("spread-duo");
      expect(spread.slots.every((s) => s.kind === "empty")).toBe(true);
    }
  });

  it("assigns sequential ids spread-1..spread-N including padding", () => {
    const result = distributePhotos(
      [landscape("a", "2024-02-01T08:00:00.000Z")],
      "square_26",
    );
    expect(result.spreads.map((s) => s.id)).toEqual(
      Array.from({ length: 10 }, (_, i) => `spread-${i + 1}`),
    );
  });
});

// ---------------------------------------------------------------------------
// Capacity and fallback chunking
// ---------------------------------------------------------------------------

describe("distributePhotos — capacity", () => {
  it("moves excess photos beyond maxSpreads * 4 to leftoverPhotoIds", () => {
    const { maxSpreads } = spreadBounds("square_20");
    expect(maxSpreads).toBe(50);

    // 205 photos on one day, one minute apart: capacity is 200.
    const photos = Array.from({ length: 205 }, (_, i) =>
      landscape(`p${i}`, isoAtMinute(i)),
    );
    const result = distributePhotos(photos, "square_20");

    expect(result.spreads).toHaveLength(50);
    for (const spread of result.spreads) {
      expect(spread.layoutId).toBe("spread-quad");
      expect(spread.slots).toHaveLength(4);
    }
    // Excess comes from the END of the sorted order.
    expect(result.leftoverPhotoIds).toEqual([
      "p200",
      "p201",
      "p202",
      "p203",
      "p204",
    ]);
    expect(placedIds(result.spreads)).toEqual(
      Array.from({ length: 200 }, (_, i) => `p${i}`),
    );
  });

  it("falls back to plain groups of 4 when day chunks exceed maxSpreads", () => {
    // 60 photos on 60 distinct days would make 60 single-photo chunks,
    // exceeding square_20's 50 max spreads — so day grouping is dropped.
    const photos = Array.from({ length: 60 }, (_, i) =>
      landscape(`p${i}`, isoOnDay(i)),
    );
    const result = distributePhotos(photos, "square_20");

    expect(result.leftoverPhotoIds).toEqual([]);
    expect(result.spreads).toHaveLength(15);
    for (const spread of result.spreads) {
      expect(spread.layoutId).toBe("spread-quad");
      expect(spread.slots).toHaveLength(4);
    }
    expect(placedIds(result.spreads)).toEqual(
      Array.from({ length: 60 }, (_, i) => `p${i}`),
    );
  });
});

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------

describe("distributePhotos — invariants", () => {
  const mixedPhotos = (): DistributablePhoto[] => [
    portrait("a", "2024-09-02T07:00:00.000Z"),
    landscape("b", "2024-09-01T07:00:00.000Z"),
    landscape("c", null),
    portrait("d", "2024-09-01T19:00:00.000Z"),
    photo("e", 800, 800, "2024-09-03T07:00:00.000Z"),
    portrait("f", null),
    landscape("g", "2024-09-02T07:00:00.000Z"),
  ];

  it("every input photo id appears exactly once across spreads + leftover", () => {
    const photos = mixedPhotos();
    const result = distributePhotos(photos, "square_20");
    const all = [...placedIds(result.spreads), ...result.leftoverPhotoIds];
    expect([...all].sort()).toEqual(photos.map((p) => p.id).sort());
    expect(new Set(all).size).toBe(all.length);
  });

  it("holds the exactly-once invariant under capacity overflow", () => {
    const photos = Array.from({ length: 203 }, (_, i) =>
      portrait(`p${i}`, isoAtMinute(i)),
    );
    const result = distributePhotos(photos, "square_26");
    const all = [...placedIds(result.spreads), ...result.leftoverPhotoIds];
    expect([...all].sort()).toEqual(photos.map((p) => p.id).sort());
    expect(new Set(all).size).toBe(203);
  });

  it("is deterministic: identical input yields deep-equal output", () => {
    const first = distributePhotos(mixedPhotos(), "square_20");
    const second = distributePhotos(mixedPhotos(), "square_20");
    expect(second).toEqual(first);
  });

  it("uses DEFAULT_CROP for every placement", () => {
    const result = distributePhotos(mixedPhotos(), "square_20");
    const placements = result.spreads.flatMap((spread) =>
      spread.slots.filter((s) => s.kind === "photo"),
    );
    expect(placements.length).toBeGreaterThan(0);
    for (const placement of placements) {
      expect(placement.crop).toEqual(DEFAULT_CROP);
      expect(placement.crop).toEqual({ x: 0.5, y: 0.5, scale: 1 });
    }
  });
});

describe("day-grouping fallback boundary", () => {
  it("keeps day grouping when chunk count equals maxSpreads exactly", () => {
    const { maxSpreads } = spreadBounds("square_20");
    // One landscape photo on each of maxSpreads distinct UTC days: day
    // grouping yields exactly maxSpreads single-photo chunks. The groups-of-4
    // fallback must NOT fire (it would produce ceil(50/4) = 13 quads instead).
    const photos = Array.from({ length: maxSpreads }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      const month = i < 30 ? "01" : "02";
      const dayOfMonth = i < 30 ? day : String(i - 29).padStart(2, "0");
      return landscape(`p${i}`, `2024-${month}-${dayOfMonth}T10:00:00Z`);
    });
    const result = distributePhotos(photos, "square_20");
    expect(result.spreads).toHaveLength(maxSpreads);
    expect(result.leftoverPhotoIds).toEqual([]);
    for (const spread of result.spreads) {
      expect(spread.layoutId).toBe("spread-full");
      expect(spread.slots).toHaveLength(1);
    }
  });
});
