import type { ImageAsset } from "./engines/types";

export async function fileToImageAsset(file: File): Promise<ImageAsset> {
  const src = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const { width, height } = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = src;
    },
  );
  return {
    id: Math.random().toString(36).slice(2, 10),
    src,
    width,
    height,
    name: file.name,
  };
}

export async function fileToObjectUrl(file: File): Promise<string> {
  return URL.createObjectURL(file);
}
