// Client-side avatar processing: downscale a picked image to a small square data URL.
// Stored directly in Agent.avatarUrl (a TEXT column) and rendered via <img src>.

// Avatars never display larger than ~56px, so 256px covers retina without bloating the row.
const MAX_DIM = 256;

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  // SVG scales losslessly and is already tiny, so keep it verbatim.
  if (file.type === "image/svg+xml") return readAsDataUrl(file);

  const source = await readAsDataUrl(file);
  const img = await loadImage(source);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  if (!side) return source;

  // Center-crop to a square so the rounded avatar never distorts the aspect ratio.
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  const target = Math.min(side, MAX_DIM);

  const canvas = document.createElement("canvas");
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext("2d");
  if (!ctx) return source;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target);

  // toDataURL falls back to PNG automatically when the browser cannot encode WebP.
  return canvas.toDataURL("image/webp", 0.85);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image decode failed"));
    img.src = src;
  });
}
