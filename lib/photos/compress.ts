import imageCompression from "browser-image-compression";

export const MAX_PHOTO_BYTES = 500_000;
export const PHOTO_MIME = "image/jpeg";
export const MAX_PHOTOS_PER_CONSULT = 4;

/**
 * Re-encodes the source image to JPEG, downscales it, and ensures the result
 * stays under MAX_PHOTO_BYTES. Re-encoding to JPEG strips EXIF, GPS, and
 * camera-make metadata as a side effect of the new pixel-encoded file.
 */
export async function compressForUpload(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: MAX_PHOTO_BYTES / 1_000_000,
    maxWidthOrHeight: 1600,
    fileType: PHOTO_MIME,
    useWebWorker: true,
    initialQuality: 0.85,
  });

  if (compressed.size > MAX_PHOTO_BYTES) {
    throw new Error(
      `Photo could not be compressed under ${MAX_PHOTO_BYTES} bytes. Try a different photo.`,
    );
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "ear-fit-photo";
  return new File([compressed], `${base}.jpg`, { type: PHOTO_MIME });
}
