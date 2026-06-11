import { describe, expect, it } from "vitest";

import {
  checkCompleteness,
  countBySeverity,
  issueSeverity,
  type CompletenessIssue,
  type IssueKind,
  type PhotoDims,
} from "@/lib/completeness";
import {
  placeCoverPhoto,
  switchCoverLayout,
  updateCoverStyle,
} from "@/lib/cover-ops";
import {
  placePhoto,
  setSlotCrop,
  setSlotText,
  switchSpreadLayout,
} from "@/lib/document-ops";
import { createEmptyBookDocument } from "@/lib/new-book";
import type { BookDocument } from "@/types/book";

// ---------------------------------------------------------------------------
// Hand-computed DPI fixtures (square_20: 200×200mm page, 400mm spread).
//
// cover-full rect {w:1, h:1} → 200×200mm physical (7.874in wide). A square
// photo cover-fits a square slot with its full width visible at scale 1, so
//   dpi = photoWidthPx × 25.4 / 200
//   1000×1000 → 127.0  (low-res)      700×700 → 88.9  (blocked-res)
//
// spread-duo slot {w:0.45, h:0.9} → 0.45×400 = 180mm wide, 0.9×200 = 180mm
// tall (7.0866in, physical aspect 1). A 4:3 landscape photo shows 3/4 of its
// width through the square window (visW = (1 / (4/3)) / scale), so
//   dpi = photoWidthPx × 0.75 / scale × 25.4 / 180
//   2000×1500 → 211.7 (ok)   1000×750 → 105.8 (low)   600×450 → 63.5 (blocked)
// Zoom divides visible width: 2000×1500 at scale 2 → 105.8, at scale 3 → 70.6.
// ---------------------------------------------------------------------------

const NO_PHOTOS: Record<string, PhotoDims> = {};

function makeDoc(): BookDocument {
  // square_20: cover-classic (zero photo slots), empty title, 10 spread-duo
  // spreads with 2 empty photo slots each.
  return createEmptyBookDocument("square_20");
}

function findIssue(
  issues: CompletenessIssue[],
  target: "cover" | "spread",
  spreadIndex: number,
  slotIndex: number,
): CompletenessIssue | undefined {
  return issues.find(
    (issue) =>
      issue.target === target &&
      issue.spreadIndex === spreadIndex &&
      issue.slotIndex === slotIndex,
  );
}

const caption = { fontId: "inter", align: "left" } as const;

describe("checkCompleteness on a fresh empty book", () => {
  it("reports missing-title plus one empty-slot per photo slot and NO cover slot issues", () => {
    const issues = checkCompleteness(makeDoc(), NO_PHOTOS);

    // 1 title + 10 spreads × 2 photo slots; cover-classic contributes nothing.
    expect(issues).toHaveLength(21);
    expect(issues[0]).toEqual({
      kind: "missing-title",
      target: "cover",
      spreadIndex: 0,
      slotIndex: -1,
      dpi: null,
    });
    expect(issues.filter((issue) => issue.target === "cover")).toHaveLength(1);
    expect(
      issues
        .slice(1)
        .every(
          (issue) => issue.kind === "empty-slot" && issue.target === "spread",
        ),
    ).toBe(true);
  });

  it("orders issues: title first, then spreads in page order, slots in reading order", () => {
    const doc = makeDoc();
    const issues = checkCompleteness(doc, NO_PHOTOS);

    const positions = issues
      .slice(1)
      .map((issue) => [issue.spreadIndex, issue.slotIndex]);
    const readingOrder = doc.spreads.flatMap((spread, spreadIndex) =>
      spread.slots.map((_, slotIndex) => [spreadIndex, slotIndex]),
    );
    expect(positions).toEqual(readingOrder);
  });
});

describe("title completeness", () => {
  it("a whitespace-only title still counts as missing", () => {
    const doc = updateCoverStyle(makeDoc(), { title: "   " });
    const issues = checkCompleteness(doc, NO_PHOTOS);
    expect(issues[0].kind).toBe("missing-title");
  });

  it("a real title clears the missing-title issue", () => {
    const doc = updateCoverStyle(makeDoc(), { title: "Galle 2026" });
    const issues = checkCompleteness(doc, NO_PHOTOS);
    expect(issues.some((issue) => issue.kind === "missing-title")).toBe(false);
    expect(issues).toHaveLength(20); // only the spread slots remain
  });
});

describe("cover photo slots", () => {
  it("an empty cover-full slot reports empty-slot with target 'cover' right after the title", () => {
    const doc = switchCoverLayout(makeDoc(), "cover-full");
    const issues = checkCompleteness(doc, NO_PHOTOS);

    expect(issues[0].kind).toBe("missing-title");
    expect(issues[1]).toEqual({
      kind: "empty-slot",
      target: "cover",
      spreadIndex: 0,
      slotIndex: 0,
      dpi: null,
    });
  });

  it("a 1000×1000 photo on cover-full is low-res at ~127 DPI", () => {
    const doc = placeCoverPhoto(
      switchCoverLayout(makeDoc(), "cover-full"),
      0,
      "c1",
    );
    const issues = checkCompleteness(doc, { c1: { width: 1000, height: 1000 } });

    const issue = findIssue(issues, "cover", 0, 0);
    expect(issue?.kind).toBe("low-res");
    expect(issue?.dpi).toBeCloseTo(127, 0); // within 0.5
  });

  it("a 700×700 photo on cover-full is blocked-res at ~88.9 DPI", () => {
    const doc = placeCoverPhoto(
      switchCoverLayout(makeDoc(), "cover-full"),
      0,
      "c1",
    );
    const issues = checkCompleteness(doc, { c1: { width: 700, height: 700 } });

    const issue = findIssue(issues, "cover", 0, 0);
    expect(issue?.kind).toBe("blocked-res");
    expect(issue?.dpi).toBeCloseTo(88.9, 0); // within 0.5
  });
});

describe("spread photo resolution in a spread-duo slot", () => {
  function slotZeroIssue(dims: PhotoDims): CompletenessIssue | undefined {
    const doc = placePhoto(makeDoc(), 0, 0, "p1");
    return findIssue(checkCompleteness(doc, { p1: dims }), "spread", 0, 0);
  }

  it("2000×1500 resolves ~211.7 DPI → no issue", () => {
    expect(slotZeroIssue({ width: 2000, height: 1500 })).toBeUndefined();
  });

  it("1000×750 resolves ~105.8 DPI → low-res", () => {
    const issue = slotZeroIssue({ width: 1000, height: 750 });
    expect(issue?.kind).toBe("low-res");
    expect(issue?.dpi).toBeCloseTo(105.8, 0); // within 0.5
  });

  it("600×450 resolves ~63.5 DPI → blocked-res", () => {
    const issue = slotZeroIssue({ width: 600, height: 450 });
    expect(issue?.kind).toBe("blocked-res");
    expect(issue?.dpi).toBeCloseTo(63.5, 0); // within 0.5
  });
});

describe("missing-photo", () => {
  it("a placed photoId absent from the dims map reports missing-photo with null dpi", () => {
    const doc = placePhoto(makeDoc(), 0, 0, "ghost");
    const issue = findIssue(checkCompleteness(doc, NO_PHOTOS), "spread", 0, 0);
    expect(issue).toEqual({
      kind: "missing-photo",
      target: "spread",
      spreadIndex: 0,
      slotIndex: 0,
      dpi: null,
    });
  });
});

describe("text slots (spread-story slot 1)", () => {
  const storyDoc = () => switchSpreadLayout(makeDoc(), 0, "spread-story");

  it("an empty text slot reports empty-text", () => {
    const issue = findIssue(
      checkCompleteness(storyDoc(), NO_PHOTOS),
      "spread",
      0,
      1,
    );
    expect(issue?.kind).toBe("empty-text");
    expect(issue?.dpi).toBeNull();
  });

  it("whitespace-only text still reports empty-text", () => {
    const doc = setSlotText(storyDoc(), 0, 1, { ...caption, text: " \n\t " });
    const issue = findIssue(checkCompleteness(doc, NO_PHOTOS), "spread", 0, 1);
    expect(issue?.kind).toBe("empty-text");
  });

  it("real text clears the issue for that slot", () => {
    const doc = setSlotText(storyDoc(), 0, 1, {
      ...caption,
      text: "Our first day",
    });
    const issues = checkCompleteness(doc, NO_PHOTOS);
    expect(findIssue(issues, "spread", 0, 1)).toBeUndefined();
    // The story layout's photo slot is still empty and still reported.
    expect(findIssue(issues, "spread", 0, 0)?.kind).toBe("empty-slot");
  });
});

describe("issueSeverity and countBySeverity", () => {
  it("low-res and empty-text are warnings; everything else is an error", () => {
    expect(issueSeverity("low-res")).toBe("warning");
    expect(issueSeverity("empty-text")).toBe("warning");
    const errors: IssueKind[] = [
      "missing-title",
      "empty-slot",
      "missing-photo",
      "blocked-res",
    ];
    for (const kind of errors) {
      expect(issueSeverity(kind)).toBe("error");
    }
  });

  it("countBySeverity totals match a mixed fixture", () => {
    // missing-title(E) + spread 0 story: low-res(W) + empty-text(W);
    // spread 1: missing-photo(E) + blocked-res(E); spreads 2–9: 16 empty-slot(E).
    let doc = switchSpreadLayout(makeDoc(), 0, "spread-story");
    doc = placePhoto(doc, 0, 0, "low");
    doc = placePhoto(doc, 1, 0, "ghost");
    doc = placePhoto(doc, 1, 1, "tiny");
    const dims: Record<string, PhotoDims> = {
      low: { width: 1000, height: 750 },
      tiny: { width: 600, height: 450 },
    };

    const issues = checkCompleteness(doc, dims);

    expect(issues).toHaveLength(21);
    expect(countBySeverity(issues)).toEqual({ errors: 19, warnings: 2 });
  });
});

describe("zoom raises severity", () => {
  const withPhoto = () => placePhoto(makeDoc(), 0, 0, "p1");
  const dims: Record<string, PhotoDims> = {
    p1: { width: 2000, height: 1500 },
  };

  it("a photo that is ok at scale 1 becomes low-res at scale 2 (~105.8 DPI)", () => {
    const doc = withPhoto();
    expect(findIssue(checkCompleteness(doc, dims), "spread", 0, 0)).toBeUndefined();

    const zoomed = setSlotCrop(doc, 0, 0, { x: 0.5, y: 0.5, scale: 2 });
    const issue = findIssue(checkCompleteness(zoomed, dims), "spread", 0, 0);
    expect(issue?.kind).toBe("low-res");
    expect(issue?.dpi).toBeCloseTo(105.8, 0); // within 0.5
  });

  it("the same photo becomes blocked-res at scale 3 (~70.6 DPI)", () => {
    const zoomed = setSlotCrop(withPhoto(), 0, 0, { x: 0.5, y: 0.5, scale: 3 });
    const issue = findIssue(checkCompleteness(zoomed, dims), "spread", 0, 0);
    expect(issue?.kind).toBe("blocked-res");
    expect(issue?.dpi).toBeCloseTo(70.6, 0); // within 0.5
  });
});
