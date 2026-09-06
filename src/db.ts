import type { DraftSession, Session, Settings } from './types';

const DB_VERSION = 1;

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('state')) db.createObjectStore('state');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
  });
}

async function transact<T>(databaseName: string, storeName: string, mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase(databaseName);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = work(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local storage operation failed.'));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error ?? new Error('Local storage transaction failed.'));
  });
}

export function createStorage(databaseName: string) {
  return {
  getSettings: () => transact<Settings | undefined>(databaseName, 'state', 'readonly', (store) => store.get('settings')),
  setSettings: (value: Settings) => transact<IDBValidKey>(databaseName, 'state', 'readwrite', (store) => store.put(value, 'settings')),
  getDraft: () => transact<DraftSession | undefined>(databaseName, 'state', 'readonly', (store) => store.get('draft')),
  setDraft: (value: DraftSession | null) => value
    ? transact<IDBValidKey>(databaseName, 'state', 'readwrite', (store) => store.put(value, 'draft'))
    : transact<undefined>(databaseName, 'state', 'readwrite', (store) => store.delete('draft')),
  getSessions: async (): Promise<Session[]> => {
    const sessions = await transact<Session[]>(databaseName, 'sessions', 'readonly', (store) => store.getAll());
    return sessions.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  },
  putSession: (value: Session) => transact<IDBValidKey>(databaseName, 'sessions', 'readwrite', (store) => store.put(value)),
  putSessions: async (values: Session[]) => {
    const db = await openDatabase(databaseName);
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('sessions', 'readwrite');
      const store = transaction.objectStore('sessions');
      values.forEach((value) => store.put(value));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not import sessions.'));
    });
    db.close();
  },
  clearAll: async () => {
    const db = await openDatabase(databaseName);
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['sessions', 'state'], 'readwrite');
      transaction.objectStore('sessions').clear();
      transaction.objectStore('state').clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not clear local data.'));
    });
    db.close();
  }
  };
}

export const storage = createStorage('rep-range-compass');
