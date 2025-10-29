/**
 * IndexedDB utility functions for storing chat sessions and writing histories
 */

const DB_NAME = 'WritingAssistantDB';
const DB_VERSION = 2; // Increment version to add settings store
const CHAT_SESSIONS_STORE = 'chatSessions';
const WRITING_HISTORIES_STORE = 'writingHistories';
const SETTINGS_STORE = 'settings';

/**
 * Initialize IndexedDB
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create chat sessions store if it doesn't exist
      if (!db.objectStoreNames.contains(CHAT_SESSIONS_STORE)) {
        db.createObjectStore(CHAT_SESSIONS_STORE, { keyPath: 'id' });
      }

      // Create writing histories store if it doesn't exist
      if (!db.objectStoreNames.contains(WRITING_HISTORIES_STORE)) {
        db.createObjectStore(WRITING_HISTORIES_STORE, { keyPath: 'id' });
      }

      // Create settings store if it doesn't exist
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Get all chat sessions from IndexedDB
 */
export async function getAllChatSessions(): Promise<any[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CHAT_SESSIONS_STORE, 'readonly');
    const store = transaction.objectStore(CHAT_SESSIONS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to get chat sessions'));
    };
  });
}

/**
 * Save all chat sessions to IndexedDB
 */
export async function saveAllChatSessions(sessions: any[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CHAT_SESSIONS_STORE, 'readwrite');
    const store = transaction.objectStore(CHAT_SESSIONS_STORE);

    // Clear existing data
    store.clear();

    // Add all sessions
    sessions.forEach(session => {
      store.put(session);
    });

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(new Error('Failed to save chat sessions'));
    };
  });
}

/**
 * Delete a chat session from IndexedDB
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CHAT_SESSIONS_STORE, 'readwrite');
    const store = transaction.objectStore(CHAT_SESSIONS_STORE);
    const request = store.delete(sessionId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete chat session'));
    };
  });
}

/**
 * Get all writing histories from IndexedDB
 */
export async function getAllWritingHistories(): Promise<any[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WRITING_HISTORIES_STORE, 'readonly');
    const store = transaction.objectStore(WRITING_HISTORIES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to get writing histories'));
    };
  });
}

/**
 * Save all writing histories to IndexedDB
 */
export async function saveAllWritingHistories(histories: any[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WRITING_HISTORIES_STORE, 'readwrite');
    const store = transaction.objectStore(WRITING_HISTORIES_STORE);

    // Clear existing data
    store.clear();

    // Add all histories
    histories.forEach(history => {
      store.put(history);
    });

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(new Error('Failed to save writing histories'));
    };
  });
}

/**
 * Delete a writing history from IndexedDB
 */
export async function deleteWritingHistory(historyId: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WRITING_HISTORIES_STORE, 'readwrite');
    const store = transaction.objectStore(WRITING_HISTORIES_STORE);
    const request = store.delete(historyId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete writing history'));
    };
  });
}

/**
 * Get settings from IndexedDB
 */
export async function getSettings(): Promise<any> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE, 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.get('appSettings');

    request.onsuccess = () => {
      resolve(request.result?.value || null);
    };

    request.onerror = () => {
      reject(new Error('Failed to get settings'));
    };
  });
}

/**
 * Save settings to IndexedDB
 */
export async function saveSettings(settings: any): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE, 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);

    const request = store.put({ key: 'appSettings', value: settings });

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(new Error('Failed to save settings'));
    };
  });
}

