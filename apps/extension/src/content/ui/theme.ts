// plenz's overlays follow the page they sit on, not the OS setting: a chat
// site can be dark on a light system and the other way round. The page's
// own background behind the chat box is the most reliable signal.

type Rgba = [number, number, number, number];

/** Computed colors are rgb()/rgba() in browsers; hex is accepted too. */
export function parseColor(value: string): Rgba | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join("") : hex[1];
    return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16)).concat(1) as Rgba;
  }
  const match = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)/.exec(value);
  if (!match) return null;
  const alpha = match[4] === undefined
    ? 1
    : match[4].endsWith("%") ? parseFloat(match[4]) / 100 : parseFloat(match[4]);
  return [Number(match[1]), Number(match[2]), Number(match[3]), alpha];
}

/** Relative luminance (WCAG), 0 for black to 1 for white. */
export function luminance([r, g, b]: Rgba) {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Whether the page looks dark around `element`: the first mostly opaque
 * background from it up to the root. With none (a transparent page), the
 * root's color-scheme decides, as the browser's canvas would.
 */
export function isDarkBehind(element: Element): boolean {
  const view = element.ownerDocument.defaultView;
  if (!view) return false;
  for (let node: Element | null = element; node; node = node.parentElement) {
    const color = parseColor(view.getComputedStyle(node).backgroundColor);
    if (color && color[3] >= 0.5) return luminance(color) < 0.2;
  }
  const scheme = view.getComputedStyle(element.ownerDocument.documentElement).colorScheme;
  return /\bdark\b/.test(scheme) && !/\blight\b/.test(scheme)
    ? true
    : /\bdark\b/.test(scheme) && view.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Match an overlay's shadow host to the page behind `anchor`. */
export function followPageTheme(host: HTMLElement, anchor: Element) {
  host.classList.toggle("pl-dark", isDarkBehind(anchor));
}
