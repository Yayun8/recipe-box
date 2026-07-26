// ============================================================
// 資料層
// 策略:畫面一律先讀 IndexedDB(本機快取,離線也能開),
// 同時對 Firestore 掛上即時監聽(onSnapshot),
// 一有雲端變化就覆寫本機快取並重新畫面。
// 寫入(新增/編輯/刪除/收藏)一律直接寫 Firestore,
// 成功後 onSnapshot 會自動把本機快取跟著更新。
// ============================================================
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const DB_NAME = "recipeboxDB";
const DB_VERSION = 1;
const STORE = "recipes";
const META_STORE = "meta";
const COLLECTION_NAME = "recipes";

let idbPromise = null;

function openIDB() {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(STORE)) {
        idb.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!idb.objectStoreNames.contains(META_STORE)) {
        idb.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return idbPromise;
}

async function withStore(storeName, mode, fn) {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

/** 讀出本機快取的全部食譜(離線時的第一畫面來源) */
export async function localGetAll() {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/** 用雲端最新的整份清單覆寫本機快取 */
export async function localReplaceAll(recipes) {
  await withStore(STORE, "readwrite", (store) => {
    store.clear();
    recipes.forEach((r) => store.put(r));
  });
  await withStore(META_STORE, "readwrite", (store) => {
    store.put({ key: "lastSync", value: Date.now() });
  });
}

export async function localGetLastSync() {
  const idb = await openIDB();
  return new Promise((resolve) => {
    const tx = idb.transaction(META_STORE, "readonly");
    const req = tx.objectStore(META_STORE).get("lastSync");
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => resolve(null);
  });
}

/**
 * 掛上 Firestore 即時監聽。
 * 每次雲端有變化(包含第一次讀取)都會:
 *   1. 覆寫本機 IndexedDB 快取
 *   2. 呼叫 callback(recipes, meta) 更新畫面
 * 回傳 unsubscribe function。
 * 若監聽失敗(例如離線),會 fallback 讀本機快取一次。
 */
export function subscribeRecipes(callback) {
  const colRef = collection(db, COLLECTION_NAME);

  // 排序函式：將新新增的排在最前面
  const sortRecipes = (list) => {
    return list.sort((a, b) => {
      const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return tB - tA;
    });
  };

  // 先用本機快取墊底,避免畫面空白
  localGetAll().then((cached) => {
    if (cached.length) {
      callback(sortRecipes(cached), { source: "cache" });
    }
  });

  const unsubscribe = onSnapshot(
    colRef,
    async (snapshot) => {
      let recipes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      recipes = sortRecipes(recipes); // 雲端資料自動排序
      await localReplaceAll(recipes);
      callback(recipes, { source: snapshot.metadata.fromCache ? "cache" : "server" });
    },
    async (err) => {
      console.warn("Firestore 監聽失敗,改用本機快取:", err.message);
      let cached = await localGetAll();
      callback(sortRecipes(cached), { source: "cache", error: err });
    }
  );

  return unsubscribe;
}

/** 新增食譜到 Firestore(本機快取會由 onSnapshot 自動更新) */
export async function createRecipe(data) {
  const colRef = collection(db, COLLECTION_NAME);
  return addDoc(colRef, {
    ...data,
    isFavorite: !!data.isFavorite,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** 更新既有食譜 */
export async function updateRecipe(id, data) {
  const ref = doc(db, COLLECTION_NAME, id);
  return updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

/** 刪除食譜 */
export async function deleteRecipe(id) {
  const ref = doc(db, COLLECTION_NAME, id);
  return deleteDoc(ref);
}

/** 切換收藏狀態 */
export async function toggleFavorite(id, next) {
  const ref = doc(db, COLLECTION_NAME, id);
  return updateDoc(ref, { isFavorite: next, updatedAt: serverTimestamp() });
}

/** 直接從本機快取取一筆(給 detail.html 離線時用) */
export async function localGetOne(id) {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
