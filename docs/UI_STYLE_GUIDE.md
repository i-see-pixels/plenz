# plenz UI Style Guide (TinyFish-Inspired)

This guide defines the baseline visual system for `apps/web` and `apps/extension`.

## Core Direction

- Light-first only. Use `:root` tokens as the single source of truth.
- Flat surfaces only. No glow, blur, glass, or decorative drop shadows.
- Structure by borders. Every major block should be panelized with visible separators.
- Accent usage is sparse. Orange is for active/process/status states. Teal is secondary support.

## Token Contract

Use shared semantic tokens across both frontends:

- Surface and text: `--background`, `--foreground`, `--card`, `--card-foreground`.
- Actions and states: `--primary`, `--primary-foreground`, `--accent-signal`, `--accent-secondary`.
- Supporting UI: `--muted`, `--muted-foreground`, `--border`, `--input`, `--ring`.
- Radius scale: `--radius` with small/medium derived values only.

## Typography Roles

- Headline and body: `font-sans`.
- Metadata labels and operational tags: `font-mono`, uppercase, increased tracking.
- Keep metadata labels short and explicit (e.g., `ACTIVE MODEL`, `SETUP SEQUENCE`).

## Component Defaults

- Primary CTA: solid dark fill with high-contrast text.
- Secondary controls: white background with 1px gray border.
- Status tags: mono uppercase pills with orange border/text.
- Cards and sections: border-defined, no shadow layers.

## Layout Rules

- Use `flex flex-col gap-*` instead of `space-y-*`.
- Prefer row-based settings sections on desktop with label and control columns.
- Preserve responsive readability at extension popup width and mobile web breakpoints.

## Do Not Reintroduce

- `backdrop-blur-*`
- glow gradients and pulse glows
- soft glass cards
- heavy motion patterns for core navigation and call-to-actions

