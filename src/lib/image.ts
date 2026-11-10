const MAX_EDGE = 1600;
const WEBP_QUALITY = 0.82;
const BLUR_PADDING = 24;
const BLUR_RADIUS = 18;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = reject;
    element.src = src;
  });
}

/**
 * Resizes and re-encodes an image to WebP before it is stored, optionally blurring it first.
 * Returns the original file when the browser cannot encode WebP.
 */
export async function optimizeImageFile(file: File, options: { blur?: boolean } = {}) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const padding = options.blur ? BLUR_PADDING : 0;

    const canvas = document.createElement('canvas');
    canvas.width = width + padding * 2;
    canvas.height = height + padding * 2;

    const context = canvas.getContext('2d');
    if (!context) return file;

    if (options.blur) context.filter = `blur(${BLUR_RADIUS}px)`;
    context.drawImage(image, padding, padding, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY));
    if (!blob || blob.type !== 'image/webp') return file;

    const name = file.name.replace(/\.[^.]+$/, '') || 'foto';
    return new File([blob], `${name}.webp`, { type: 'image/webp' });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
