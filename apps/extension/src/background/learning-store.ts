import {
  LEARNING_STORAGE_KEY,
  normalizeLearning,
  recordLearning,
  type LearningEvent,
} from "../shared/learning";

// The one writer of local learning stats, so events from several tabs are
// applied one after another instead of overwriting each other.

let queue: Promise<unknown> = Promise.resolve();

export const LearningStore = {
  record(event: LearningEvent): Promise<void> {
    const next = queue.then(async () => {
      const stored = await chrome.storage.local.get(LEARNING_STORAGE_KEY);
      const learning = recordLearning(normalizeLearning(stored[LEARNING_STORAGE_KEY]), event);
      await chrome.storage.local.set({ [LEARNING_STORAGE_KEY]: learning });
    });
    queue = next.catch(() => undefined);
    return next;
  },

  reset(): Promise<void> {
    const next = queue.then(() => chrome.storage.local.remove(LEARNING_STORAGE_KEY));
    queue = next.catch(() => undefined);
    return next;
  },
};
