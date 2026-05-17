interface FirestoreFieldValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
}

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreFieldValue>;
}

export interface PublicPromptRecord {
  id: string;
  title: string;
  prompt: string;
  slug: string;
  trendScore: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  canShare: boolean;
}

function readEnvVar(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

const firebaseProjectId = readEnvVar(
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_PROJECT_ID",
  "FIREBASE_PROJECT_ID",
);
const firebaseApiKey = readEnvVar(
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "VITE_FIREBASE_API_KEY",
  "FIREBASE_API_KEY",
);

function getFirestoreBaseUrl() {
  if (!firebaseProjectId) {
    return "";
  }

  return `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents`;
}

function buildFirestoreUrl(path: string) {
  const baseUrl = getFirestoreBaseUrl();

  if (!baseUrl) {
    return "";
  }

  const keyQuery = firebaseApiKey ? `?key=${firebaseApiKey}` : "";
  return `${baseUrl}/${path}${keyQuery}`;
}

function getDocumentId(documentName: string) {
  return documentName.split("/").at(-1) ?? "";
}

function getStringField(document: FirestoreDocument, fieldName: string) {
  return document.fields?.[fieldName]?.stringValue ?? null;
}

function getNumberField(document: FirestoreDocument, fieldName: string) {
  const fieldValue = document.fields?.[fieldName];

  if (typeof fieldValue?.doubleValue === "number") {
    return fieldValue.doubleValue;
  }

  if (typeof fieldValue?.integerValue === "string") {
    const numericValue = Number(fieldValue.integerValue);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return null;
}

function getBooleanField(document: FirestoreDocument, fieldName: string) {
  const fieldValue = document.fields?.[fieldName]?.booleanValue;
  return typeof fieldValue === "boolean" ? fieldValue : null;
}

function getTimestampField(document: FirestoreDocument, fieldName: string) {
  return document.fields?.[fieldName]?.timestampValue ?? null;
}

function toPublicPrompt(document: FirestoreDocument): PublicPromptRecord | null {
  const id = getDocumentId(document.name);
  const title = getStringField(document, "title");
  const prompt = getStringField(document, "prompt");

  if (!id || !title || !prompt) {
    return null;
  }

  return {
    id,
    title,
    prompt,
    slug: getStringField(document, "slug") ?? id,
    trendScore: getNumberField(document, "trendScore"),
    createdAt: getTimestampField(document, "createdAt"),
    updatedAt: getTimestampField(document, "updatedAt"),
    canShare: getBooleanField(document, "shareEnabled") !== false,
  };
}

async function fetchFirestoreDocument(path: string) {
  const url = buildFirestoreUrl(path);

  if (!url) {
    return null;
  }

  const response = await fetch(url, {
    next: { revalidate: 300 },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch prompt catalog: ${response.status}`);
  }

  return (await response.json()) as FirestoreDocument;
}

async function queryPromptBySlug(slug: string) {
  const url = buildFirestoreUrl(":runQuery");

  if (!url) {
    return null;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "prompt_catalog" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "slug" },
            op: "EQUAL",
            value: { stringValue: slug },
          },
        },
        limit: 1,
      },
    }),
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Failed to query prompt catalog: ${response.status}`);
  }

  const result = (await response.json()) as Array<{ document?: FirestoreDocument }>;
  return result.find((item) => item.document)?.document ?? null;
}

export function isPromptCatalogConfigured() {
  return firebaseProjectId.length > 0;
}

export async function getPublicPromptBySlug(slug: string) {
  if (!isPromptCatalogConfigured()) {
    return null;
  }

  const directDocument = await fetchFirestoreDocument(`prompt_catalog/${slug}`);
  const directPrompt = directDocument ? toPublicPrompt(directDocument) : null;

  if (directPrompt && directPrompt.canShare) {
    return directPrompt;
  }

  const queriedDocument = await queryPromptBySlug(slug);
  const queriedPrompt = queriedDocument ? toPublicPrompt(queriedDocument) : null;

  if (!queriedPrompt?.canShare) {
    return null;
  }

  return queriedPrompt;
}
