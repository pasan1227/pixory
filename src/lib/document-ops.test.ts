import { describe, expect, it } from "vitest";

import { DEFAULT_CROP } from "@/lib/crop";
import {
  addSpreadAfter,
  clearSlot,
  moveSpread,
  placePhoto,
  removeSpread,
  setSlotCrop,
  setSlotText,
  switchSpreadLayout,
} from "@/lib/document-ops";
import { createEmptyBookDocument } from "@/lib/new-book";
import { spreadBounds } from "@/lib/print-specs";
import { bookDocumentSchema, MAX_CROP_SCALE } from "@/lib/schemas/book";
import type {
  BookDocument,
  Crop,
  PhotoPlacement,
  SlotContent,
} from "@/types/book";

// --- helpers -----------------------------------------------------------------

function makeDoc(): BookDocument {
  // square_20: 10 spreads minimum, default layout "spread-duo" (2 slots each).
  return createEmptyBookDocument("square_20");
}

function asPhoto(slot: SlotContent | undefined): PhotoPlacement {
  if (slot === undefined || slot.kind !== "photo") {
    throw new Error(`expected a photo slot, got ${slot?.kind ?? "undefined"}`);
  }
  return slot;
}

function slotAt(doc: BookDocument, spread: number, slot: number): SlotContent {
  return doc.spreads[spread].slots[slot];
}

function spreadIds(doc: BookDocument): string[] {
  return doc.spreads.map((s) => s.id);
}

function photoIdsIn(doc: BookDocument): string[] {
  return doc.spreads
    .flatMap((s) => s.slots)
    .filter((s): s is PhotoPlacement => s.kind === "photo")
    .map((p) => p.photoId);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

const sampleText = {
  text: "hello",
  fontId: "fraunces",
  align: "center",
} as const;

// --- placePhoto ----------------------------------------------------------------

describe("placePhoto", () => {
  it("places a photo with a copy of DEFAULT_CROP, not the shared object", () => {
    const doc = makeDoc();
    const next = placePhoto(doc, 0, 0, "p1");

    const placed = asPhoto(slotAt(next, 0, 0));
    expect(placed.photoId).toBe("p1");
    expect(placed.crop).toEqual({ x: 0.5, y: 0.5, scale: 1 });
    expect(placed.crop).not.toBe(DEFAULT_CROP);

    // Mutating the placed crop must never reach the shared DEFAULT_CROP.
    try {
      placed.crop.x = 0.123;
    } catch {
      // immer freezes produced state outside production; a frozen copy can't
      // corrupt the shared constant either — both outcomes satisfy the contract.
    }
    expect(DEFAULT_CROP).toEqual({ x: 0.5, y: 0.5, scale: 1 });
  });

  it("returns the SAME reference for out-of-bounds spread or slot", () => {
    const doc = makeDoc();
    expect(placePhoto(doc, -1, 0, "p1")).toBe(doc);
    expect(placePhoto(doc, doc.spreads.length, 0, "p1")).toBe(doc);
    expect(placePhoto(doc, 0, -1, "p1")).toBe(doc);
    expect(placePhoto(doc, 0, doc.spreads[0].slots.length, "p1")).toBe(doc);
  });

  it("re-placing the same photoId on the same slot is a no-op preserving the crop", () => {
    const placed = placePhoto(makeDoc(), 0, 0, "p1");
    const zoomed = setSlotCrop(placed, 0, 0, { x: 0.1, y: 0.2, scale: 2 });

    const again = placePhoto(zoomed, 0, 0, "p1");
    expect(again).toBe(zoomed);
    expect(asPhoto(slotAt(again, 0, 0)).crop).toEqual({
      x: 0.1,
      y: 0.2,
      scale: 2,
    });
  });

  it("placing a different photo over an occupied slot replaces it and resets the crop", () => {
    const placed = placePhoto(makeDoc(), 0, 0, "p1");
    const zoomed = setSlotCrop(placed, 0, 0, { x: 0.1, y: 0.2, scale: 2 });

    const replaced = placePhoto(zoomed, 0, 0, "p2");
    expect(replaced).not.toBe(zoomed);
    expect(slotAt(replaced, 0, 0)).toEqual({
      kind: "photo",
      photoId: "p2",
      crop: { x: 0.5, y: 0.5, scale: 1 },
    });
  });

  it("never mutates the input document (deep-frozen fixture)", () => {
    const doc = makeDoc();
    const snapshot = structuredClone(doc);
    deepFreeze(doc);

    expect(() => {
      placePhoto(doc, 0, 0, "p1");
      setSlotText(doc, 0, 1, sampleText);
      switchSpreadLayout(doc, 0, "spread-quad");
      addSpreadAfter(doc, 0, "frozen-add");
      moveSpread(doc, 0, 3);
    }).not.toThrow();
    expect(doc).toEqual(snapshot);
  });
});

// --- setSlotCrop ---------------------------------------------------------------

describe("setSlotCrop", () => {
  const withPhoto = placePhoto(makeDoc(), 0, 0, "p1");

  it("clamps x to [0,1] and scale to [1, MAX_CROP_SCALE]", () => {
    const clampedX = setSlotCrop(withPhoto, 0, 0, { x: 2, y: 0.5, scale: 1.5 });
    expect(asPhoto(slotAt(clampedX, 0, 0)).crop).toEqual({
      x: 1,
      y: 0.5,
      scale: 1.5,
    });

    const clampedUp = setSlotCrop(withPhoto, 0, 0, { x: 0.5, y: 0.5, scale: 9 });
    expect(asPhoto(slotAt(clampedUp, 0, 0)).crop.scale).toBe(MAX_CROP_SCALE);

    const clampedDown = setSlotCrop(withPhoto, 0, 0, {
      x: 0.25,
      y: 0.5,
      scale: 0.2,
    });
    expect(asPhoto(slotAt(clampedDown, 0, 0)).crop.scale).toBe(1);
  });

  it("returns the SAME reference when the clamped crop equals the current crop", () => {
    // Current crop is DEFAULT {0.5, 0.5, 1}; scale 0.2 clamps up to 1.
    expect(
      setSlotCrop(withPhoto, 0, 0, { x: 0.5, y: 0.5, scale: 0.2 }),
    ).toBe(withPhoto);
    expect(
      setSlotCrop(withPhoto, 0, 0, { x: 0.5, y: 0.5, scale: 1 }),
    ).toBe(withPhoto);
  });

  it("returns the SAME reference on text, empty, and out-of-bounds slots", () => {
    const crop: Crop = { x: 0.2, y: 0.2, scale: 2 };
    const withText = setSlotText(makeDoc(), 0, 0, sampleText);
    expect(setSlotCrop(withText, 0, 0, crop)).toBe(withText);

    const empty = makeDoc();
    expect(setSlotCrop(empty, 0, 0, crop)).toBe(empty);
    expect(setSlotCrop(empty, 99, 0, crop)).toBe(empty);
  });
});

// --- setSlotText / clearSlot ----------------------------------------------------

describe("setSlotText", () => {
  it("writes a text slot with the exact shape", () => {
    const next = setSlotText(makeDoc(), 0, 1, sampleText);
    expect(slotAt(next, 0, 1)).toEqual({
      kind: "text",
      text: "hello",
      fontId: "fraunces",
      align: "center",
    });
  });

  it("identical text/font/align is a no-op (SAME reference); any field change is not", () => {
    const first = setSlotText(makeDoc(), 0, 1, sampleText);
    expect(setSlotText(first, 0, 1, { ...sampleText })).toBe(first);
    expect(
      setSlotText(first, 0, 1, { ...sampleText, align: "left" }),
    ).not.toBe(first);
    expect(
      setSlotText(first, 0, 1, { ...sampleText, text: "bye" }),
    ).not.toBe(first);
    expect(
      setSlotText(first, 0, 1, { ...sampleText, fontId: "lora" }),
    ).not.toBe(first);
  });

  it("returns the SAME reference out of bounds", () => {
    const doc = makeDoc();
    expect(setSlotText(doc, 99, 0, sampleText)).toBe(doc);
    expect(setSlotText(doc, 0, 99, sampleText)).toBe(doc);
  });
});

describe("clearSlot", () => {
  it("clears photo and text slots to { kind: 'empty' }", () => {
    const withPhoto = placePhoto(makeDoc(), 0, 0, "p1");
    expect(slotAt(clearSlot(withPhoto, 0, 0), 0, 0)).toEqual({ kind: "empty" });

    const withText = setSlotText(makeDoc(), 0, 1, sampleText);
    expect(slotAt(clearSlot(withText, 0, 1), 0, 1)).toEqual({ kind: "empty" });
  });

  it("clearing an already-empty or out-of-bounds slot returns the SAME reference", () => {
    const doc = makeDoc();
    expect(clearSlot(doc, 0, 0)).toBe(doc);
    expect(clearSlot(doc, 99, 0)).toBe(doc);
    expect(clearSlot(doc, 0, 99)).toBe(doc);
  });
});

// --- switchSpreadLayout ----------------------------------------------------------

describe("switchSpreadLayout", () => {
  const crops: Crop[] = [
    { x: 0.1, y: 0.2, scale: 1.1 },
    { x: 0.3, y: 0.4, scale: 1.5 },
    { x: 0.5, y: 0.6, scale: 2 },
    { x: 0.7, y: 0.8, scale: 2.5 },
  ];

  function quadWithFourPhotos(): BookDocument {
    let doc = switchSpreadLayout(makeDoc(), 0, "spread-quad");
    ["a", "b", "c", "d"].forEach((id, i) => {
      doc = placePhoto(doc, 0, i, id);
      doc = setSlotCrop(doc, 0, i, crops[i]);
    });
    return doc;
  }

  it("quad -> duo keeps the first two photos in order with crops intact, drops the rest", () => {
    const duo = switchSpreadLayout(quadWithFourPhotos(), 0, "spread-duo");

    expect(duo.spreads[0].layoutId).toBe("spread-duo");
    expect(duo.spreads[0].slots).toEqual([
      { kind: "photo", photoId: "a", crop: crops[0] },
      { kind: "photo", photoId: "b", crop: crops[1] },
    ]);
    // c and d are gone from the document entirely (they return to the tray
    // because usage counts derive from the document).
    expect(photoIdsIn(duo)).toEqual(["a", "b"]);
  });

  it("duo -> back to quad leaves two empties at the end", () => {
    const duo = switchSpreadLayout(quadWithFourPhotos(), 0, "spread-duo");
    const quadAgain = switchSpreadLayout(duo, 0, "spread-quad");

    expect(quadAgain.spreads[0].slots).toEqual([
      { kind: "photo", photoId: "a", crop: crops[0] },
      { kind: "photo", photoId: "b", crop: crops[1] },
      { kind: "empty" },
      { kind: "empty" },
    ]);
  });

  it("same layoutId returns the SAME reference", () => {
    const doc = makeDoc();
    expect(switchSpreadLayout(doc, 0, "spread-duo")).toBe(doc);
  });

  it("unknown layoutId throws (getSpreadLayout contract)", () => {
    expect(() => switchSpreadLayout(makeDoc(), 0, "spread-bogus")).toThrow(
      "Unknown spread layout",
    );
  });
});

// --- addSpreadAfter ---------------------------------------------------------------

describe("addSpreadAfter", () => {
  it("inserts an all-empty spread-duo at afterIndex + 1 with the given id", () => {
    const doc = makeDoc();
    const next = addSpreadAfter(doc, 3, "fresh");

    expect(next.spreads).toHaveLength(doc.spreads.length + 1);
    expect(next.spreads[4]).toEqual({
      id: "fresh",
      layoutId: "spread-duo",
      slots: [{ kind: "empty" }, { kind: "empty" }],
    });
    expect(spreadIds(next)).toEqual([
      ...spreadIds(doc).slice(0, 4),
      "fresh",
      ...spreadIds(doc).slice(4),
    ]);
  });

  it("afterIndex -1 prepends", () => {
    const doc = makeDoc();
    const next = addSpreadAfter(doc, -1, "first");
    expect(next.spreads[0].id).toBe("first");
    expect(spreadIds(next).slice(1)).toEqual(spreadIds(doc));
  });

  it("is a no-op (SAME reference) at maxSpreads", () => {
    const { maxSpreads } = spreadBounds("square_20");
    let doc = makeDoc();
    for (let i = doc.spreads.length; i < maxSpreads; i += 1) {
      doc = addSpreadAfter(doc, doc.spreads.length - 1, `grow-${i}`);
    }
    expect(doc.spreads).toHaveLength(maxSpreads);
    expect(addSpreadAfter(doc, 0, "overflow")).toBe(doc);
  });

  it("is a no-op (SAME reference) for out-of-range afterIndex", () => {
    const doc = makeDoc();
    expect(addSpreadAfter(doc, doc.spreads.length, "x")).toBe(doc);
    expect(addSpreadAfter(doc, -2, "x")).toBe(doc);
  });

  it("is a no-op (SAME reference) when the id already exists", () => {
    const doc = makeDoc();
    expect(addSpreadAfter(doc, 0, doc.spreads[5].id)).toBe(doc);
  });
});

// --- removeSpread ------------------------------------------------------------------

describe("removeSpread", () => {
  it("removes the spread at the index", () => {
    const doc = makeDoc();
    const grown = addSpreadAfter(doc, 2, "extra");
    const removed = removeSpread(grown, 3);
    expect(spreadIds(removed)).toEqual(spreadIds(doc));
  });

  it("is a no-op (SAME reference) at minSpreads", () => {
    const doc = makeDoc();
    expect(doc.spreads).toHaveLength(spreadBounds("square_20").minSpreads);
    expect(removeSpread(doc, 0)).toBe(doc);
  });

  it("is a no-op (SAME reference) out of range", () => {
    const grown = addSpreadAfter(makeDoc(), 0, "extra");
    expect(removeSpread(grown, grown.spreads.length)).toBe(grown);
    expect(removeSpread(grown, -1)).toBe(grown);
  });
});

// --- moveSpread --------------------------------------------------------------------

describe("moveSpread", () => {
  it("moves forward correctly", () => {
    const doc = makeDoc();
    const next = moveSpread(doc, 1, 4);
    expect(spreadIds(next)).toEqual([
      "spread-1",
      "spread-3",
      "spread-4",
      "spread-5",
      "spread-2",
      ...spreadIds(doc).slice(5),
    ]);
  });

  it("moves backward correctly", () => {
    const doc = makeDoc();
    const next = moveSpread(doc, 4, 1);
    expect(spreadIds(next)).toEqual([
      "spread-1",
      "spread-5",
      "spread-2",
      "spread-3",
      "spread-4",
      ...spreadIds(doc).slice(5),
    ]);
  });

  it("preserves the ids as a permutation", () => {
    const doc = makeDoc();
    const next = moveSpread(doc, 0, doc.spreads.length - 1);
    expect([...spreadIds(next)].sort()).toEqual([...spreadIds(doc)].sort());
    expect(next.spreads).toHaveLength(doc.spreads.length);
  });

  it("is a no-op (SAME reference) when from === to or out of range", () => {
    const doc = makeDoc();
    expect(moveSpread(doc, 3, 3)).toBe(doc);
    expect(moveSpread(doc, -1, 2)).toBe(doc);
    expect(moveSpread(doc, 2, -1)).toBe(doc);
    expect(moveSpread(doc, doc.spreads.length, 0)).toBe(doc);
    expect(moveSpread(doc, 0, doc.spreads.length)).toBe(doc);
  });
});

// --- schema invariant over op sequences ----------------------------------------------

describe("schema invariant", () => {
  it("any op sequence still parses with bookDocumentSchema after every step", () => {
    const steps: Array<(d: BookDocument) => BookDocument> = [
      (d) => placePhoto(d, 0, 0, "p1"),
      (d) => setSlotCrop(d, 0, 0, { x: 0.1, y: 0.9, scale: 2.2 }),
      (d) => setSlotText(d, 0, 1, { text: "hi", fontId: "lora", align: "center" }),
      (d) => switchSpreadLayout(d, 0, "spread-quad"),
      (d) => addSpreadAfter(d, 2, "added-spread"),
      (d) => moveSpread(d, 0, 5),
      (d) => removeSpread(d, 3),
      (d) => switchSpreadLayout(d, 1, "spread-gallery-caption"),
      // After the move/remove shuffle above, the photo spread sits at index 4:
      // the extreme crop must clamp into schema range, then clear.
      (d) => setSlotCrop(d, 4, 0, { x: 5, y: -1, scale: 99 }),
      (d) => clearSlot(d, 4, 0),
      (d) => placePhoto(d, 99, 0, "out-of-bounds"),
      (d) => placePhoto(d, 1, 0, "p2"),
    ];

    let doc = makeDoc();
    for (const step of steps) {
      doc = step(doc);
      expect(() => bookDocumentSchema.parse(doc)).not.toThrow();
    }
  });
});
