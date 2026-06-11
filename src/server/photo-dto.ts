import type { PhotoDto } from "@/lib/schemas/photo";
import type { PhotoRecord } from "@/server/repositories/photos";
import { getStorage } from "@/server/storage";

// PhotoRecord → client DTO. Storage keys stay server-side; the client only
// ever sees resolved URLs.
export function toPhotoDto(record: PhotoRecord): PhotoDto {
  return {
    id: record.id,
    previewUrl: getStorage().getUrl(record.previewKey),
    originalUploaded: record.originalUploaded,
    width: record.width,
    height: record.height,
    fileName: record.fileName,
    capturedAt: record.capturedAt ? record.capturedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
  };
}
