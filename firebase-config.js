// ============================================================
// Firebase 專案設定
// 請到 Firebase 主控台 → 專案設定 → 一般 → 你的應用程式
// 把下面物件換成你自己專案的設定值。
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD0fojfXFLg6-5u9nSI6opkp_im-NREGkc",
  authDomain: "recipe-6e0c3.firebaseapp.com",
  projectId: "recipe-6e0c3",
  storageBucket: "recipe-6e0c3.firebasestorage.app",
  messagingSenderId: "338723967041",
  appId: "1:338723967041:web:fabd2b9ac71c5782aff6c0",
  measurementId: "G-6KC250TM1K"
};
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
