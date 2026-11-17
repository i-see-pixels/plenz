# plenz Privacy Policy

Last updated: November 17, 2026

## Overview

plenz is a browser extension that helps users improve prompts on supported AI chat websites by analyzing prompt text and suggesting refinements in real time.

## Information We Collect

plenz may collect and process the following information:

- Google account profile information if you choose to sign in with Google, including your name, email address, Google account ID, and profile image.
- API credentials and model configuration that you enter in the extension settings, such as provider API keys, selected model, and optional custom base URL.
- Prompt text that you type into supported AI chat websites, or into a text box on another site you turned plenz on for, when using the extension's prompt analysis feature.
- Basic extension preferences, such as active model and UI settings.
- Context cards you write in the settings page (for example a note about you or your project).

## How We Use Information

We use this information only to provide the extension's functionality, including:

- authenticating your optional Google sign-in
- displaying your signed-in account status
- saving your provider settings and preferences
- sending your prompt text to the AI provider you selected in order to generate refinement suggestions
- returning prompt suggestions inside the extension UI

## Third-Party Services

plenz may send data to third-party services only when required for the feature you choose to use:

- Google APIs for optional sign-in and profile retrieval
- AI provider APIs selected by you, such as OpenAI, Google, Anthropic, Mistral, Groq, OpenRouter, or a self-hosted/local endpoint if configured by you

If you use Chrome's on-device model (Gemini Nano), either by choosing it or because no other provider is set up, refines run inside your browser and prompt text is not sent to any provider. Chrome downloads that model itself, only when you click "Download model" in settings.

The prompt check shown while you type runs entirely in your browser and sends nothing. Prompt text is sent to an AI provider only when you ask for a refine (by clicking the badge or pressing Ctrl/Cmd+Shift+Enter), or after each typing pause if you turn on "Refine automatically while typing". It is sent only to the provider you configure in the extension. If you turn on "Fall back to other providers" in settings, it may also be sent to your other configured providers when the active one fails.

## Sites You Turn On

Out of the box, plenz runs only on the supported AI chat websites. On any other site it runs only after you choose "Use plenz on [site]" in the extension popup, which asks Chrome for access to that one site. There, plenz reads only the multi-line text box you click into (never single-line fields such as search or password boxes), and the same rules about when prompt text is sent apply. Choosing "Turn off" removes the access.

## Data Storage

- Preferences may be stored using the browser extension storage APIs.
- Provider configuration and API credentials may be stored locally in the browser extension storage area.
- When Cloud Sync is enabled, provider configuration is stored in Firebase. API keys are encrypted end to end before they leave your browser: a random key encrypts them, and that key is itself encrypted with a passphrase only you know (PBKDF2-SHA-256, 600,000 iterations). Firebase stores only the encrypted keys and the encrypted key, never your passphrase, so neither plenz nor Firebase can read your API keys. Non-secret fields such as model selection and optional base URL remain readable for sync purposes.
- Your sync passphrase cannot be recovered. If you forget it, the synced keys can only be deleted and entered again.
- Once you unlock Cloud Sync on a device, that device keeps the decryption key in the extension's local storage (the same place API keys are kept when sync is off) until you lock it or sign out. Browser-local copies remain governed by the browser's storage protections.
- Keys synced by older versions, which were encrypted with a key derived from your account ID, are re-encrypted with your passphrase when you set it up or unlock Cloud Sync.
- When you type `/` in a chat box, the extension's own script on that page asks the extension for your saved prompts (if you are signed in) and the public gallery's trending prompts, to list them in the menu. The list is shown in plenz's own overlay, and nothing is added to the page's chat box unless you pick it.
- Context cards are stored only in this browser's local extension storage and are never synced. A card's text is added to your draft only when you click it in the refine panel; from then on it is part of the prompt like anything else you typed.
- plenz does not require a central plenz backend to process prompt analysis.

## Data Sharing and Sale

We do not sell personal information.

We do not use or transfer user data for purposes unrelated to the extension's single purpose of providing prompt refinement functionality.

We do not use or transfer user data to determine creditworthiness or for lending purposes.

## Data Retention

Data stored locally by the extension remains available until you remove it, change it, or uninstall the extension. Data sent to third-party AI providers or Google is subject to those providers' policies.

## Security

We take reasonable steps to limit access and permissions to only what is needed for the extension to function. However, no method of electronic storage or transmission is completely secure.

## Your Choices

You can:

- choose whether to sign in with Google
- choose which AI provider to use
- remove or change saved settings and API credentials
- uninstall the extension at any time

## Children's Privacy

plenz is not intended for children under 13, and we do not knowingly collect personal information from children.

## Changes to This Policy

We may update this Privacy Policy from time to time. Updates will be posted in this file with a revised "Last updated" date.

## Contact

For privacy questions, contact: siddhant06137@gmail.com

