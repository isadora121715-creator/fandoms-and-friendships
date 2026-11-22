import { useSyncExternalStore } from "react";

/**
 * Per-device appearance preferences (theme + wallpaper), kept in localStorage.
 * The theme class is also applied by an inline script in <head> (see __root.tsx)
 * so the page never flashes the wrong theme before React loads.
 */
export type Theme = "dark" | "light";

const THEME_KEY = "lorebox_theme";
const WALLPAPER_KEY = "lorebox_wallpaper";
const EVENT = "lorebox:prefs";

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the choice lasts until the page reloads */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function applyTheme(theme: Theme) {
  const c = document.documentElement.classList;
  c.toggle("dark", theme === "dark");
  c.toggle("light", theme === "light");
}

export function setTheme(theme: Theme) {
  applyTheme(theme);
  write(THEME_KEY, theme);
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribe,
    () => (read(THEME_KEY) === "light" ? "light" : "dark"),
    () => "dark",
  );
}

/**
 * Wallpaper value: a catalog title id (its cover is used), "url:<https link>" for an image
 * from the web, or "photo" for a picture the person uploaded (stored, resized, under PHOTO_KEY).
 */
const PHOTO_KEY = "lorebox_wallpaper_photo";
const STRENGTH_KEY = "lorebox_wallpaper_strength";

export function setWallpaper(value: string | null) {
  write(WALLPAPER_KEY, value);
}

export function useWallpaper(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => read(WALLPAPER_KEY),
    () => null,
  );
}

/** The uploaded wallpaper photo (data URL), if any. */
export function useWallpaperPhoto(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => read(PHOTO_KEY),
    () => null,
  );
}

/** Saves an uploaded photo as the wallpaper. Throws if the browser has no room for it. */
export function setWallpaperPhoto(dataUrl: string) {
  try {
    localStorage.setItem(PHOTO_KEY, dataUrl);
  } catch {
    throw new Error("Imagem grande demais para salvar neste navegador. Tente outra foto.");
  }
  write(WALLPAPER_KEY, "photo");
}

/** How visible the wallpaper is, 0 (barely) to 100 (fully). */
export function setWallpaperStrength(value: number) {
  write(STRENGTH_KEY, String(Math.max(0, Math.min(100, Math.round(value)))));
}

export function useWallpaperStrength(): number {
  const v = useSyncExternalStore(
    subscribe,
    () => read(STRENGTH_KEY),
    () => null,
  );
  const n = Number(v);
  return v !== null && Number.isFinite(n) ? n : 45;
}

/** Shrinks a picked image to at most 1920px and re-encodes it as JPEG (keeps storage small). */
export async function resizeImage(file: File, max = 1920, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Não foi possível abrir essa imagem."));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Inline <head> script: applies the saved theme before first paint. */
export const THEME_BOOT_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="light"){var c=document.documentElement.classList;c.remove("dark");c.add("light")}}catch(e){}`;
