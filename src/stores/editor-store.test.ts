import { describe, expect, it } from "vitest";

import { DEFAULT_CROP } from "@/lib/crop";
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
  it("selection defaults to { spreadIndex: 0, slotIndex: null }", () => {
    const store = makeStore();
    expect(store.getState().selection).toEqual({
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
