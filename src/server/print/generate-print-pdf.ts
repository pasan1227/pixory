// ---------------------------------------------------------------------------
// Print pipeline stub — v1 produces print files manually; this is the
// contained seam where automation lands later.
//
// Design notes for the real implementation:
// - Input: the ORDER's snapshotted BookDocument (never the live book) parsed
//   via migrateBookDocument, plus PRINT_SPECS[format].
// - Output: one PDF per order — cover (wrap: back + spine + front when page
//   count > spineTextMinPages) followed by interior spreads in page order.
// - Resolution: rasterize photo placements at 300 DPI using the ORIGINAL
//   uploads (Photo.originalKey via StorageAdapter.read), with visibleRect()
//   from src/lib/crop.ts deciding the exact source region — identical math
//   to the on-screen renderer, so what the customer saw is what prints.
// - Geometry: page trim from PRINT_SPECS, 3mm bleed on all outer edges
//   (full-bleed slots extend into bleed; framed slots do not), no slot may
//   shift relative to its normalized rect.
// - Color: export sRGB; the print house performs CMYK conversion with their
//   ICC profile. Embed fonts (the four curated families) subset.
// - Likely tooling: pdf-lib or a headless-Chromium render of the existing
//   SpreadRenderer at print scale; decide when this ships.
// ---------------------------------------------------------------------------

export interface PrintPdfResult {
  // Storage key of the generated PDF.
  key: string;
  pageCount: number;
}

export async function generatePrintPdf(orderId: string): Promise<PrintPdfResult> {
  throw new Error(
    `generatePrintPdf not implemented (order ${orderId}) — v1 print files are produced manually`,
  );
}
