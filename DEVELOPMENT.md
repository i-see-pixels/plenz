# PromptLens Development Guide

## Prerequisites

- **Node.js**: v20 or higher
- **pnpm**: v9 or higher
- **Browser**: Google Chrome, Brave, or Edge (Chromium-based)

## 1. Initial Setup

Clone the repository and install dependencies from the root of the monorepo:

```bash
git clone https://github.com/i-see-pixels/promptlens.git
cd promptlens
pnpm install
```

## 2. Running the Extension in Development Mode

We use **Vite** and **CRXJS** for a fast development experience with Hot Module Replacement (HMR).

1.  **Start the dev server**:
    Run the following command from the root directory:

    ```bash
    pnpm --filter extension dev
    ```

    _Alternatively, you can `cd apps/extension` and run `pnpm dev`._

    This command will compile the extension and watch for file changes. It outputs the build artifacts to `apps/extension/dist`.

2.  **Load the extension in Chrome**:
    - Open Chrome and navigate to `chrome://extensions`.
    - Toggle **Developer mode** in the top right corner.
    - Click the **Load unpacked** button in the top left.
    - Navigate to your project folder and select: `apps/extension/dist`.

    > **Note:** Do not select the root `apps/extension` folder; select the `dist` folder inside it.

3.  **Verify installation**:
    - You should see the **PromptLens** card appear in your extensions list.
    - The PromptLens icon should appear in your browser toolbar (you may need to pin it).

## 3. Testing the Extension

### Popup UI

- Click the PromptLens icon in the toolbar.
- You should see the popup interface (Sign In / Status).

### Content Script (Inline Suggestions)

- Navigate to a supported AI platform, for example: ChatGPT.
- Open the browser's Developer Tools (`F12` or `Right Click > Inspect`).
- Go to the **Console** tab to see logs from PromptLens.
- Type a prompt in the chat input (e.g., "write an email").
- _Note: In development mode, you might need to refresh the ChatGPT page after installing the extension for the content script to inject properly._

### Options Page

- Right-click the extension icon and select **Options**, or click the "Settings" gear in the popup.
