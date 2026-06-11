// Where a requested photo pick will land: a cover photo slot or a spread
// slot. spreadIndex is 0 (and unused) for cover targets so the shape stays
// flat and serializable.
export interface PickTarget {
  view: "cover" | "spread";
  spreadIndex: number;
  slotIndex: number;
}
