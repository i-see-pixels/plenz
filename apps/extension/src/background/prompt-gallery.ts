import type { PublicPrompt, SavedPrompt } from "@plenz/types";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore/lite";
import { AuthManager } from "./auth";
import { getFirestoreDb, isFirebaseConfigured } from "./firebase";
import { getFirebaseUserId } from "./firebase-user";

const PROMPT_CATALOG_COLLECTION = "prompt_catalog";
const SAVED_PROMPTS_COLLECTION = "saved_prompts";
const PUBLIC_PROMPT_LIMIT = 24;
const firebaseProjectId = readEnvVar("VITE_FIREBASE_PROJECT_ID");
const firebaseApiKey = readEnvVar("VITE_FIREBASE_API_KEY");

type PublicPromptSort = "trending" | "newest";

interface PromptCatalogDocument {
  title?: string;
  prompt?: string;
  slug?: string;
  trendScore?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  shareEnabled?: boolean;
}

interface SavedPromptDocument {
  title?: string;
  prompt?: string;
  sourceType?: "catalog" | "custom";
  catalogPromptId?: string | null;
  catalogSlug?: string | null;
  savedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

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

function assertFirebaseConfigured() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured in this build. Add the VITE_FIREBASE_* environment variables before using the prompt gallery.",
    );
  }
}

function readEnvVar(key: keyof ImportMetaEnv) {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function normalizeText(value: string, field: string) {
  const nextValue = value.trim();

  if (!nextValue) {
    throw new Error(`${field} is required.`);
  }

  return nextValue;
}

function toIsoString(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return typeof value === "string" ? value : null;
}

function toPublicPrompt(
  id: string,
  data: PromptCatalogDocument,
): PublicPrompt | null {
  if (typeof data.title !== "string" || typeof data.prompt !== "string") {
    return null;
  }

  return {
    id,
    title: data.title,
    prompt: data.prompt,
    slug:
      typeof data.slug === "string" && data.slug.trim().length > 0
        ? data.slug.trim()
        : id,
    trendScore: typeof data.trendScore === "number" ? data.trendScore : null,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    canShare: data.shareEnabled !== false,
  };
}

function toSavedPrompt(id: string, data: SavedPromptDocument): SavedPrompt | null {
  if (typeof data.title !== "string" || typeof data.prompt !== "string") {
    return null;
  }

  const catalogSlug =
    typeof data.catalogSlug === "string" && data.catalogSlug.trim().length > 0
      ? data.catalogSlug.trim()
      : null;

  return {
    id,
    title: data.title,
    prompt: data.prompt,
    sourceType: data.sourceType === "catalog" ? "catalog" : "custom",
    catalogPromptId:
      typeof data.catalogPromptId === "string" && data.catalogPromptId.trim().length > 0
        ? data.catalogPromptId.trim()
        : null,
    catalogSlug,
    savedAt: toIsoString(data.savedAt),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    canShare: !!catalogSlug,
  };
}

async function requireSignedInUser(actionLabel: string) {
  const user = await AuthManager.getAuthStatus();

  if (!user) {
    throw new Error(`Sign in with Google to ${actionLabel}.`);
  }

  return getFirebaseUserId();
}

function getSavedPromptRef(userId: string, savedPromptId: string) {
  return doc(getFirestoreDb(), "users", userId, SAVED_PROMPTS_COLLECTION, savedPromptId);
}

function getSavedPromptsCollection(userId: string) {
  return collection(getFirestoreDb(), "users", userId, SAVED_PROMPTS_COLLECTION);
}

function buildFirestoreRestUrl(path: string) {
  if (!firebaseProjectId) {
    return "";
  }

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents`;
  const keyQuery = firebaseApiKey ? `?key=${firebaseApiKey}` : "";
  return `${baseUrl}/${path}${keyQuery}`;
}

function getFirestoreDocumentId(documentName: string) {
  return documentName.split("/").at(-1) ?? "";
}

function getFirestoreStringField(
  document: FirestoreDocument,
  fieldName: string,
): string | undefined {
  return document.fields?.[fieldName]?.stringValue;
}

function getFirestoreNumberField(
  document: FirestoreDocument,
  fieldName: string,
): number | undefined {
  const fieldValue = document.fields?.[fieldName];

  if (typeof fieldValue?.doubleValue === "number") {
    return fieldValue.doubleValue;
  }

  if (typeof fieldValue?.integerValue === "string") {
    const numericValue = Number(fieldValue.integerValue);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }

  return undefined;
}

function getFirestoreBooleanField(
  document: FirestoreDocument,
  fieldName: string,
): boolean | undefined {
  const fieldValue = document.fields?.[fieldName]?.booleanValue;
  return typeof fieldValue === "boolean" ? fieldValue : undefined;
}

function getFirestoreTimestampField(
  document: FirestoreDocument,
  fieldName: string,
): string | undefined {
  return document.fields?.[fieldName]?.timestampValue;
}

function toPublicPromptFromFirestoreDocument(document: FirestoreDocument) {
  return toPublicPrompt(getFirestoreDocumentId(document.name), {
    title: getFirestoreStringField(document, "title"),
    prompt: getFirestoreStringField(document, "prompt"),
    slug: getFirestoreStringField(document, "slug"),
    trendScore: getFirestoreNumberField(document, "trendScore"),
    createdAt: getFirestoreTimestampField(document, "createdAt"),
    updatedAt: getFirestoreTimestampField(document, "updatedAt"),
    shareEnabled: getFirestoreBooleanField(document, "shareEnabled"),
  });
}

function isPermissionError(error: unknown) {
  return (
    error instanceof Error &&
    /insufficient permissions|permission[- ]denied/i.test(error.message)
  );
}

async function listPublicPromptsViaRest(
  category: PublicPromptSort,
): Promise<PublicPrompt[]> {
  const queryUrl = buildFirestoreRestUrl(":runQuery");

  if (!queryUrl) {
    throw new Error("Prompt catalog project is not configured.");
  }

  const sortField = category === "trending" ? "trendScore" : "createdAt";
  const response = await fetch(queryUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: PROMPT_CATALOG_COLLECTION }],
        orderBy: [
          {
            field: { fieldPath: sortField },
            direction: "DESCENDING",
          },
        ],
        limit: PUBLIC_PROMPT_LIMIT,
      },
    }),
  });

  if (!response.ok) {
    let errorMessage = `Failed to fetch public prompts (${response.status}).`;

    try {
      const errorPayload = (await response.json()) as {
        error?: { message?: string };
      };
      if (typeof errorPayload.error?.message === "string") {
        errorMessage = errorPayload.error.message;
      }
    } catch {
      // Keep the HTTP status fallback when Firestore does not return JSON.
    }

    throw new Error(errorMessage);
  }

  const queryResults = (await response.json()) as Array<{
    document?: FirestoreDocument;
  }>;

  return queryResults
    .map((result) =>
      result.document
        ? toPublicPromptFromFirestoreDocument(result.document)
        : null,
    )
    .filter((prompt): prompt is PublicPrompt => !!prompt);
}

async function listPublicPromptsViaFirestore(
  category: PublicPromptSort,
): Promise<PublicPrompt[]> {
  const sortField = category === "trending" ? "trendScore" : "createdAt";
  const promptQuery = query(
    collection(getFirestoreDb(), PROMPT_CATALOG_COLLECTION),
    orderBy(sortField, "desc"),
    limit(PUBLIC_PROMPT_LIMIT),
  );
  const snapshot = await getDocs(promptQuery);
  const prompts: PublicPrompt[] = [];

  snapshot.forEach((promptDoc) => {
    const prompt = toPublicPrompt(
      promptDoc.id,
      promptDoc.data() as PromptCatalogDocument,
    );

    if (prompt) {
      prompts.push(prompt);
    }
  });

  return prompts;
}

export const PromptGalleryManager = {
  async listPublicPrompts(category: PublicPromptSort): Promise<PublicPrompt[]> {
    assertFirebaseConfigured();

    try {
      return await listPublicPromptsViaRest(category);
    } catch (restError) {
      console.warn(
        "Prompt gallery: public catalog REST fetch failed, falling back to Firestore Lite.",
        restError,
      );
    }

    try {
      return await listPublicPromptsViaFirestore(category);
    } catch (firestoreError) {
      if (isPermissionError(firestoreError)) {
        throw new Error(
          "Public prompts could not be loaded. Confirm the deployed Firestore rules allow reads on `prompt_catalog`.",
        );
      }

      throw firestoreError;
    }
  },

  async listSavedPrompts(): Promise<SavedPrompt[]> {
    assertFirebaseConfigured();

    const userId = await requireSignedInUser("view saved prompts");
    const savedQuery = query(
      getSavedPromptsCollection(userId),
      orderBy("savedAt", "desc"),
    );
    const snapshot = await getDocs(savedQuery);
    const prompts: SavedPrompt[] = [];

    snapshot.forEach((promptDoc) => {
      const prompt = toSavedPrompt(
        promptDoc.id,
        promptDoc.data() as SavedPromptDocument,
      );

      if (prompt) {
        prompts.push(prompt);
      }
    });

    return prompts;
  },

  async createCustomPrompt(input: {
    title: string;
    prompt: string;
  }): Promise<SavedPrompt> {
    assertFirebaseConfigured();

    const userId = await requireSignedInUser("save prompts");
    const title = normalizeText(input.title, "Title");
    const promptText = normalizeText(input.prompt, "Prompt");
    const savedPromptsCollection = getSavedPromptsCollection(userId);
    const promptDoc = doc(savedPromptsCollection);

    await setDoc(promptDoc, {
      title,
      prompt: promptText,
      sourceType: "custom",
      catalogPromptId: null,
      catalogSlug: null,
      savedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const snapshot = await getDoc(promptDoc);
    const savedPrompt = toSavedPrompt(
      snapshot.id,
      snapshot.data() as SavedPromptDocument,
    );

    if (!savedPrompt) {
      throw new Error("Saved prompt could not be loaded.");
    }

    return savedPrompt;
  },

  async updateSavedPrompt(input: {
    id: string;
    title: string;
    prompt: string;
  }): Promise<SavedPrompt> {
    assertFirebaseConfigured();

    const userId = await requireSignedInUser("edit saved prompts");
    const savedPromptId = normalizeText(input.id, "Prompt id");
    const title = normalizeText(input.title, "Title");
    const promptText = normalizeText(input.prompt, "Prompt");
    const savedPromptRef = getSavedPromptRef(userId, savedPromptId);
    const existingSnapshot = await getDoc(savedPromptRef);

    if (!existingSnapshot.exists()) {
      throw new Error("Saved prompt could not be found.");
    }

    const existingPrompt = toSavedPrompt(
      existingSnapshot.id,
      existingSnapshot.data() as SavedPromptDocument,
    );

    if (!existingPrompt) {
      throw new Error("Saved prompt could not be loaded.");
    }

    if (existingPrompt.sourceType !== "custom") {
      throw new Error("Only private prompts can be edited right now.");
    }

    await setDoc(
      savedPromptRef,
      {
        title,
        prompt: promptText,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    const snapshot = await getDoc(savedPromptRef);
    const savedPrompt = toSavedPrompt(
      snapshot.id,
      snapshot.data() as SavedPromptDocument,
    );

    if (!savedPrompt) {
      throw new Error("Saved prompt could not be loaded.");
    }

    return savedPrompt;
  },

  async savePublicPrompt(prompt: PublicPrompt): Promise<SavedPrompt> {
    assertFirebaseConfigured();

    const userId = await requireSignedInUser("save prompts");
    const title = normalizeText(prompt.title, "Title");
    const promptText = normalizeText(prompt.prompt, "Prompt");
    const savedPromptId = `catalog_${prompt.id}`;
    const savedPromptRef = getSavedPromptRef(userId, savedPromptId);
    const existingSnapshot = await getDoc(savedPromptRef);
    const timestampFields = existingSnapshot.exists()
      ? {
          savedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      : {
          savedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

    await setDoc(
      savedPromptRef,
      {
        title,
        prompt: promptText,
        sourceType: "catalog",
        catalogPromptId: prompt.id,
        catalogSlug: normalizeText(prompt.slug, "Share link"),
        ...timestampFields,
      },
      { merge: true },
    );

    const snapshot = await getDoc(savedPromptRef);
    const savedPrompt = toSavedPrompt(
      snapshot.id,
      snapshot.data() as SavedPromptDocument,
    );

    if (!savedPrompt) {
      throw new Error("Saved prompt could not be loaded.");
    }

    return savedPrompt;
  },

  async deleteSavedPrompt(savedPromptId: string): Promise<void> {
    assertFirebaseConfigured();

    const userId = await requireSignedInUser("remove saved prompts");
    const nextSavedPromptId = normalizeText(savedPromptId, "Prompt id");
    await deleteDoc(getSavedPromptRef(userId, nextSavedPromptId));
  },
};
