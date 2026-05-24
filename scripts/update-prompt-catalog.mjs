import { existsSync, readFileSync } from "node:fs";
import { resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";

const ROOT_DIR = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_INPUT_FILE = resolve(
  ROOT_DIR,
  "scripts/prompt-catalog.popular-50.json",
);
const PROMPT_CATALOG_COLLECTION = "prompt_catalog";
const INITIAL_ENV_KEYS = new Set(Object.keys(process.env));

function parseArgs(argv) {
  const args = {
    dryRun: false,
    file: DEFAULT_INPUT_FILE,
    help: false,
    replace: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--help" || value === "-h") {
      args.help = true;
      continue;
    }

    if (value === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (value === "--replace") {
      args.replace = true;
      continue;
    }

    if (value === "--file" || value === "-f") {
      const nextValue = argv[index + 1];

      if (!nextValue) {
        throw new Error("Missing value for --file.");
      }

      args.file = nextValue;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${value}`);
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  pnpm prompt-catalog:update --file ./path/to/prompts.json

Options:
  --file, -f   Path to a JSON file. Defaults to scripts/prompt-catalog.popular-50.json
  --replace    Delete existing prompt_catalog docs that are not present in the JSON file
  --dry-run    Validate and print the planned changes without writing to Firestore
  --help, -h   Show this help message

JSON format:
  [
    {
      "id": "product-launch-announcement",
      "title": "Product Launch Announcement",
      "slug": "product-launch-announcement",
      "prompt": "Write a concise launch announcement...",
      "category": ["Marketing", "Copywriting", "Launch"],
      "trendScore": 92,
      "shareEnabled": true,
      "createdAt": "2026-05-19T08:00:00.000Z",
      "updatedAt": "2026-05-19T08:00:00.000Z"
    }
  ]

Auth:
  The script supports one of these:
  - FIREBASE_SERVICE_ACCOUNT_JSON with a path to a service account JSON file
  - FIREBASE_SERVICE_ACCOUNT_JSON with inline service account JSON
  - FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
  - GOOGLE_APPLICATION_CREDENTIALS already configured in your shell
`);
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const fileContents = readFileSync(filePath, "utf8");
  const lines = fileContents.split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    let value = trimmedLine.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!INITIAL_ENV_KEYS.has(key)) {
      process.env[key] = value;
    }
  }
}

function loadLocalEnv() {
  const envFiles = [
    resolve(ROOT_DIR, ".env"),
    resolve(ROOT_DIR, ".env.local"),
    resolve(ROOT_DIR, "apps/extension/.env"),
    resolve(ROOT_DIR, "apps/extension/.env.local"),
  ];

  for (const envFile of envFiles) {
    loadEnvFile(envFile);
  }
}

function readEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveJsonFilePath(filePath) {
  return isAbsolute(filePath) ? filePath : resolve(ROOT_DIR, filePath);
}

function parseOptionalDate(value, fieldName) {
  if (value == null || value === "") {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`${fieldName} must be a valid date string.`);
  }

  return parsedDate;
}

function normalizeTrendScore(value) {
  if (value == null || value === "") {
    return 0;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error("trendScore must be a finite number.");
  }

  return numericValue;
}

function normalizeCategory(value, fieldName) {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array of strings.`);
  }

  return value
    .filter((entry) => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function normalizePromptEntry(entry, index) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(`Prompt at index ${index} must be an object.`);
  }

  const title = typeof entry.title === "string" ? entry.title.trim() : "";
  const prompt = typeof entry.prompt === "string" ? entry.prompt.trim() : "";
  const rawSlug = typeof entry.slug === "string" ? entry.slug.trim() : "";
  const rawId = typeof entry.id === "string" ? entry.id.trim() : "";

  if (!title) {
    throw new Error(`Prompt at index ${index} is missing a title.`);
  }

  if (!prompt) {
    throw new Error(`Prompt at index ${index} is missing prompt text.`);
  }

  const slug = rawSlug || rawId || slugify(title);
  const id = rawId || slug;

  if (!slug) {
    throw new Error(`Prompt "${title}" could not derive a slug.`);
  }

  if (!id || id.includes("/")) {
    throw new Error(`Prompt "${title}" has an invalid id.`);
  }

  return {
    category: normalizeCategory(entry.category, `category for "${title}"`),
    createdAt: parseOptionalDate(entry.createdAt, `createdAt for "${title}"`),
    id,
    prompt,
    shareEnabled: entry.shareEnabled !== false,
    slug,
    title,
    trendScore: normalizeTrendScore(entry.trendScore),
    updatedAt: parseOptionalDate(entry.updatedAt, `updatedAt for "${title}"`),
  };
}

function loadPromptEntries(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`JSON file not found: ${filePath}`);
  }

  const fileContents = readFileSync(filePath, "utf8");
  const parsedFile = JSON.parse(fileContents);
  const rawPrompts = Array.isArray(parsedFile)
    ? parsedFile
    : Array.isArray(parsedFile?.prompts)
      ? parsedFile.prompts
      : null;

  if (!rawPrompts) {
    throw new Error(
      "JSON must be an array or an object with a `prompts` array.",
    );
  }

  const prompts = rawPrompts.map((entry, index) =>
    normalizePromptEntry(entry, index),
  );
  const seenIds = new Set();

  for (const prompt of prompts) {
    if (seenIds.has(prompt.id)) {
      throw new Error(`Duplicate prompt id found: ${prompt.id}`);
    }

    seenIds.add(prompt.id);
  }

  return prompts;
}

function buildCredential(projectId) {
  const serviceAccountValue = readEnv("FIREBASE_SERVICE_ACCOUNT_JSON");

  if (serviceAccountValue) {
    const serviceAccountPayload = serviceAccountValue.trim().startsWith("{")
      ? serviceAccountValue
      : readFileSync(resolveJsonFilePath(serviceAccountValue), "utf8");

    return cert(JSON.parse(serviceAccountPayload));
  }

  const clientEmail = readEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = readEnv("FIREBASE_PRIVATE_KEY");

  if (clientEmail && privateKey) {
    return cert({
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
      projectId,
    });
  }

  return applicationDefault();
}

function getFirebaseProjectId() {
  return readEnv("FIREBASE_PROJECT_ID", "VITE_FIREBASE_PROJECT_ID");
}

function getFirebaseApp(projectId) {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: buildCredential(projectId),
    projectId,
  });
}

async function upsertPromptCatalog({ dryRun, prompts, projectId, replace }) {
  const app = getFirebaseApp(projectId);
  const db = getFirestore(app);
  const collectionRef = db.collection(PROMPT_CATALOG_COLLECTION);
  const normalizedIds = new Set(prompts.map((prompt) => prompt.id));
  const deletedIds = [];
  const upsertedIds = [];

  for (const prompt of prompts) {
    const docRef = collectionRef.doc(prompt.id);

    if (dryRun) {
      upsertedIds.push(prompt.id);
      continue;
    }

    const snapshot = await docRef.get();
    const payload = {
      category: prompt.category,
      prompt: prompt.prompt,
      shareEnabled: prompt.shareEnabled,
      slug: prompt.slug,
      title: prompt.title,
      trendScore: prompt.trendScore,
      updatedAt: prompt.updatedAt
        ? Timestamp.fromDate(prompt.updatedAt)
        : FieldValue.serverTimestamp(),
    };

    if (snapshot.exists) {
      if (prompt.createdAt) {
        payload.createdAt = Timestamp.fromDate(prompt.createdAt);
      }
    } else {
      payload.createdAt = prompt.createdAt
        ? Timestamp.fromDate(prompt.createdAt)
        : FieldValue.serverTimestamp();
    }

    await docRef.set(payload, { merge: true });
    upsertedIds.push(prompt.id);
  }

  if (replace) {
    const snapshot = await collectionRef.get();

    for (const docSnapshot of snapshot.docs) {
      if (normalizedIds.has(docSnapshot.id)) {
        continue;
      }

      deletedIds.push(docSnapshot.id);

      if (!dryRun) {
        await docSnapshot.ref.delete();
      }
    }
  }

  return {
    deletedIds,
    upsertedIds,
  };
}

async function main() {
  loadLocalEnv();

  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const inputFile = resolveJsonFilePath(args.file);
  const prompts = loadPromptEntries(inputFile);
  const projectId = getFirebaseProjectId();

  if (!projectId) {
    throw new Error(
      "Missing Firebase project id. Set FIREBASE_PROJECT_ID or VITE_FIREBASE_PROJECT_ID before running the updater.",
    );
  }

  console.log(`Loaded ${prompts.length} prompt(s) from ${inputFile}`);
  console.log(`Target Firebase project: ${projectId}`);

  const { deletedIds, upsertedIds } = await upsertPromptCatalog({
    dryRun: args.dryRun,
    prompts,
    projectId,
    replace: args.replace,
  });

  if (args.dryRun) {
    console.log(`Dry run: would upsert ${upsertedIds.length} prompt(s).`);
    if (args.replace) {
      console.log(`Dry run: would delete ${deletedIds.length} prompt(s).`);
    }
  } else {
    console.log(
      `Upserted ${upsertedIds.length} prompt(s) into ${PROMPT_CATALOG_COLLECTION}.`,
    );
    if (args.replace) {
      console.log(
        `Deleted ${deletedIds.length} prompt(s) not present in the JSON file.`,
      );
    }
  }

  if (upsertedIds.length > 0) {
    console.log(`Updated ids: ${upsertedIds.join(", ")}`);
  }

  if (deletedIds.length > 0) {
    console.log(`Deleted ids: ${deletedIds.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
