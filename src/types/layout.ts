// Layout template shapes. These are static design-time data (src/data/layouts.ts),
// not part of the persisted BookDocument — documents reference layouts by id only.

export type SlotType = "photo" | "text";

// Normalized rect relative to the full spread: x/w as fractions of the
// double-page spread width, y/h as fractions of the page height.
export interface SlotDef {
  x: number;
  y: number;
  w: number;
  h: number;
  type: SlotType;
}

export interface SpreadLayout {
  id: string;
  slots: SlotDef[];
}

// Normalized box relative to the front cover page (not the full wrap).
export interface CoverBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CoverLayout {
  id: string;
  // Photo slot rects; cover.photoSlots aligns with these by index.
  photoSlots: CoverBox[];
  titleBox: CoverBox;
  subtitleBox?: CoverBox;
}
