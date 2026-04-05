# Design Planning Document — plenz

| Field | Details |
| --- | --- |
| **Title/Initiative** | **plenz** — Open-Source AI Prompt Refinement Browser Extension |
| **Date & Version** | February 7, 2026 · v1.0 |
| **Parent Document** | plenz PRD v1.0 (Feb 7, 2026) |
| **Design POC** | *(To be assigned)* |
| **Status** | Draft — Pending Design Review |

---

## 1. Design Vision & Principles

plenz lives *inside* the user's existing AI workflow — it must feel like a natural extension of ChatGPT, Claude, Gemini, and every other platform it supports, not like a foreign overlay competing for attention. The design vision is:

> **"Invisible until useful, obvious when needed."**

### Core Design Principles

| # | Principle | What It Means in Practice |
| --- | --- | --- |
| 1 | **Non-intrusive by default** | Suggestions never block the input field, auto-dismiss if ignored, and never prevent the user from submitting a prompt. |
| 2 | **One-action interaction** | The most common action (accept a suggestion) requires exactly one keystroke (`Tab`). Dismiss is one keystroke (`Esc`). |
| 3 | **Platform-native feel** | The overlay adapts its border radius, shadow depth, and font stack to match the host AI platform (ChatGPT's rounded cards, Claude's clean lines, etc.). |
| 4 | **Progressive disclosure** | Show the *what* (suggested prompt) first; reveal the *why* (rationale) only on hover or expand. Don't overwhelm casual users with analysis details. |
| 5 | **Accessibility-first** | All interactive elements are keyboard-navigable, screen-reader compatible (ARIA labels), and meet WCAG 2.1 AA contrast standards. |
| 6 | **Privacy is visible** | Wherever the user configures sensitive data (API keys), the UI reinforces trust — lock icons, "stored locally only" microcopy, masked inputs by default. |
| 7 | **Zero learning curve** | A first-time user should understand what plenz does and how to accept a suggestion within 5 seconds of seeing it, without reading documentation. |

---

## 2. User Personas & Design Implications

Each persona from the PRD maps to specific design requirements:

| Persona | Key Behavior | Design Implication |
| --- | --- | --- |
| **The Casual Prompter** | Types short, vague prompts; non-technical; easily overwhelmed | Suggestions must be short and scannable; rationale hidden by default; no jargon in UI copy |
| **The Power User** | Keyboard-driven; writes long, complex prompts; values speed | Full keyboard navigation (Tab/Esc/↑↓); compact overlay mode; option to auto-accept high-confidence suggestions |
| **The Privacy-First User** | Suspicious of data collection; checks network traffic | Prominent "🔒 Stored locally" labels on API key fields; no ambiguous "send feedback" buttons; settings page shows exactly where data goes |

---

## 3. Design System & Visual Language

### 3.1 Brand Identity

| Element | Specification |
| --- | --- |
| **Name** | plenz |
| **Logo Concept** | A minimal lens/magnifying glass icon with a subtle lightning bolt accent — symbolizing clarity + speed |
| **Logo Variants** | Full color (popup/settings), monochrome (toolbar icon), inverted (dark backgrounds) |
| **Toolbar Icon** | 16×16, 32×32, 48×48, 128×128 px — clean silhouette, recognizable at small sizes |
| **Tagline** | "Refine your AI prompts in real time." |

### 3.2 Color Palette

plenz uses a **neutral base** palette so the overlay blends with any host platform, plus a small set of **semantic accent colors** for interactive elements.

| Token | Light Mode | Dark Mode | Usage |
| --- | --- | --- | --- |
| `--pl-bg-primary` | `#FFFFFF` | `#1E1E2E` | Overlay background, popup background |
| `--pl-bg-secondary` | `#F5F5F7` | `#2A2A3C` | Card backgrounds, settings sections |
| `--pl-bg-hover` | `#EEEEF0` | `#35354A` | Hovered suggestion row |
| `--pl-text-primary` | `#1A1A2E` | `#E4E4EC` | Body text, headings |
| `--pl-text-secondary` | `#6B6B80` | `#9898AC` | Rationale text, placeholder text, labels |
| `--pl-accent` | `#4F6BF6` | `#6B83FF` | Primary CTA buttons, active suggestion highlight, links |
| `--pl-accent-hover` | `#3D56D4` | `#8A9CFF` | Button hover state |
| `--pl-success` | `#22C55E` | `#34D399` | Connection test pass, accepted suggestion flash |
| `--pl-warning` | `#F59E0B` | `#FBBF24` | Low-confidence suggestion badge |
| `--pl-error` | `#EF4444` | `#F87171` | Connection test fail, API error messages |
| `--pl-border` | `#E2E2EA` | `#3A3A4E` | Card borders, input field borders |
| `--pl-shadow` | `0 4px 12px rgba(0,0,0,0.08)` | `0 4px 12px rgba(0,0,0,0.32)` | Overlay drop shadow |

**Theme detection:** The overlay automatically detects the host page's `prefers-color-scheme` or the AI platform's active theme (many platforms have their own dark mode toggle) and switches accordingly.

### 3.3 Typography

| Element | Font Stack | Size | Weight |
| --- | --- | --- | --- |
| Overlay heading | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | 13px | 600 (Semi-bold) |
| Suggestion text | Same system stack | 14px | 400 (Regular) |
| Rationale text | Same system stack | 12px | 400 (Regular) |
| Keyboard shortcut badges | `"SF Mono", "Cascadia Code", "Fira Code", monospace` | 11px | 500 (Medium) |
| Popup/Settings headings | Same system stack | 16px | 600 |
| Popup/Settings body | Same system stack | 14px | 400 |

**System font stack** is used intentionally — no custom font downloads means zero network overhead and instant visual consistency with the user's OS.

### 3.4 Iconography

| Icon | Usage | Style |
| --- | --- | --- |
| ⚡ Lightning bolt | Suggestion badge, "improvements available" indicator | Phosphor Icons (MIT licensed), weight: regular |
| 💡 Light bulb | Rationale/explanation reveal | Same icon set |
| 🔒 Lock | API key fields, "stored locally" badges | Same icon set |
| ✅ Checkmark | Connection test success, accepted suggestion | Same icon set |
| ⚙️ Gear | Settings link in popup | Same icon set |
| 🔄 Arrows | Model switch toggle | Same icon set |
| ✕ Close | Dismiss overlay, close popup sections | Same icon set |

**Icon set:** Phosphor Icons — MIT licensed, consistent weight/style, large glyph coverage, optimized SVGs (tree-shakeable).

### 3.5 Spacing & Layout Tokens

| Token | Value | Usage |
| --- | --- | --- |
| `--pl-space-xs` | 4px | Inner padding of shortcut badges |
| `--pl-space-sm` | 8px | Gap between icon and label |
| `--pl-space-md` | 12px | Card inner padding |
| `--pl-space-lg` | 16px | Section spacing in popup/settings |
| `--pl-space-xl` | 24px | Section spacing in options page |
| `--pl-radius-sm` | 6px | Input fields, small buttons |
| `--pl-radius-md` | 10px | Cards, overlay container |
| `--pl-radius-lg` | 14px | Popup window, settings panels |
| `--pl-radius-full` | 9999px | Pill badges, shortcut key indicators |

---

## 4. Screen-by-Screen Design Specifications

### 4.1 Extension Popup — Signed Out (Onboarding)

**Dimensions:** 320px wide × auto height (max 500px)

```
┌─────────────────────────────────┐
│                                 │
│         [🔍 Logo/Icon]          │
│         plenz              │
│                                 │
│    Refine your AI prompts       │
│    in real time.                │
│                                 │
│  ┌─────────────────────────┐    │
│  │ [G] Sign in with Google │    │  ← Google brand button (full brand guidelines)
│  └─────────────────────────┘    │
│                                 │
│    or  [Skip for now →]         │  ← Text link; allows full use without sign-in
│                                 │
│  ─────────────────────────────  │
│  Free & Open Source · v1.0      │
│  ⭐ Star on GitHub              │  ← Links to GitHub repo
│                                 │
└─────────────────────────────────┘
```

**Design notes:**
- Google Sign-In button follows [Google's brand guidelines](https://developers.google.com/identity/branding-guidelines) — specific font, padding, logo, and color.
- "Skip for now" is de-emphasized (secondary text link) — sign-in is optional per PRD (US-06, US-08).
- Popup opens immediately on install (first-run trigger) to guide onboarding.
- GitHub star CTA is subtle — lowercase, no box, just a text link with a ⭐ icon.

### 4.2 Extension Popup — Signed In (Home State)

```
┌─────────────────────────────────┐
│  [Avatar] Jane D.    [⚙️]      │  ← Profile pic + name; gear → settings
│  ─────────────────────────────  │
│                                 │
│  Active Model                   │
│  ┌─────────────────────────┐    │
│  │  ◉ GPT-4o Mini          │    │  ← Radio-style selection
│  │  ○ Claude 3.5 Sonnet    │    │  ← Tap to switch instantly
│  │  ○ Gemini 1.5 Flash     │    │
│  │  [+ Add Model]          │    │  ← Opens settings/model config
│  └─────────────────────────┘    │
│                                 │
│  Today's Stats                  │
│  ┌─────────────────────────┐    │
│  │  ⚡ 7 suggestions shown  │    │
│  │  ✅ 4 accepted (57%)     │    │
│  │  📈 +32% prompt quality  │    │
│  └─────────────────────────┘    │
│                                 │
│  ─────────────────────────────  │
│  [Toggle: plenz ON/OFF]    │  ← Master enable/disable
│                                 │
└─────────────────────────────────┘
```

**Design notes:**
- Model list shows saved configurations (up to 5 per US-03). Active model has a filled radio indicator.
- Switching models is instant — one click, no confirmation dialog.
- Stats are informational, not gamified — no streaks, no badges, no pressure.
- ON/OFF toggle at the bottom lets users temporarily disable the extension without uninstalling.
- Total popup height stays under 400px; list scrolls if the user has 5 models.

### 4.3 Options Page — Model Configuration

**Opens in:** Full browser tab (via `chrome.runtime.openOptionsPage()`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  plenz Settings                                            [v1.0]  │
│                                                                         │
│  ┌─────────────────┐  ┌───────────────────────────────────────────────┐ │
│  │ Sidebar Nav      │  │                                               │ │
│  │                  │  │  MODEL CONFIGURATION                          │ │
│  │  ▸ Models        │  │                                               │ │
│  │    Preferences   │  │  Model Provider                               │ │
│  │    Privacy       │  │  ┌─────────────────────────────────────┐      │ │
│  │    Analytics     │  │  │ OpenAI                          ▾   │      │ │
│  │    About         │  │  └─────────────────────────────────────┘      │ │
│  │                  │  │                                               │ │
│  │                  │  │  Model                                        │ │
│  │                  │  │  ┌─────────────────────────────────────┐      │ │
│  │                  │  │  │ GPT-4o Mini                     ▾   │      │ │
│  │                  │  │  └─────────────────────────────────────┘      │ │
│  │                  │  │                                               │ │
│  │                  │  │  API Key                                      │ │
│  │                  │  │  ┌─────────────────────────────────────┐      │ │
│  │                  │  │  │ ••••••••••••••sk-xyz   [👁] [📋]  │      │ │
│  │                  │  │  └─────────────────────────────────────┘      │ │
│  │                  │  │  🔒 Stored locally on this device only.       │ │
│  │                  │  │     Never sent to plenz servers.         │ │
│  │                  │  │                                               │ │
│  │                  │  │  ┌──────────────────┐  ┌──────────────┐      │ │
│  │                  │  │  │ Test Connection   │  │    Save      │      │ │
│  │                  │  │  └──────────────────┘  └──────────────┘      │ │
│  │                  │  │                                               │ │
│  │                  │  │  ✅ Connected · Latency: 230 ms               │ │
│  │                  │  │                                               │ │
│  │                  │  │  ─────────────────────────────────────────    │ │
│  │                  │  │                                               │ │
│  │                  │  │  SAVED MODELS                                 │ │
│  │                  │  │                                               │ │
│  │                  │  │  ┌─────────────────────────────────────────┐  │ │
│  │                  │  │  │ ◉ GPT-4o Mini (OpenAI)     [✏️] [🗑]  │  │ │
│  │                  │  │  │ ○ Claude 3.5 Sonnet        [✏️] [🗑]  │  │ │
│  │                  │  │  │ ○ Gemini 1.5 Flash         [✏️] [🗑]  │  │ │
│  │                  │  │  └─────────────────────────────────────────┘  │ │
│  │                  │  │                                               │ │
│  └─────────────────┘  └───────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

**Design notes:**
- Sidebar navigation keeps the page uncluttered as settings grow post-v1.
- API key field is **masked by default**. The eye icon (👁) reveals the key only while pressed/held — not toggled. The clipboard icon (📋) copies the key.
- The "🔒 Stored locally" message appears directly under the key input — not buried in a FAQ. This is critical for the Privacy-First persona.
- "Test Connection" is a **secondary button** (outline style); "Save" is **primary** (filled accent color). Test must succeed before Save is enabled.
- Connection result shows a green checkmark + latency on success, or a red error with the provider's exact error message on failure.
- Saved models list shows the active model (filled radio), with inline edit/delete actions.
- The dropdown for Model Provider dynamically shows available models for that provider.
- "Custom / Self-hosted" option reveals an extra "Base URL" input field.

### 4.4 Options Page — Preferences

```
┌────────────────────────────────────────────────────────────────┐
│  PREFERENCES                                                   │
│                                                                │
│  Suggestion Behavior                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Debounce delay        [====●========]  500 ms           │  │  ← Slider: 300–1000 ms
│  │  Min prompt length     [==●==========]  5 chars          │  │  ← Slider: 3–20 chars
│  │  Max suggestions       [========●====]  3                │  │  ← Slider: 1–5
│  │  Auto-dismiss after    [=====●=======]  10 s             │  │  ← Slider: 5–30 s
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Display                                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Theme            [Auto ▾]  (matches AI platform)        │  │
│  │  Suggestion style [Popover ▾]  (Popover / Ghost text)    │  │
│  │  Show rationale   [Toggle: ON ]                          │  │
│  │  Show quality score [Toggle: OFF]                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Keyboard Shortcuts                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Accept suggestion    [Tab]        (not customizable)    │  │
│  │  Dismiss suggestion   [Esc]        (not customizable)    │  │
│  │  Navigate up/down     [↑] [↓]     (not customizable)    │  │
│  │  Trigger manually     [Ctrl+Shift+L]  [Change]          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Platforms                                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ☑ ChatGPT    ☑ Claude    ☑ Gemini    ☑ Perplexity     │  │
│  │  ☑ Copilot    ☑ DeepSeek  ☑ Grok     ☐ Custom sites    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Design notes:**
- Sliders with visible numeric values let power users fine-tune behavior without typing.
- "Ghost text" suggestion style renders the suggestion as greyed-out inline text (like GitHub Copilot). "Popover" is the default, floating card style.
- Platform checkboxes let users disable plenz on specific platforms (e.g., if it conflicts with a platform's native prompt feature).
- Manual trigger shortcut (`Ctrl+Shift+L`) allows users to invoke analysis on demand, even on unsupported platforms via the context menu.

### 4.5 Options Page — Privacy & Analytics

```
┌────────────────────────────────────────────────────────────────┐
│  PRIVACY & DATA                                                │
│                                                                │
│  Your Data                                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  🔒 API keys are stored locally on this device only.     │  │
│  │     They are NEVER sent to plenz servers.           │  │
│  │                                                          │  │
│  │  🔒 Your prompts are sent ONLY to your chosen LLM       │  │
│  │     provider (e.g., OpenAI). plenz has no server    │  │
│  │     and cannot access your prompts.                      │  │
│  │                                                          │  │
│  │  [View network activity log →]                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Cross-Device Sync (requires Google Sign-In)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Sync preferences        [Toggle: ON ]                   │  │
│  │  Sync suggestion history  [Toggle: OFF]                  │  │
│  │                                                          │  │
│  │  ℹ️ Only non-sensitive preferences (theme, debounce      │  │
│  │  settings) are synced. API keys and prompts are NEVER    │  │
│  │  synced.                                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Anonymous Analytics (Opt-In)                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Help improve plenz by sharing anonymous usage       │  │
│  │  data (e.g., suggestion acceptance rate, platforms used). │  │
│  │                                                          │  │
│  │  [Toggle: OFF]  ← Off by default                         │  │
│  │                                                          │  │
│  │  ℹ️ We use Umami (self-hosted, GDPR-compliant).          │  │
│  │  No personal data, prompts, or API keys are ever         │  │
│  │  collected. [View privacy policy →]                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Data Management                                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  [Export my data]   [Clear all local data]               │  │
│  │                                                          │  │
│  │  ⚠️ "Clear all" removes API keys, preferences, and      │  │
│  │  suggestion history from this device. This cannot be     │  │
│  │  undone.                                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Design notes:**
- This is the most trust-critical page. Every statement about privacy is specific and verifiable (not vague "we care about your privacy" copy).
- "View network activity log" opens a panel showing the last 50 outbound requests the extension made — full transparency.
- Analytics toggle is OFF by default — respects privacy by default, asks users to opt in.
- "Export my data" generates a JSON file of all locally stored data. "Clear all" has a destructive confirmation dialog.

### 4.6 Inline Suggestion Overlay — Popover Mode (Default)

This is the most important and frequently seen UI surface. It appears directly on AI chat pages.

```
    User's prompt input field (e.g., ChatGPT)
    ┌────────────────────────────────────────────────┐
    │  write me an email                              │
    └────────────────────────────────────────────────┘
              │
              ▼
    ┌────────────────────────────────────────────────┐
    │  ⚡ 3 improvements available            [✕]    │  ← Header bar; ✕ = dismiss all
    │  ──────────────────────────────────────────     │
    │                                                 │
    │  ▸ "Write a professional email to my manager    │  ← Full rewrite suggestion
    │    requesting PTO for March 10-14. Use a        │     (highlighted/selected)
    │    polite, concise tone. Include subject line."  │
    │                                                 │
    │    💡 Added: role, dates, tone, format           │  ← Rationale (collapsed by default;
    │       constraints                                │     shown if "Show rationale" is ON)
    │                                                 │
    │  ──────────────────────────────────────────     │
    │                                                 │
    │    "Specify who the email is for and the         │  ← Alternative suggestion (dimmed)
    │     purpose: [recipient] [topic]"               │
    │                                                 │
    │  ──────────────────────────────────────────     │
    │                                                 │
    │  [Tab] Accept  [↑↓] Navigate  [Esc] Dismiss    │  ← Keyboard hints footer
    │                                                 │
    └────────────────────────────────────────────────┘
```

**Design specifications:**
- **Width:** Matches the width of the input field (min 300px, max 600px).
- **Position:** Anchored above or below the input field, whichever has more viewport space. Uses `position: absolute` relative to the input container.
- **Shadow:** `--pl-shadow` token for subtle elevation.
- **Border:** 1px `--pl-border` with `--pl-radius-md` (10px).
- **Animation:** Fade-in (150ms ease-out) + slight upward slide (4px). Fade-out on dismiss (100ms).
- **Z-index:** Rendered inside Shadow DOM so z-index is isolated from the host page. Internal z-index: 9999.
- **Keyboard behavior:**
  - `Tab` → Accepts the currently highlighted suggestion, injects it into the input field, and closes the overlay.
  - `Esc` → Closes the overlay without accepting anything.
  - `↑` / `↓` → Moves highlight between suggestions.
  - Typing resumes → Overlay auto-dismisses after 500ms of new input.
- **Click behavior:** Clicking a suggestion accepts it. Clicking outside the overlay dismisses it.
- **Responsive:** If the viewport is narrow (e.g., mobile web view), the overlay becomes a bottom sheet (full-width, slides up from bottom).

### 4.7 Inline Suggestion Overlay — Ghost Text Mode (Alternative)

For power users who prefer a lighter touch (configurable in Preferences).

```
    ┌────────────────────────────────────────────────┐
    │  write me an email                              │
    │  ░░Write░a░professional░email░to░my░manager░░░  │  ← Ghost text appended, greyed out
    │  ░░requesting░PTO░for░March░10-14.░Use░a░░░░░░  │
    │  ░░polite,░concise░tone.░Include░subject░line.  │
    │                                    [Tab ↵]      │  ← Small hint badge
    └────────────────────────────────────────────────┘
```

**Design specifications:**
- Ghost text appears in the same input field, styled with `opacity: 0.4` and `color: --pl-text-secondary`.
- `Tab` accepts (replaces the original text). Any other key continues normal typing and the ghost text fades out.
- Only the top suggestion is shown in ghost mode (no navigation between alternatives).
- A small `[Tab ↵]` badge floats at the end of the ghost text as a visual cue.

### 4.8 Suggestion Badge (Minimized State)

Before the full overlay appears, a compact badge indicator shows that suggestions are available. This prevents the overlay from appearing too aggressively.

```
    ┌────────────────────────────────────────────────┐
    │  write me an email                        ⚡ 3  │  ← Badge: lightning + count
    └────────────────────────────────────────────────┘
```

**Interaction flow:**
1. User pauses typing → Analysis runs → Badge appears (⚡ + suggestion count).
2. User hovers over badge OR presses `Ctrl+Shift+L` → Full overlay expands.
3. Alternatively, if the user has set "auto-expand" in preferences, the overlay opens directly.

**Badge specifications:**
- Size: 28px × 20px pill shape.
- Background: `--pl-accent` at 10% opacity. Text: `--pl-accent`.
- Position: Inline, right-aligned inside the input field (or floating at the top-right corner of the input container).
- Animation: Gentle scale-in (100ms ease-out) from 0.8 → 1.0.

### 4.9 Loading / Thinking State

While the analysis request is in-flight:

```
    ┌────────────────────────────────────────────────┐
    │  write me an email                     [◌ ···] │  ← Animated spinner + dots
    └────────────────────────────────────────────────┘
```

- A small animated spinner (12px) replaces the badge position.
- No text — just the spinner. Keeps the UI clean during the 500ms–1s wait.
- If the request takes longer than 3 seconds, show "Analyzing..." text next to the spinner.

### 4.10 Error States

**No API key configured:**
```
    ┌────────────────────────────────────────────────────┐
    │  🔑 Add your API key to enable suggestions.        │
    │  [Open Settings →]                                  │
    └────────────────────────────────────────────────────┘
```

**Invalid API key:**
```
    ┌────────────────────────────────────────────────────┐
    │  ⚠️ OpenAI: Invalid API key.                        │
    │  [Open Settings →]                                  │
    └────────────────────────────────────────────────────┘
```

**Rate limited:**
```
    ┌────────────────────────────────────────────────────┐
    │  ⏳ Rate limited. Will retry in 15s.                │
    └────────────────────────────────────────────────────┘
```

**Design notes:**
- Error overlays use `--pl-error` background at 5% opacity + `--pl-error` text.
- Warning overlays use `--pl-warning` background at 5% opacity.
- All error messages are **actionable** — they either link to Settings or tell the user what will happen next.
- Errors auto-dismiss after 8 seconds to avoid cluttering the interface.

### 4.11 Empty / Single-Word Prompt State

When the user types something too short to refine meaningfully (< 5 chars or a single word):

```
    ┌────────────────────────────────────────────────────┐
    │  💡 Try being more specific:                        │
    │                                                     │
    │  "Write a [type] about [topic] for [audience]       │
    │   in [tone] tone. Keep it under [length]."          │
    │                                                     │
    │  [Tab] Use template  [Esc] Dismiss                  │
    └────────────────────────────────────────────────────┘
```

This shows a starter template instead of a refinement — different visual treatment (dashed border instead of solid) to signal it's a template, not a suggestion.

---

## 5. Interaction Design & Micro-interactions

### 5.1 Animation Specifications

| Element | Trigger | Animation | Duration | Easing |
| --- | --- | --- | --- | --- |
| Suggestion overlay appear | Suggestions ready | Fade in + slide up 4px | 150ms | ease-out |
| Suggestion overlay dismiss | Esc / click outside | Fade out | 100ms | ease-in |
| Badge appear | Analysis complete | Scale in (0.8→1.0) | 100ms | ease-out |
| Suggestion highlight move | ↑/↓ keys | Background color transition | 80ms | linear |
| Accept flash | Tab pressed | Brief green flash (`--pl-success` at 15% opacity) on the input field | 300ms | ease-out |
| Error shake | Invalid key test | Horizontal shake (±4px, 3 cycles) on the input field | 400ms | ease-in-out |
| Connection test spinner | Test button clicked | Rotating circle | Continuous | linear |
| Toggle switch | Click | Slide knob + color transition | 200ms | spring |

### 5.2 Keyboard Interaction Map

| Context | Key | Action |
| --- | --- | --- |
| Overlay visible | `Tab` | Accept highlighted suggestion; inject into input; close overlay |
| Overlay visible | `Esc` | Dismiss overlay; return focus to input |
| Overlay visible | `↑` | Move highlight to previous suggestion |
| Overlay visible | `↓` | Move highlight to next suggestion |
| Overlay visible | `Enter` | Does NOT accept (Enter submits the prompt on most platforms) |
| Any page | `Ctrl+Shift+L` | Manually trigger plenz analysis on the focused input |
| Ghost text visible | `Tab` | Accept ghost text replacement |
| Ghost text visible | Any other key | Dismiss ghost text; continue typing normally |

**Critical:** `Enter` is intentionally not mapped to "accept" because pressing Enter on ChatGPT/Claude submits the prompt. Overriding Enter would break the user's muscle memory and could cause accidental submissions. `Tab` is chosen because it's universally understood as "autocomplete" (familiar from IDE tab-complete).

---

## 6. Responsive & Adaptive Design

### 6.1 Popup Responsive Rules

| Viewport | Popup Width | Layout Changes |
| --- | --- | --- |
| Standard desktop | 320px (fixed) | Default layout |
| High DPI (2x+) | 320px | All icons use @2x assets; text remains same size |

### 6.2 Options Page Responsive Rules

| Viewport Width | Layout |
| --- | --- |
| ≥ 900px | Sidebar (200px) + Content area (fluid) |
| 600–899px | Sidebar collapses to top tabs |
| < 600px | Single column stack; tabs become a dropdown |

### 6.3 Overlay Adaptive Positioning

| Scenario | Overlay Position |
| --- | --- |
| Space above input > 250px | Anchor **above** input (preferred — doesn't push page content) |
| Space below input > 250px (no space above) | Anchor **below** input |
| Neither has 250px | Anchor below, allow scroll overflow |
| Mobile viewport (< 480px width) | Full-width **bottom sheet** sliding up from screen bottom |
| Input near right edge of viewport | Overlay aligns to right edge instead of left |

---

## 7. Accessibility (a11y) Requirements

### WCAG 2.1 AA Compliance

| Requirement | Implementation |
| --- | --- |
| **Color contrast** | All text meets 4.5:1 ratio (normal text) or 3:1 (large text) against backgrounds. Verified via Figma a11y plugin |
| **Focus indicators** | All interactive elements have a visible 2px `--pl-accent` outline on `:focus-visible` |
| **Keyboard navigation** | Complete overlay interaction via Tab/Esc/↑↓ without mouse |
| **Screen reader support** | Overlay announced via `role="dialog"` + `aria-label="plenz suggestions"`. Each suggestion has `role="option"` |
| **Reduced motion** | `prefers-reduced-motion: reduce` → disables all animations; overlay appears/disappears instantly |
| **Focus trap** | When overlay is open, Tab cycles through suggestions (not the host page). Esc releases focus back to input |
| **ARIA live region** | Badge count and status messages use `aria-live="polite"` to announce changes without interrupting |

### Screen Reader Announcements

| Event | Announcement |
| --- | --- |
| Suggestions available | "plenz: 3 prompt improvements available. Press Ctrl+Shift+L to review." |
| Overlay opened | "plenz suggestions dialog. Use arrow keys to navigate, Tab to accept, Escape to dismiss." |
| Suggestion highlighted | "Suggestion 1 of 3: [suggested text]. Rationale: [rationale]." |
| Suggestion accepted | "Suggestion accepted. Prompt updated." |
| Overlay dismissed | "Suggestions dismissed." |
| Error | "plenz error: [error message]." |

---

## 8. Platform-Specific Adaptation

The overlay must look at home on every supported AI platform. Rather than enforcing a single rigid style, plenz adapts subtle visual properties.

| Platform | Background Match | Border Radius | Font Size Adjust | Special Notes |
| --- | --- | --- | --- | --- |
| **ChatGPT** | Slightly warm white / dark gray | 16px (matches ChatGPT cards) | +0px | Input is ProseMirror `contenteditable` — overlay must not conflict with markdown rendering |
| **Claude** | Cool white / deep navy | 12px (sharper corners) | +0px | Claude's input uses ProseMirror — same content injection approach |
| **Gemini** | Material You surfaces | 20px (pill-like, matching Material) | +1px | Input uses Quill editor — custom detection needed |
| **Perplexity** | Clean white / dark | 10px | -1px (Perplexity uses slightly smaller text) | Standard textarea — most straightforward |
| **Copilot** | Fluent design surfaces | 8px (sharper MS style) | +0px | — |

**Implementation:** Each platform config in the registry includes an optional `themeOverrides` object:

```typescript
themeOverrides?: {
  borderRadius?: string;
  fontSizeAdjust?: number;
  bgOverride?: { light: string; dark: string };
}
```

---

## 9. Onboarding Flow Design

### First-Run Experience (3-Step Setup)

**Step 1: Welcome + Sign In**
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│            [🔍 plenz Logo]                      │
│                                                      │
│      Get better AI answers on the first try.         │
│                                                      │
│    plenz suggests improvements to your          │
│    prompts — right inside ChatGPT, Claude,           │
│    Gemini, and more.                                 │
│                                                      │
│    ┌────────────────────────────────────┐             │
│    │   [G] Sign in with Google          │             │
│    └────────────────────────────────────┘             │
│                                                      │
│    [Skip — I'll set up later →]                      │
│                                                      │
│    ●○○  Step 1 of 3                                  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Step 2: Connect Your Model**
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Connect your AI model                               │
│                                                      │
│  plenz uses YOUR API key to analyze prompts.    │
│  Your key never leaves your browser.                 │
│                                                      │
│  Provider    [OpenAI ▾]                              │
│  Model       [GPT-4o Mini ▾]                         │
│  API Key     [••••••••••••    ]                       │
│                                                      │
│  Don't have an API key?                              │
│  [Get one from OpenAI →] [Get one from Anthropic →]  │
│                                                      │
│  [Test Connection]                                   │
│  ✅ Connected · 230 ms                                │
│                                                      │
│  ○●○  Step 2 of 3                   [Next →]         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Step 3: Try It Out**
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  See it in action ✨                                  │
│                                                      │
│  ┌────────────────────────────────────────────┐      │
│  │  Try typing a prompt:                       │      │
│  │  "write me an email"                        │      │
│  │                                             │      │
│  │  ⚡ plenz suggests:                    │      │
│  │  "Write a professional email to my          │      │
│  │   manager requesting PTO. Use a polite,     │      │
│  │   concise tone. Include subject line."      │      │
│  │                                             │      │
│  │  Press [Tab] to accept                      │      │
│  └────────────────────────────────────────────┘      │
│                                                      │
│  This is an interactive demo — try editing the       │
│  prompt above to see suggestions change!             │
│                                                      │
│  ○○●  Step 3 of 3             [Start using →]        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Design notes:**
- The onboarding opens as a **full-tab page** (not a tiny popup) for better readability.
- Step 3 includes a **live interactive demo** — a fake input field where plenz runs an actual analysis using the user's newly configured API key. This "aha moment" teaches the interaction pattern before the user encounters it in the wild.
- "Don't have an API key?" links go directly to the API key pages of each provider (not their homepage).
- Progress indicator uses dot pagination (●○○) — clean, minimal, shows how close to done.
- Users can skip any step — the extension works without sign-in and shows a persistent nudge to add an API key.

---

## 10. Competitor UX Gaps Addressed

| Competitor UX Problem | plenz Design Solution |
| --- | --- |
| **AIPRM** injects a large UI directly into ChatGPT's interface, overwhelming the chat page | plenz uses a compact, floating overlay that doesn't modify the host page's layout |
| **Prompt Perfect** requires clicking a button to trigger analysis | plenz triggers automatically on typing pause; zero additional clicks needed |
| **PromptStorm** opens in a side panel, splitting the user's attention | plenz overlay is anchored directly to the input field — eyes stay in one place |
| **Better Prompt** shows enhancement modes but no rationale | Every suggestion includes a one-line rationale explaining *why* the change improves the prompt |
| **Superpower ChatGPT** has a cluttered interface with many features | plenz does one thing well — prompt refinement — with a minimal, focused UI |
| **Multiple competitors** break keyboard workflow by requiring mouse clicks | Full keyboard-first interaction: Tab/Esc/↑↓; mouse is optional, never required |

---

## 11. Design Deliverables & Timeline

| Deliverable | Description | Target Date |
| --- | --- | --- |
| **Design tokens file** | JSON/CSS custom properties for colors, spacing, typography, shadows | Feb 28, 2026 |
| **Icon and logo set** | Logo (all variants), toolbar icon (all sizes), Phosphor icon subset SVGs | Mar 3, 2026 |
| **Figma component library** | Reusable components: buttons, inputs, cards, overlays, badges, toggles | Mar 7, 2026 |
| **Popup mockups** (signed out, signed in) | High-fidelity Figma frames + all states | Mar 7, 2026 |
| **Options page mockups** (all sections) | High-fidelity Figma frames + all states | Mar 10, 2026 |
| **Inline overlay mockups** (popover, ghost, badge, loading, errors) | High-fidelity Figma frames per platform (ChatGPT, Claude, Gemini, Perplexity) | Mar 10, 2026 |
| **Onboarding flow mockups** (3 steps) | High-fidelity Figma frames + interactive prototype | Mar 12, 2026 |
| **Interaction prototype** | Clickable Figma prototype covering: onboarding → popup → inline overlay lifecycle | Mar 14, 2026 |
| **Prototype user testing** | 10-user test on clickable prototype; usability report with findings | Mar 28, 2026 |
| **Design handoff** | Annotated Figma frames with specs, spacing, tokens; dev-ready exports | Apr 3, 2026 |

---

## 12. User Testing Plan

### 12.1 Prototype Test (Mar 28, 2026)

| Parameter | Detail |
| --- | --- |
| **Participants** | 10 users: 4 casual prompters, 3 power users, 3 privacy-focused users |
| **Method** | Moderated remote sessions (30 min each) via Zoom + Figma prototype |
| **Tasks** | 1. Complete onboarding (sign in + configure model). 2. Type a vague prompt and interact with the suggestion overlay. 3. Accept a suggestion. 4. Dismiss a suggestion. 5. Switch models in the popup. 6. Find and review privacy settings. |
| **Success criteria** | Task completion rate ≥ 90%. Time to first suggestion acceptance ≤ 10 seconds. 0 users confused by the Tab/Esc interaction. |
| **Metrics tracked** | Task completion rate, time-on-task, error rate, SUS score, qualitative feedback |

### 12.2 Beta Usability Check (Jun 22, 2026)

| Parameter | Detail |
| --- | --- |
| **Participants** | 20 beta users (from Chrome Web Store early adopters) |
| **Method** | Unmoderated: in-extension feedback prompt ("How easy was it to use plenz today?") + optional 5-min survey |
| **Metrics** | CSAT score, suggestion acceptance rate, "Report broken page" submissions, free-text feedback |

---

## 13. Design Open Questions

| # | Question | Options | Decision By |
| --- | --- | --- | --- |
| 1 | Should the overlay show a prompt quality score (0-100) to the user? | Yes (gamification risk) vs. No (keep it simple for v1) vs. Optional toggle | Prototype testing |
| 2 | Should the ghost text mode support multi-suggestion navigation? | Yes (complex) vs. No (show only top suggestion in ghost mode) | Before dev (Apr 3) |
| 3 | How to handle dark mode on platforms that use custom themes (not `prefers-color-scheme`)? | Detect via DOM class inspection vs. Let user manually toggle overlay theme | Before dev (Apr 3) |
| 4 | Should the onboarding include an animated video/GIF demo? | Yes (higher engagement, larger bundle) vs. No (live interactive demo is enough) | Prototype testing |
| 5 | Should we add a "Why this suggestion?" expandable section per suggestion, or keep the one-line rationale only? | Expandable detail vs. One-line only for v1 | Prototype testing |

---

## Related Documents

1. **plenz PRD v1.0** — Product requirements, user stories, and wireframes
2. **plenz Tech Planning v1.0** — Architecture, tech stack, and sprint plan
3. Go-to-Market / Community Launch Plan *(to be created)*
4. Figma Design File *(to be created — link will be added here)*

---

*Document Version: 1.0 · Date: February 7, 2026 · Status: Draft — Pending Design Review*

