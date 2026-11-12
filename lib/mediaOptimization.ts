/**
 * Client-side media optimisation for phone captures.
 *
 * Phone cameras routinely produce 12-48 MP images (5-15 MB each). Uploading
 * those originals makes galleries slow and forces the browser to decode huge
 * bitmaps before it can paint. Everything in this module runs in the browser
 * before the file ever reaches the storage bucket.
 */

export type ImageTargetFormat = "image/webp" | "image/jpeg";

export interface ImageOptimizeOptions {
  /** Longest edge allowed in the output image. */
  maxWidth?: number;
  maxHeight?: number;
  /** Encoder quality between 0 and 1. */
  quality?: number;
  format?: ImageTargetFormat;
}

export interface VideoPosterResult {
  /** Inline WebP/JPEG data URL that can be used as a <video poster>. */
  dataUrl: string;
  width: number;
  height: number;
  duration: number;
}

const DEFAULT_IMAGE_OPTIONS: Required<ImageOptimizeOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.82,
  format: "image/webp",
};

const SKIP_IMAGE_TYPES = new Set(["image/svg+xml", "image/gif"]);

function canUseDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function replaceExtension(name: string, extension: string) {
  const base = name.replace(/\.[^./\\]+$/, "").trim();
  return `${base || "image"}.${extension}`;
}

function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number) {
  if (!width || !height) return { width: maxWidth, height: maxHeight };
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    } catch {
      resolve(null);
    }
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read blob"));
    reader.readAsDataURL(blob);
  });
}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    // `from-image` makes the browser apply the EXIF orientation from phones.
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      try {
        const bitmap = await createImageBitmap(file);
        return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
      } catch {
        // Fall through to the <img> loader below.
      }
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Unable to decode image"));
      element.src = url;
    });
    return { source: image, width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Resize an image to a web-friendly size and re-encode it as WebP.
 * Non-image files (and formats we should not re-encode) are returned untouched.
 */
export async function optimizeImageFile(
  file: File,
  options: ImageOptimizeOptions = {},
): Promise<File> {
  if (!canUseDom() || !file.type.startsWith("image/") || SKIP_IMAGE_TYPES.has(file.type)) {
    return file;
  }

  const { maxWidth, maxHeight, quality, format } = { ...DEFAULT_IMAGE_OPTIONS, ...options };

  try {
    const decoded = await decodeImage(file);
    try {
      const target = fitWithin(decoded.width, decoded.height, maxWidth, maxHeight);
      const canvas = document.createElement("canvas");
      canvas.width = target.width;
      canvas.height = target.height;

      const context = canvas.getContext("2d", { alpha: true });
      if (!context) return file;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(decoded.source, 0, 0, target.width, target.height);

      const mimeType = format === "image/webp" ? "image/webp" : "image/jpeg";
      let blob = await canvasToBlob(canvas, mimeType, quality);
      if (!blob) {
        blob = await canvasToBlob(canvas, "image/jpeg", quality);
      }

      if (!blob) return file;

      // Always keep the downscale; only fall back to the original when the
      // canvas could not actually shrink the image and the re-encode is bigger.
      const wasResized = target.width !== decoded.width || target.height !== decoded.height;
      if (!wasResized && blob.size >= file.size) return file;

      const finalBlobType = blob.type || mimeType;
      const extension = finalBlobType.includes("webp") ? "webp" : "jpg";
      return new File([blob], replaceExtension(file.name, extension), {
        type: finalBlobType,
        lastModified: Date.now(),
      });
    } finally {
      decoded.close?.();
    }
  } catch {
    // If the browser cannot decode the file, upload the original rather than
    // blocking the broker from publishing the listing.
    return file;
  }
}

/** Optimise images, pass videos through unchanged. */
export async function optimizeMediaFile(file: File, options: ImageOptimizeOptions = {}): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  return optimizeImageFile(file, options);
}

function waitForMediaEvent(target: HTMLMediaElement, event: string, timeoutMs = 10000) {
  return new Promise<void>((resolve, reject) => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const cleanup = () => {
      target.removeEventListener(event, onEvent);
      target.removeEventListener("error", onError);
      clearTimeout(timer);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Video failed while waiting for ${event}`));
    };
    target.addEventListener(event, onEvent, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}

/**
 * Extract a poster frame from a video in the browser. This lets us show a real
 * thumbnail immediately (and set <video poster>) instead of letting the layout
 * wait on heavy video metadata / first frames.
 */
export async function createVideoPoster(
  file: File,
  options: { maxWidth?: number; quality?: number } = {},
): Promise<VideoPosterResult | null> {
  if (!canUseDom() || !file.type.startsWith("video/")) return null;

  const { maxWidth = 1280, quality = 0.8 } = options;
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";
  video.src = objectUrl;

  try {
    await waitForMediaEvent(video, "loadedmetadata");
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const seekTo = duration > 0 ? Math.min(duration * 0.1, 1) : 0;

    if (seekTo > 0) {
      video.currentTime = seekTo;
      await waitForMediaEvent(video, "seeked");
    } else if (video.readyState < 2) {
      await waitForMediaEvent(video, "loadeddata");
    }

    const sourceWidth = video.videoWidth || 1280;
    const sourceHeight = video.videoHeight || 720;
    const target = fitWithin(sourceWidth, sourceHeight, maxWidth, maxWidth);

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return null;

    context.drawImage(video, 0, 0, target.width, target.height);

    const blob =
      (await canvasToBlob(canvas, "image/webp", quality)) ||
      (await canvasToBlob(canvas, "image/jpeg", quality));
    if (!blob) return null;

    return {
      dataUrl: await blobToDataUrl(blob),
      width: target.width,
      height: target.height,
      duration,
    };
  } catch {
    return null;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}
