import { describe, expect, it } from "vitest";

import { DEFAULT_CROP } from "@/lib/crop";
import { distributePhotos, type DistributablePhoto } from "@/lib/distribute";
import { createEmptyBookDocument } from "@/lib/new-book";
import { spreadBounds } from "@/lib/print-specs";
import { createEditorStore } from "@/stores/editor-store";
import type {
  BookDocument,
  PhotoPlacement,
  SlotContent,
} from "@/types/book";

// Vanilla-store tests: no React rendering. The store is exercised through
// getState() actions and api.temporal for history.

function makeStore() {
  // square_20 starts at its minimum of 10 spreads, layout "spread-duo".
  return createEditorStore(createEmptyBookDocument("square_20"));
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

describe("editor store basics", () => {
  it("selection defaults to { view: 'spread', spreadIndex: 0, slotIndex: null }", () => {
    const store = makeStore();
    expect(store.getState().selection).toEqual({
      view: "spread",
      spreadIndex: 0,
      slotIndex: null,
    });
  });

  it("placePhoto is reflected in the committed document", () => {
    const store = makeStore();
    store.getState().placePhoto(0, 0, "p1");

    expect(slotAt(store.getState().document, 0, 0)).toEqual({
      kind: "photo",
      photoId: "p1",
      crop: { x: 0.5, y: 0.5, scale: 1 },
    });
  });
});

describe("history discipline", () => {
  it("a document edit pushes exactly ONE past state, partialized to { document }", () => {
    const store = makeStore();
    store.getState().placePhoto(0, 0, "p1");

    const { pastStates } = store.temporal.getState();
    expect(pastStates).toHaveLength(1);
    expect(Object.keys(pastStates[0])).toEqual(["document"]);
  });

  it("selectSpread / selectSlot create NO history entries", () => {
    const store = makeStore();
    store.getState().selectSpread(3);
    store.getState().selectSlot(1);
    store.getState().selectSlot(null);
    store.getState().selectSpread(0);

    expect(store.temporal.getState().pastStates).toHaveLength(0);
  });

  it("no-op ops create NO history entry and keep the document reference", () => {
    const store = makeStore();
    const before = store.getState().document;

    store.getState().placePhoto(99, 0, "ghost"); // out-of-bounds spread
    store.getState().placePhoto(0, 99, "ghost"); // out-of-bounds slot
    store.getState().removeSpread(0); // already at minSpreads

    expect(store.getState().document).toBe(before);
    expect(store.temporal.getState().pastStates).toHaveLength(0);
  });

  it("undo returns the previous document reference; redo restores the edit", () => {
    const store = makeStore();
    const doc0 = store.getState().document;

    store.getState().placePhoto(0, 0, "p1");
    const doc1 = store.getState().document;
    expect(doc1).not.toBe(doc0);

    store.temporal.getState().undo();
    expect(store.getState().document).toBe(doc0);
    expect(store.temporal.getState().futureStates).toHaveLength(1);

    store.temporal.getState().redo();
    expect(store.getState().document).toBe(doc1);
    expect(store.temporal.getState().futureStates).toHaveLength(0);
  });

  it("undo leaves selection untouched (history is document-only)", () => {
    const store = makeStore();
    store.getState().selectSpread(2);
    store.getState().selectSlot(1);
    store.getState().placePhoto(2, 0, "p1");

    store.temporal.getState().undo();

    expect(store.getState().selection).toEqual({
      view: "spread",
      spreadIndex: 2,
      slotIndex: 1,
    });
  });

  it("caps history at 50 past states after 60 distinct edits", () => {
    const store = makeStore();
    for (let i = 0; i < 60; i += 1) {
      store.getState().setText(0, 0, {
        text: `caption ${i}`,
        fontId: "inter",
        align: "left",
      });
    }
    expect(store.temporal.getState().pastStates).toHaveLength(50);
  });
});

describe("selection side effects of document ops", () => {
  it("removeSpread clamps selection.spreadIndex when the last spread was selected", () => {
    const store = makeStore();
    store.getState().addSpreadAfter(9); // 11 spreads, selects index 10
    expect(store.getState().selection.spreadIndex).toBe(10);

    store.getState().removeSpread(10);

    expect(store.getState().document.spreads).toHaveLength(10);
    expect(store.getState().selection).toEqual({
      view: "spread",
      spreadIndex: 9,
      slotIndex: null,
    });
  });

  it("switchLayout resets slotIndex to null", () => {
    const store = makeStore();
    store.getState().selectSlot(1);
    store.getState().switchLayout(0, "spread-quad");

    expect(store.getState().selection.slotIndex).toBeNull();
    expect(store.getState().document.spreads[0].layoutId).toBe("spread-quad");
  });

  it("moveSpread keeps the selection following the moved spread", () => {
    const store = makeStore();
    store.getState().selectSpread(2);
    const movedId = store.getState().document.spreads[2].id;

    store.getState().moveSpread(2, 5);

    expect(store.getState().selection.spreadIndex).toBe(5);
    expect(store.getState().document.spreads[5].id).toBe(movedId);
  });

  it("addSpreadAfter selects the newly inserted spread", () => {
    const store = makeStore();
    store.getState().addSpreadAfter(0);

    expect(store.getState().document.spreads).toHaveLength(11);
    expect(store.getState().selection).toEqual({
      view: "spread",
      spreadIndex: 1,
      slotIndex: null,
    });
  });

  it("addSpreadAfter generates unique ids across calls", () => {
    const store = makeStore();
    const originalIds = new Set(
      store.getState().document.spreads.map((s) => s.id),
    );

    store.getState().addSpreadAfter(0); // new spread at index 1
    store.getState().addSpreadAfter(0); // second new spread at index 1, first shifts to 2

    const { spreads } = store.getState().document;
    expect(spreads).toHaveLength(originalIds.size + 2);
    const newIds = spreads.map((s) => s.id).filter((id) => !originalIds.has(id));
    expect(newIds).toHaveLength(2);
    expect(newIds[0]).not.toBe(newIds[1]);
  });

  it("addSpreadAfter at maxSpreads is a full no-op: no history, no selection change", () => {
    const store = makeStore();
    const { maxSpreads } = spreadBounds("square_20");
    while (store.getState().document.spreads.length < maxSpreads) {
      store.getState().addSpreadAfter(0);
    }
    store.temporal.getState().clear();
    const before = store.getState();

    store.getState().addSpreadAfter(0);

    expect(store.getState().document).toBe(before.document);
    expect(store.getState().selection).toEqual(before.selection);
    expect(store.temporal.getState().pastStates).toHaveLength(0);
  });
});

describe("setCrop undo/redo flow", () => {
  it("placePhoto -> setCrop -> undo restores DEFAULT_CROP -> redo restores the crop", () => {
    const store = makeStore();
    store.getState().placePhoto(0, 0, "p1");
    store.getState().setCrop(0, 0, { x: 0.2, y: 0.8, scale: 2 });

    expect(asPhoto(slotAt(store.getState().document, 0, 0)).crop).toEqual({
      x: 0.2,
      y: 0.8,
      scale: 2,
    });

    store.temporal.getState().undo();
    expect(asPhoto(slotAt(store.getState().document, 0, 0)).crop).toEqual(
      DEFAULT_CROP,
    );

    store.temporal.getState().redo();
    expect(asPhoto(slotAt(store.getState().document, 0, 0)).crop).toEqual({
      x: 0.2,
      y: 0.8,
      scale: 2,
    });
  });

  it("a clamped-to-identical setCrop is a no-op with no history entry", () => {
    const store = makeStore();
    store.getState().placePhoto(0, 0, "p1");
    const placed = store.getState().document;

    // Clamps to the DEFAULT_CROP already on the slot.
    store.getState().setCrop(0, 0, { x: 0.5, y: 0.5, scale: 0.4 });

    expect(store.getState().document).toBe(placed);
    expect(store.temporal.getState().pastStates).toHaveLength(1);
  });
});

describe("cover selection", () => {
  it("selectCover sets view 'cover', clears slotIndex, keeps spreadIndex, no history", () => {
    const store = makeStore();
    store.getState().selectSpread(3);
    store.getState().selectSlot(1);

    store.getState().selectCover();

    expect(store.getState().selection).toEqual({
      view: "cover",
      spreadIndex: 3,
      slotIndex: null,
    });
    expect(store.temporal.getState().pastStates).toHaveLength(0);
  });

  it("selectSpread flips back to view 'spread' after selectCover", () => {
    const store = makeStore();
    store.getState().selectCover();

    store.getState().selectSpread(2);

    expect(store.getState().selection).toEqual({
      view: "spread",
      spreadIndex: 2,
      slotIndex: null,
    });
  });
});

describe("cover history discipline", () => {
  it("each document-changing cover action pushes exactly ONE history entry", () => {
    const store = makeStore();
    const past = () => store.temporal.getState().pastStates.length;

    store.getState().updateCoverStyle({ title: "Our Trip" });
    expect(past()).toBe(1);

    store.getState().switchCoverLayout("cover-full");
    expect(past()).toBe(2);

    store.getState().placeCoverPhoto(0, "c1");
    expect(past()).toBe(3);

    store.getState().setCoverCrop(0, { x: 0.2, y: 0.8, scale: 2 });
    expect(past()).toBe(4);

    store.getState().clearCoverSlot(0);
    expect(past()).toBe(5);
  });

  it("cover no-ops create NO history entry and keep the document reference", () => {
    const store = makeStore();
    const before = store.getState().document;

    store.getState().updateCoverStyle({ title: "" }); // same title
    store.getState().switchCoverLayout("cover-classic"); // same layout
    store.getState().placeCoverPhoto(0, "ghost"); // cover-classic has zero slots
    store.getState().setCoverCrop(0, { x: 0.5, y: 0.5, scale: 2 }); // OOB slot
    store.getState().clearCoverSlot(0); // OOB slot

    expect(store.getState().document).toBe(before);
    expect(store.temporal.getState().pastStates).toHaveLength(0);
  });

  it("undo after a cover edit restores the previous document (title round-trips)", () => {
    const store = makeStore();
    const doc0 = store.getState().document;

    store.getState().updateCoverStyle({ title: "Galle 2026" });
    expect(store.getState().document.cover.title).toBe("Galle 2026");

    store.temporal.getState().undo();
    expect(store.getState().document).toBe(doc0);
    expect(store.getState().document.cover.title).toBe("");

    store.temporal.getState().redo();
    expect(store.getState().document.cover.title).toBe("Galle 2026");
  });

  it("cover and spread edits interleave in ONE history with correct undo order", () => {
    const store = makeStore();
    store.getState().placePhoto(0, 0, "p1"); // 1: spread edit
    store.getState().updateCoverStyle({ title: "T" }); // 2: cover edit
    store.getState().switchCoverLayout("cover-full"); // 3: cover edit
    store.getState().placeCoverPhoto(0, "c1"); // 4: cover edit
    store.getState().placePhoto(0, 1, "p2"); // 5: spread edit
    expect(store.temporal.getState().pastStates).toHaveLength(5);

    store.temporal.getState().undo(); // drops 5
    expect(slotAt(store.getState().document, 0, 1)).toEqual({ kind: "empty" });
    expect(store.getState().document.cover.photoSlots[0]).toMatchObject({
      kind: "photo",
      photoId: "c1",
    });

    store.temporal.getState().undo(); // drops 4
    expect(store.getState().document.cover.photoSlots).toEqual([
      { kind: "empty" },
    ]);

    store.temporal.getState().undo(); // drops 3
    expect(store.getState().document.cover.layoutId).toBe("cover-classic");
    expect(store.getState().document.cover.title).toBe("T");

    store.temporal.getState().undo(); // drops 2
    expect(store.getState().document.cover.title).toBe("");
    expect(asPhoto(slotAt(store.getState().document, 0, 0)).photoId).toBe("p1");

    store.temporal.getState().undo(); // drops 1
    expect(slotAt(store.getState().document, 0, 0)).toEqual({ kind: "empty" });
    expect(store.temporal.getState().pastStates).toHaveLength(0);
    expect(store.temporal.getState().futureStates).toHaveLength(5);
  });
});

describe("cover selection side effects", () => {
  it("switchCoverLayout resets slotIndex to null and keeps the cover view", () => {
    const store = makeStore();
    store.getState().selectCover();
    store.getState().selectSlot(0);

    store.getState().switchCoverLayout("cover-duo");

    expect(store.getState().selection).toEqual({
      view: "cover",
      spreadIndex: 0,
      slotIndex: null,
    });
    expect(store.getState().document.cover.layoutId).toBe("cover-duo");
  });

  it("placeCoverPhoto works on the committed document after switchCoverLayout", () => {
    const store = makeStore();
    store.getState().switchCoverLayout("cover-full");

    store.getState().placeCoverPhoto(0, "c1");

    expect(store.getState().document.cover.photoSlots[0]).toEqual({
      kind: "photo",
      photoId: "c1",
      crop: DEFAULT_CROP,
    });
  });
});

describe("autoCreate", () => {
  // Five dated photos across two days, mixed orientations: day 1 chunks as a
  // trio, day 2 as a duo, then padding spreads up to square_20's minimum.
  const photos: DistributablePhoto[] = [
    {
      id: "d1",
      width: 2000,
      height: 1500,
      capturedAt: new Date("2026-01-01T08:00:00Z"),
    },
    {
      id: "d2",
      width: 1500,
      height: 2000,
      capturedAt: new Date("2026-01-01T09:15:00Z"),
    },
    {
      id: "d3",
      width: 2400,
      height: 1600,
      capturedAt: new Date("2026-01-01T11:30:00Z"),
    },
    {
      id: "d4",
      width: 1600,
      height: 2400,
      capturedAt: new Date("2026-01-02T07:45:00Z"),
    },
    {
      id: "d5",
      width: 3000,
      height: 2000,
      capturedAt: new Date("2026-01-02T10:00:00Z"),
    },
  ];

  it("replaces document.spreads with exactly distributePhotos' output (deep-equal)", () => {
    const store = makeStore();

    store.getState().autoCreate(photos);

    expect(store.getState().document.spreads).toEqual(
      distributePhotos(photos, "square_20").spreads,
    );
  });

  it("creates exactly ONE history entry on top of prior edits", () => {
    const store = makeStore();
    store.getState().placePhoto(0, 0, "seed");
    expect(store.temporal.getState().pastStates).toHaveLength(1);

    store.getState().autoCreate(photos);

    expect(store.temporal.getState().pastStates).toHaveLength(2);
  });

  it("resets selection to { view: 'spread', spreadIndex: 0, slotIndex: null }", () => {
    const store = makeStore();
    store.getState().selectSpread(7);
    store.getState().selectSlot(1);
    store.getState().selectCover();

    store.getState().autoCreate(photos);

    expect(store.getState().selection).toEqual({
      view: "spread",
      spreadIndex: 0,
      slotIndex: null,
    });
  });

  it("undo restores the previous document reference and spreads; redo reapplies the distribution", () => {
    const store = makeStore();
    store.getState().placePhoto(2, 1, "seed");
    const docBefore = store.getState().document;

    store.getState().autoCreate(photos);
    const docAfter = store.getState().document;
    expect(docAfter).not.toBe(docBefore);

    store.temporal.getState().undo();
    expect(store.getState().document).toBe(docBefore);
    expect(store.getState().document.spreads).toBe(docBefore.spreads);
    expect(asPhoto(slotAt(store.getState().document, 2, 1)).photoId).toBe(
      "seed",
    );

    store.temporal.getState().redo();
    expect(store.getState().document).toBe(docAfter);
    expect(store.getState().document.spreads).toEqual(
      distributePhotos(photos, "square_20").spreads,
    );
  });

  it("autoCreate([]) after edits wipes spreads back to minSpreads empties with ONE history entry", () => {
    const store = makeStore();
    store.getState().placePhoto(0, 0, "seed");
    expect(store.temporal.getState().pastStates).toHaveLength(1);

    store.getState().autoCreate([]);

    const { spreads } = store.getState().document;
    expect(spreads).toHaveLength(spreadBounds("square_20").minSpreads);
    expect(
      spreads.every((s) => s.slots.every((slot) => slot.kind === "empty")),
    ).toBe(true);
    expect(store.temporal.getState().pastStates).toHaveLength(2);
  });

  it("autoCreate([]) on a pristine book is NOT a no-op: distribute deterministically rebuilds value-identical empty spreads but as a NEW array, and replaceSpreads only no-ops on the SAME reference — so ONE entry is recorded", () => {
    const store = makeStore();
    const before = store.getState().document;

    store.getState().autoCreate([]);

    const after = store.getState().document;
    expect(after).not.toBe(before); // actual behavior: fresh document reference
    expect(after.spreads).toEqual(before.spreads); // ...with value-identical spreads
    expect(store.temporal.getState().pastStates).toHaveLength(1);
  });
});
