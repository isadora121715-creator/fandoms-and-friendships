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

/** Wallpaper = the id of a catalog title whose cover is used as the page background. */
export function setWallpaper(titleId: string | null) {
  write(WALLPAPER_KEY, titleId);
}

export function useWallpaper(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => read(WALLPAPER_KEY),
    () => null,
  );
}

/** Inline <head> script: applies the saved theme before first paint. */
export const THEME_BOOT_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="light"){var c=document.documentElement.classList;c.remove("dark");c.add("light")}}catch(e){}`;
