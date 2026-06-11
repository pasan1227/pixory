import { describe, expect, it } from "vitest";

import { DEFAULT_CROP } from "@/lib/crop";
import { remapSlots } from "@/lib/remap-slots";
import { spreadSchema } from "@/lib/schemas/book";
import { getSpreadLayout, SPREAD_LAYOUTS } from "@/data/layouts";
import type {
  Crop,
  PhotoPlacement,
  SlotContent,
  Spread,
  TextContent,
} from "@/types/book";
import type { SpreadLayout } from "@/types/layout";

// --- helpers ---------------------------------------------------------------

function photo(photoId: string, crop: Crop = DEFAULT_CROP): PhotoPlacement {
  return { kind: "photo", photoId, crop: { ...crop } };
}

function text(value: string): TextContent {
  return { kind: "text", text: value, fontId: "inter", align: "left" };
}

function makeSpread(
  layoutId: string,
  slots: SlotContent[],
  id = "spread-1",
): Spread {
  return { id, layoutId, slots };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function asPhoto(slot: SlotContent | undefined): PhotoPlacement {
  if (slot === undefined || slot.kind !== "photo") {
    throw new Error(`expected a photo slot, got ${slot?.kind ?? "undefined"}`);
  }
  return slot;
}

function asText(slot: SlotContent | undefined): TextContent {
  if (slot === undefined || slot.kind !== "text") {
    throw new Error(`expected a text slot, got ${slot?.kind ?? "undefined"}`);
  }
  return slot;
}

function photosOf(slots: SlotContent[]): PhotoPlacement[] {
  return slots.filter((s): s is PhotoPlacement => s.kind === "photo");
}

function textsOf(slots: SlotContent[]): TextContent[] {
  return slots.filter((s): s is TextContent => s.kind === "text");
}

// A spread with every slot of the layout filled, with distinct deterministic
// crops so order/identity mix-ups are detectable.
function filledSpreadFor(layout: SpreadLayout): Spread {
  let p = 0;
  let t = 0;
  const slots: SlotContent[] = layout.slots.map((slot) => {
    if (slot.type === "photo") {
      p += 1;
      return photo(`photo-${p}`, { x: 0.1 * p, y: 0.2, scale: 1 + 0.1 * p });
    }
    t += 1;
    return text(`caption-${t}`);
  });
  return makeSpread(layout.id, slots, `src-${layout.id}`);
}

// --- hand-computed cases ----------------------------------------------------

describe("remapSlots", () => {
  it("4-photo spread -> 2-photo layout: first two land, last two overflow in order, crops verbatim", () => {
    const crops: Crop[] = [
      { x: 0, y: 0, scale: 1 },
      { x: 0.25, y: 0.75, scale: 2.5 },
      { x: 1, y: 1, scale: 3 },
      { x: 0.5, y: 0.5, scale: 1.2 },
    ];
    const source = makeSpread("spread-quad", [
      photo("a", crops[0]),
      photo("b", crops[1]),
      photo("c", crops[2]),
      photo("d", crops[3]),
    ]);

    const result = remapSlots(source, getSpreadLayout("spread-duo"));

    expect(result.spread.slots).toEqual([
      { kind: "photo", photoId: "a", crop: { x: 0, y: 0, scale: 1 } },
      { kind: "photo", photoId: "b", crop: { x: 0.25, y: 0.75, scale: 2.5 } },
    ]);
    expect(result.overflowPhotos).toEqual([
      { kind: "photo", photoId: "c", crop: { x: 1, y: 1, scale: 3 } },
      { kind: "photo", photoId: "d", crop: { x: 0.5, y: 0.5, scale: 1.2 } },
    ]);
    expect(result.overflowTexts).toEqual([]);
    expect(result.spread.id).toBe("spread-1");
    expect(result.spread.layoutId).toBe("spread-duo");
  });

  it("1-photo spread -> 4-photo layout: photo at index 0, empties at indices 1-3", () => {
    const source = makeSpread("spread-single", [
      photo("solo", { x: 0.3, y: 0.6, scale: 1.5 }),
    ]);

    const result = remapSlots(source, getSpreadLayout("spread-quad"));

    expect(result.spread.slots).toHaveLength(4);
    expect(result.spread.slots[0]).toEqual({
      kind: "photo",
      photoId: "solo",
      crop: { x: 0.3, y: 0.6, scale: 1.5 },
    });
    expect(result.spread.slots[1]).toEqual({ kind: "empty" });
    expect(result.spread.slots[2]).toEqual({ kind: "empty" });
    expect(result.spread.slots[3]).toEqual({ kind: "empty" });
    expect(result.overflowPhotos).toEqual([]);
    expect(result.overflowTexts).toEqual([]);
  });

  it("photo+text spread -> text-only layout: photo overflows, text lands", () => {
    const source = makeSpread("spread-story", [
      photo("pic", { x: 0.4, y: 0.1, scale: 2 }),
      text("our trip"),
    ]);

    const result = remapSlots(source, getSpreadLayout("spread-text"));

    expect(result.spread.slots).toEqual([
      { kind: "text", text: "our trip", fontId: "inter", align: "left" },
    ]);
    expect(result.overflowPhotos).toEqual([
      { kind: "photo", photoId: "pic", crop: { x: 0.4, y: 0.1, scale: 2 } },
    ]);
    expect(result.overflowTexts).toEqual([]);
  });

  it("all-empty spread -> any layout: all slots empty, no overflow", () => {
    const source = makeSpread("spread-duo", [
      { kind: "empty" },
      { kind: "empty" },
    ]);

    for (const layout of SPREAD_LAYOUTS) {
      const result = remapSlots(source, layout);
      expect(result.spread.slots).toEqual(
        layout.slots.map(() => ({ kind: "empty" })),
      );
      expect(result.overflowPhotos).toEqual([]);
      expect(result.overflowTexts).toEqual([]);
    }
  });

  it("empty slots contribute nothing: gaps in the source compact toward earlier slots", () => {
    const source = makeSpread("spread-quad", [
      { kind: "empty" },
      photo("first"),
      { kind: "empty" },
      photo("second"),
    ]);

    const result = remapSlots(source, getSpreadLayout("spread-pages"));

    expect(asPhoto(result.spread.slots[0]).photoId).toBe("first");
    expect(asPhoto(result.spread.slots[1]).photoId).toBe("second");
    expect(result.overflowPhotos).toEqual([]);
  });

  describe("spread-gallery-caption (photo, text, photo, photo) index alignment", () => {
    const gallery = getSpreadLayout("spread-gallery-caption");

    it("layout slot types are photo,text,photo,photo as documented", () => {
      expect(gallery.slots.map((s) => s.type)).toEqual([
        "photo",
        "text",
        "photo",
        "photo",
      ]);
    });

    it("into gallery-caption: photos skip the text slot, text lands at index 1", () => {
      const source = makeSpread("spread-story", [photo("p1"), text("hello")]);

      const result = remapSlots(source, gallery);

      expect(asPhoto(result.spread.slots[0]).photoId).toBe("p1");
      expect(asText(result.spread.slots[1]).text).toBe("hello");
      expect(result.spread.slots[2]).toEqual({ kind: "empty" });
      expect(result.spread.slots[3]).toEqual({ kind: "empty" });
      expect(result.overflowPhotos).toEqual([]);
      expect(result.overflowTexts).toEqual([]);
    });

    it("4 photos into gallery-caption: indices 0,2,3 filled, text slot stays empty, 4th photo overflows", () => {
      const source = makeSpread("spread-quad", [
        photo("p1"),
        photo("p2"),
        photo("p3"),
        photo("p4"),
      ]);

      const result = remapSlots(source, gallery);

      expect(asPhoto(result.spread.slots[0]).photoId).toBe("p1");
      expect(result.spread.slots[1]).toEqual({ kind: "empty" });
      expect(asPhoto(result.spread.slots[2]).photoId).toBe("p2");
      expect(asPhoto(result.spread.slots[3]).photoId).toBe("p3");
      expect(result.overflowPhotos.map((p) => p.photoId)).toEqual(["p4"]);
    });

    it("out of gallery-caption into a 3-photo layout: photos keep order, text overflows", () => {
      const source = makeSpread("spread-gallery-caption", [
        photo("a"),
        text("caption"),
        photo("b"),
        photo("c"),
      ]);

      const result = remapSlots(source, getSpreadLayout("spread-trio-left"));

      expect(result.spread.slots.map((s) => asPhoto(s).photoId)).toEqual([
        "a",
        "b",
        "c",
      ]);
      expect(result.overflowPhotos).toEqual([]);
      expect(result.overflowTexts).toEqual([
        { kind: "text", text: "caption", fontId: "inter", align: "left" },
      ]);
    });
  });

  it("overflow texts preserve slot order when none fit", () => {
    const source = makeSpread("spread-gallery-caption", [
      photo("a"),
      text("first"),
      { kind: "empty" },
      photo("b"),
    ]);

    const result = remapSlots(source, getSpreadLayout("spread-pages"));

    expect(result.spread.slots.map((s) => asPhoto(s).photoId)).toEqual([
      "a",
      "b",
    ]);
    expect(result.overflowTexts.map((t) => t.text)).toEqual(["first"]);
  });

  it("identity remap (same layout) is content-stable with no overflow", () => {
    for (const layout of SPREAD_LAYOUTS) {
      const source = filledSpreadFor(layout);
      const result = remapSlots(source, layout);

      expect(result.spread).toEqual(source);
      expect(result.overflowPhotos).toEqual([]);
      expect(result.overflowTexts).toEqual([]);
    }
  });

  it("does not mutate a deeply frozen input spread", () => {
    const source = deepFreeze(
      makeSpread("spread-story", [
        photo("pic", { x: 0.4, y: 0.1, scale: 2 }),
        text("frozen"),
      ]),
    );

    expect(() => remapSlots(source, getSpreadLayout("spread-quad"))).not
      .toThrow();
    expect(source.slots).toHaveLength(2);
  });

  it("result shares no mutable state with the input: editing the result leaves the input intact", () => {
    const source = makeSpread("spread-duo", [
      photo("a", { x: 0.25, y: 0.75, scale: 2 }),
      photo("b", { x: 0.5, y: 0.5, scale: 1 }),
    ]);
    const snapshot = structuredClone(source);

    const result = remapSlots(source, getSpreadLayout("spread-single"));
    asPhoto(result.spread.slots[0]).crop.x = 0;
    const overflowed = result.overflowPhotos[0];
    overflowed.crop.scale = 3;

    expect(source).toEqual(snapshot);
  });

  it("identity remap result is detached from the input as well", () => {
    const source = makeSpread("spread-single", [
      photo("solo", { x: 0.3, y: 0.6, scale: 1.5 }),
    ]);
    const snapshot = structuredClone(source);

    const result = remapSlots(source, getSpreadLayout("spread-single"));
    asPhoto(result.spread.slots[0]).crop.y = 0;

    expect(source).toEqual(snapshot);
  });

  // --- invariants over every layout pair ------------------------------------

  const layoutPairs: [string, string][] = SPREAD_LAYOUTS.flatMap((from) =>
    SPREAD_LAYOUTS.map((to): [string, string] => [from.id, to.id]),
  );

  it.each(layoutPairs)(
    "conserves content and alignment remapping %s -> %s",
    (fromId, toId) => {
      const fromLayout = getSpreadLayout(fromId);
      const toLayout = getSpreadLayout(toId);
      const source = filledSpreadFor(fromLayout);
      const snapshot = structuredClone(source);

      const result = remapSlots(source, toLayout);

      // Input untouched.
      expect(source).toEqual(snapshot);

      // Result identity and shape.
      expect(result.spread.id).toBe(source.id);
      expect(result.spread.layoutId).toBe(toId);
      expect(result.spread.slots).toHaveLength(toLayout.slots.length);
      expect(spreadSchema.parse(result.spread)).toEqual(result.spread);

      // Every slot matches its layout slot's type, or is empty.
      result.spread.slots.forEach((slot, i) => {
        const expectedType = toLayout.slots[i].type;
        expect([expectedType, "empty"]).toContain(slot.kind);
      });

      // Conservation: placed content + overflow equals source content, in order.
      expect(
        photosOf(result.spread.slots).concat(result.overflowPhotos),
      ).toEqual(photosOf(source.slots));
      expect(textsOf(result.spread.slots).concat(result.overflowTexts)).toEqual(
        textsOf(source.slots),
      );

      // Greedy fill: a slot is empty only when its content type ran out, so
      // overflow exists only if every slot of that type in the new layout is filled.
      if (result.overflowPhotos.length > 0) {
        expect(photosOf(result.spread.slots)).toHaveLength(
          toLayout.slots.filter((s) => s.type === "photo").length,
        );
      }
      if (result.overflowTexts.length > 0) {
        expect(textsOf(result.spread.slots)).toHaveLength(
          toLayout.slots.filter((s) => s.type === "text").length,
        );
      }
    },
  );
});

describe("multiple text slots (synthetic layout)", () => {
  // No canonical layout has two text slots, so a reversed text cursor would
  // survive the registry-based suite — pin ordering with a synthetic layout.
  const twoTextLayout: SpreadLayout = {
    id: "synthetic-two-text",
    slots: [
      { x: 0.05, y: 0.1, w: 0.4, h: 0.2, type: "text" },
      { x: 0.55, y: 0.1, w: 0.4, h: 0.2, type: "text" },
    ],
  };

  it("fills text slots in order and overflows the rest in order", () => {
    const source: Spread = {
      id: "s1",
      layoutId: "synthetic-three-text",
      slots: [text("t1"), text("t2"), text("t3")],
    };
    const result = remapSlots(source, twoTextLayout);
    expect(textsOf(result.spread.slots).map((t) => t.text)).toEqual([
      "t1",
      "t2",
    ]);
    expect(result.overflowTexts.map((t) => t.text)).toEqual(["t3"]);
    expect(result.overflowPhotos).toEqual([]);
  });
});
