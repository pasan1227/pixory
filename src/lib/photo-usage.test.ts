import { describe, expect, it } from "vitest";

import { DEFAULT_CROP } from "@/lib/crop";
import { placePhoto, setSlotText, switchSpreadLayout } from "@/lib/document-ops";
import { createEmptyBookDocument } from "@/lib/new-book";
import { countPhotoUsage } from "@/lib/photo-usage";
import type { BookDocument } from "@/types/book";

function makeDoc(): BookDocument {
  return createEmptyBookDocument("square_20");
}

// Attach cover photo slots — countPhotoUsage reads the document shape only,
// so building the cover by hand keeps the fixture independent of cover ops.
function withCoverPhotos(doc: BookDocument, photoIds: string[]): BookDocument {
  return {
    ...doc,
    cover: {
      ...doc.cover,
      layoutId: "cover-duo",
      photoSlots: [
        ...photoIds.map((photoId) => ({
          kind: "photo" as const,
          photoId,
          crop: { ...DEFAULT_CROP },
        })),
        { kind: "empty" as const },
      ],
    },
  };
}

describe("countPhotoUsage", () => {
  it("returns an empty record for a fresh all-empty document", () => {
    expect(countPhotoUsage(makeDoc())).toEqual({});
  });

  it("counts multiple uses of the same photo across spreads", () => {
    let doc = makeDoc();
    doc = placePhoto(doc, 0, 0, "dup");
    doc = placePhoto(doc, 0, 1, "dup");
    doc = placePhoto(doc, 3, 0, "dup");
    doc = placePhoto(doc, 5, 1, "solo");

    expect(countPhotoUsage(doc)).toEqual({ dup: 3, solo: 1 });
  });

  it("counts cover photoSlots, summed with spread usage", () => {
    let doc = makeDoc();
    doc = placePhoto(doc, 0, 0, "dup");
    doc = withCoverPhotos(doc, ["cover-only", "dup"]);

    expect(countPhotoUsage(doc)).toEqual({ dup: 2, "cover-only": 1 });
  });

  it("ignores empty and text slots everywhere", () => {
    let doc = makeDoc();
    doc = switchSpreadLayout(doc, 0, "spread-story");
    doc = setSlotText(doc, 0, 1, {
      text: "a caption",
      fontId: "inter",
      align: "left",
    });
    // Cover with only an empty slot.
    doc = withCoverPhotos(doc, []);

    expect(countPhotoUsage(doc)).toEqual({});

    doc = placePhoto(doc, 0, 0, "only");
    expect(countPhotoUsage(doc)).toEqual({ only: 1 });
  });

  it("does not mutate the document", () => {
    let doc = makeDoc();
    doc = placePhoto(doc, 0, 0, "p1");
    doc = withCoverPhotos(doc, ["p1"]);
    const snapshot = structuredClone(doc);

    countPhotoUsage(doc);

    expect(doc).toEqual(snapshot);
  });
});
