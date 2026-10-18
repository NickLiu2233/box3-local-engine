const DATABASE_NAME = 'box3-voxa-local-drafts';
const STORE_NAME = 'projects';
const VERSION = 1;

export type LocalDraft = {
  projectName: string;
  editType: number;
  bytes: Uint8Array;
  savedAt: number;
  preview?: Blob;
};

function draftKey(projectName: string) {
  return `project:${String(projectName || '未命名模型').trim().slice(0, 100) || '未命名模型'}`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前浏览器不支持本地工程保存'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('无法打开本地工程存储'));
  });
}

export async function saveLocalDraft(draft: Omit<LocalDraft, 'savedAt'>) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database
      .transaction(STORE_NAME, 'readwrite')
      .objectStore(STORE_NAME)
      .put({ ...draft, savedAt: Date.now() }, draftKey(draft.projectName));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('本地工程保存失败'));
  });
  database.close();
}

export async function listLocalDrafts(): Promise<LocalDraft[]> {
  const database = await openDatabase();
  const values = await new Promise<LocalDraft[]>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result || []) as LocalDraft[]);
    request.onerror = () => reject(request.error || new Error('本地工程读取失败'));
  });
  database.close();
  return values
    .filter((value) => value && value.bytes instanceof Uint8Array && value.bytes.length)
    .sort((left, right) => right.savedAt - left.savedAt);
}

export async function loadLocalDraft(projectName?: string): Promise<LocalDraft | undefined> {
  const drafts = await listLocalDrafts();
  if (!projectName) return drafts[0];
  return drafts.find((draft) => draft.projectName === projectName);
}

export async function clearLocalDraft() {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('本地工程删除失败'));
  });
  database.close();
}

export async function deleteLocalDraft(projectName: string) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(draftKey(projectName));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('本地工程删除失败'));
  });
  database.close();
}
