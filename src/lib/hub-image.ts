export const HUB_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateHubImage(file: File) {
  if (!EXTENSIONS[file.type]) return "Unsupported image type";
  if (file.size <= 0) return "Image is empty";
  if (file.size > HUB_IMAGE_MAX_BYTES) return "Image must be 8 MB or smaller";
  return null;
}

export function hubImageExtension(file: File) {
  return EXTENSIONS[file.type] ?? "jpg";
}
