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

The prompt check shown while you type runs entirely in your browser and sends nothing. Prompt text is sent to an AI provider only when you ask for a refine (by clicking the badge or pressing Ctrl/Cmd+Shift+Enter), or after each typing pause if you turn on "Refine automatically while typing". It is sent only to the provider you configure in the extension. If you turn on "Fall back to other providers" in settings, it may also be sent to your other configured providers when the active one fails.

## Sites You Turn On

Out of the box, plenz runs only on the supported AI chat websites. On any other site it runs only after you choose "Use plenz on [site]" in the extension popup, which asks Chrome for access to that one site. There, plenz reads only the multi-line text box you click into (never single-line fields such as search or password boxes), and the same rules about when prompt text is sent apply. Choosing "Turn off" removes the access.

## Data Storage

- Preferences may be stored using the browser extension storage APIs.
- Provider configuration and API credentials may be stored locally in the browser extension storage area.
- When Cloud Sync is enabled, provider configuration is stored in Firebase. The `apiKey` field is encrypted in the client before it is written to Firestore, while non-secret fields such as model selection and optional base URL remain readable for sync purposes.
- This Cloud Sync encryption removes plaintext API keys from Firestore records, but it does not add a user passphrase or server-side key management. Browser-local copies remain governed by the browser's storage protections.
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

