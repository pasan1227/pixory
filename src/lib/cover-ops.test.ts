import { describe, expect, it } from "vitest";

import {
  clearCoverSlot,
  placeCoverPhoto,
  setCoverCrop,
  switchCoverLayout,
  updateCoverStyle,
} from "@/lib/cover-ops";
import { DEFAULT_CROP } from "@/lib/crop";
import { createEmptyBookDocument } from "@/lib/new-book";
import { bookDocumentSchema, MAX_CROP_SCALE } from "@/lib/schemas/book";
import type { BookDocument, CoverSlot, PhotoPlacement } from "@/types/book";

// Pure-op tests: every op returns a NEW document on change and the SAME
// reference on no-ops/invalid input, never mutates its input, and never
// touches the spreads.

function makeDoc(): BookDocument {
  // Fresh docs start on cover-classic (zero photo slots, photoSlots: []).
  return createEmptyBookDocument("square_20");
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value) as unknown[]) deepFreeze(child);
  }
  return value;
}

function coverPhotoAt(doc: BookDocument, index: number): PhotoPlacement {
  const slot: CoverSlot | undefined = doc.cover.photoSlots[index];
  if (slot === undefined || slot.kind !== "photo") {
    throw new Error(
      `expected cover photo slot at ${index}, got ${slot?.kind ?? "undefined"}`,
    );
  }
  return slot;
}

// cover-full (one slot) with photoId placed at index 0 (DEFAULT_CROP).
function fullCoverWithPhoto(photoId = "p1"): BookDocument {
  return placeCoverPhoto(
    switchCoverLayout(deepFreeze(makeDoc()), "cover-full"),
    0,
    photoId,
  );
}

describe("updateCoverStyle", () => {
  it("sets each style key individually", () => {
    const doc = deepFreeze(makeDoc());
    expect(updateCoverStyle(doc, { title: "Our Trip" }).cover.title).toBe(
      "Our Trip",
    );
    expect(updateCoverStyle(doc, { subtitle: "Galle, 2026" }).cover.subtitle).toBe(
      "Galle, 2026",
    );
    expect(updateCoverStyle(doc, { spineText: "Our Trip" }).cover.spineText).toBe(
      "Our Trip",
    );
    expect(updateCoverStyle(doc, { colorId: "sage" }).cover.colorId).toBe("sage");
    expect(updateCoverStyle(doc, { fontId: "inter" }).cover.fontId).toBe("inter");
  });

  it("sets multiple keys in one combined patch", () => {
    const doc = deepFreeze(makeDoc());
    const next = updateCoverStyle(doc, {
      title: "Our Trip",
      subtitle: "Galle",
      spineText: "Trip 2026",
      colorId: "ink",
      fontId: "lora",
    });
    expect(next).not.toBe(doc);
    expect(next.cover.title).toBe("Our Trip");
    expect(next.cover.subtitle).toBe("Galle");
    expect(next.cover.spineText).toBe("Trip 2026");
    expect(next.cover.colorId).toBe("ink");
    expect(next.cover.fontId).toBe("lora");
  });

  it("returns the SAME reference when every patched key equals current", () => {
    const doc = deepFreeze(makeDoc());
    expect(updateCoverStyle(doc, { title: "" })).toBe(doc);
    expect(
      updateCoverStyle(doc, {
        title: "",
        colorId: "terracotta",
        fontId: "fraunces",
      }),
    ).toBe(doc);
  });

  it("returns the SAME reference for an empty patch", () => {
    const doc = deepFreeze(makeDoc());
    expect(updateCoverStyle(doc, {})).toBe(doc);
  });

  it("does not touch other cover fields (layoutId, photoSlots, untouched keys)", () => {
    const doc = deepFreeze(fullCoverWithPhoto());
    const next = updateCoverStyle(doc, { title: "Hello" });
    expect(next.cover.layoutId).toBe(doc.cover.layoutId);
    expect(next.cover.photoSlots).toBe(doc.cover.photoSlots);
    expect(next.cover.subtitle).toBe(doc.cover.subtitle);
    expect(next.cover.spineText).toBe(doc.cover.spineText);
    expect(next.cover.colorId).toBe(doc.cover.colorId);
    expect(next.cover.fontId).toBe(doc.cover.fontId);
  });

  it("does not mutate the input document", () => {
    const doc = deepFreeze(makeDoc());
    updateCoverStyle(doc, { title: "Mutant", colorId: "ocean" });
    expect(doc.cover.title).toBe("");
    expect(doc.cover.colorId).toBe("terracotta");
  });
});

describe("switchCoverLayout", () => {
  it("cover-classic (0 slots) -> cover-full (1 slot) yields one empty slot", () => {
    const doc = deepFreeze(makeDoc());
    const next = switchCoverLayout(doc, "cover-full");
    expect(next.cover.layoutId).toBe("cover-full");
    expect(next.cover.photoSlots).toEqual([{ kind: "empty" }]);
  });

  it("cover-full -> cover-duo preserves the photo at index 0 with its crop verbatim", () => {
    const cropped = setCoverCrop(fullCoverWithPhoto("p1"), 0, {
      x: 0.25,
      y: 0.75,
      scale: 2,
    });
    const next = switchCoverLayout(deepFreeze(cropped), "cover-duo");
    expect(next.cover.layoutId).toBe("cover-duo");
    expect(next.cover.photoSlots).toHaveLength(2);
    expect(coverPhotoAt(next, 0).photoId).toBe("p1");
    expect(coverPhotoAt(next, 0).crop).toEqual({ x: 0.25, y: 0.75, scale: 2 });
    expect(next.cover.photoSlots[1]).toEqual({ kind: "empty" });
  });

  it("cover-duo with 2 photos -> cover-full keeps the first and drops the second from the document", () => {
    const duo = placeCoverPhoto(
      placeCoverPhoto(
        switchCoverLayout(deepFreeze(makeDoc()), "cover-duo"),
        0,
        "p1",
      ),
      1,
      "p2",
    );
    const next = switchCoverLayout(deepFreeze(duo), "cover-full");
    expect(next.cover.photoSlots).toHaveLength(1);
    expect(coverPhotoAt(next, 0).photoId).toBe("p1");
    expect(JSON.stringify(next)).not.toContain("p2");
  });

  it("any layout -> cover-classic empties photoSlots", () => {
    const next = switchCoverLayout(
      deepFreeze(fullCoverWithPhoto("p1")),
      "cover-classic",
    );
    expect(next.cover.layoutId).toBe("cover-classic");
    expect(next.cover.photoSlots).toEqual([]);
  });

  it("returns the SAME reference for the current layoutId", () => {
    const doc = deepFreeze(makeDoc());
    expect(switchCoverLayout(doc, "cover-classic")).toBe(doc);
    const full = deepFreeze(fullCoverWithPhoto());
    expect(switchCoverLayout(full, "cover-full")).toBe(full);
  });

  it("throws on an unknown layout id", () => {
    const doc = deepFreeze(makeDoc());
    expect(() => switchCoverLayout(doc, "cover-nonsense")).toThrow(
      /cover-nonsense/,
    );
  });
});

describe("placeCoverPhoto", () => {
  it("places with a COPY of DEFAULT_CROP (mutation isolation)", () => {
    const doc = deepFreeze(switchCoverLayout(makeDoc(), "cover-full"));
    const next = placeCoverPhoto(doc, 0, "p1");
    const placed = coverPhotoAt(next, 0);
    expect(placed.photoId).toBe("p1");
    expect(placed.crop).toEqual(DEFAULT_CROP);
    expect(placed.crop).not.toBe(DEFAULT_CROP);
  });

  it("returns the SAME reference for an out-of-range slotIndex", () => {
    const classic = deepFreeze(makeDoc()); // cover-classic has zero slots
    expect(placeCoverPhoto(classic, 0, "p1")).toBe(classic);
    const full = deepFreeze(switchCoverLayout(makeDoc(), "cover-full"));
    expect(placeCoverPhoto(full, 1, "p1")).toBe(full);
    expect(placeCoverPhoto(full, -1, "p1")).toBe(full);
  });

  it("re-placing the same photoId is a no-op that preserves a prior crop", () => {
    const cropped = deepFreeze(
      setCoverCrop(fullCoverWithPhoto("p1"), 0, { x: 0.1, y: 0.9, scale: 2 }),
    );
    const again = placeCoverPhoto(cropped, 0, "p1");
    expect(again).toBe(cropped);
    expect(coverPhotoAt(again, 0).crop).toEqual({ x: 0.1, y: 0.9, scale: 2 });
  });

  it("replacing with a different photo resets the crop to default", () => {
    const cropped = deepFreeze(
      setCoverCrop(fullCoverWithPhoto("p1"), 0, { x: 0.1, y: 0.9, scale: 2 }),
    );
    const next = placeCoverPhoto(cropped, 0, "p2");
    const placed = coverPhotoAt(next, 0);
    expect(placed.photoId).toBe("p2");
    expect(placed.crop).toEqual(DEFAULT_CROP);
  });

  it("pads a misaligned legacy doc (cover-full layout, photoSlots: []) and places at index 0", () => {
    const base = makeDoc();
    const misaligned: BookDocument = deepFreeze({
      ...base,
      cover: { ...base.cover, layoutId: "cover-full", photoSlots: [] },
    });
    const next = placeCoverPhoto(misaligned, 0, "p1");
    expect(next).not.toBe(misaligned);
    expect(next.cover.photoSlots).toHaveLength(1);
    expect(coverPhotoAt(next, 0).photoId).toBe("p1");
    expect(bookDocumentSchema.safeParse(next).success).toBe(true);
  });
});

describe("setCoverCrop", () => {
  it("clamps x into [0,1] and scale into [1, MAX_CROP_SCALE]", () => {
    const doc = deepFreeze(fullCoverWithPhoto("p1"));
    const zoomedOut = setCoverCrop(doc, 0, { x: 5, y: 0.5, scale: 0 });
    expect(coverPhotoAt(zoomedOut, 0).crop).toEqual({ x: 1, y: 0.5, scale: 1 });
    const zoomedIn = setCoverCrop(doc, 0, { x: -3, y: 2, scale: 9 });
    expect(coverPhotoAt(zoomedIn, 0).crop).toEqual({
      x: 0,
      y: 1,
      scale: MAX_CROP_SCALE,
    });
  });

  it("returns the SAME reference when the clamped crop equals the current crop", () => {
    const doc = deepFreeze(fullCoverWithPhoto("p1")); // crop is DEFAULT_CROP
    expect(setCoverCrop(doc, 0, { x: 0.5, y: 0.5, scale: 1 })).toBe(doc);
    // Clamps to DEFAULT_CROP (scale floors at 1).
    expect(setCoverCrop(doc, 0, { x: 0.5, y: 0.5, scale: 0.25 })).toBe(doc);
  });

  it("returns the SAME reference for an empty slot", () => {
    const doc = deepFreeze(switchCoverLayout(makeDoc(), "cover-full"));
    expect(setCoverCrop(doc, 0, { x: 0.2, y: 0.2, scale: 2 })).toBe(doc);
  });

  it("returns the SAME reference for an out-of-range index", () => {
    const doc = deepFreeze(fullCoverWithPhoto("p1"));
    expect(setCoverCrop(doc, 1, { x: 0.2, y: 0.2, scale: 2 })).toBe(doc);
    expect(setCoverCrop(doc, -1, { x: 0.2, y: 0.2, scale: 2 })).toBe(doc);
  });
});

describe("clearCoverSlot", () => {
  it("clears a placed photo back to an empty slot", () => {
    const doc = deepFreeze(fullCoverWithPhoto("p1"));
    const next = clearCoverSlot(doc, 0);
    expect(next).not.toBe(doc);
    expect(next.cover.photoSlots[0]).toEqual({ kind: "empty" });
  });

  it("returns the SAME reference when the slot is already empty", () => {
    const doc = deepFreeze(switchCoverLayout(makeDoc(), "cover-full"));
    expect(clearCoverSlot(doc, 0)).toBe(doc);
  });

  it("returns the SAME reference for an out-of-range index", () => {
    const classic = deepFreeze(makeDoc());
    expect(clearCoverSlot(classic, 0)).toBe(classic);
    const full = deepFreeze(fullCoverWithPhoto("p1"));
    expect(clearCoverSlot(full, 5)).toBe(full);
    expect(clearCoverSlot(full, -1)).toBe(full);
  });
});

describe("invariants", () => {
  it("every op result parses with bookDocumentSchema and never touches doc.spreads", () => {
    const doc0 = deepFreeze(makeDoc());
    const d1 = updateCoverStyle(doc0, { title: "Trip", colorId: "dusk" });
    const d2 = switchCoverLayout(d1, "cover-duo");
    const d3 = placeCoverPhoto(d2, 0, "p1");
    const d4 = setCoverCrop(d3, 0, { x: 0.1, y: 0.9, scale: 2.5 });
    const d5 = clearCoverSlot(d4, 0);
    const results = [d1, d2, d3, d4, d5];

    // Each step actually changed the document (no vacuous checks below).
    expect(new Set([doc0, ...results]).size).toBe(6);

    for (const result of results) {
      expect(bookDocumentSchema.safeParse(result).success).toBe(true);
      expect(result.spreads).toBe(doc0.spreads);
    }
  });
});
