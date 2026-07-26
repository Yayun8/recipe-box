// ============================================================
// 共用前端邏輯(不含 Firestore/IndexedDB 存取,那些在 db.js)
// ============================================================

export const CATEGORY_LABEL = { all: "全部", sweet: "甜食", savory: "鹹食" };

export function qs(sel, root = document) {
  return root.querySelector(sel);
}
export function qsa(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

/** 取得 / 記住目前甜鹹模式(存在 localStorage,只是 UI 偏好,非食譜資料) */
export function getMode() {
  return localStorage.getItem("recipebox_mode") || "sweet"; // 保留原本的記憶功能
}
export function setMode(mode) {
  localStorage.setItem("recipebox_mode", mode);
  document.documentElement.setAttribute("data-mode", mode);
  document.body.setAttribute("data-mode", mode);
}

/** 綁定頁面上的甜/鹹分隔頁籤切換器,回呼帶新的 mode */
export function initTabSwitcher(onChange) {
  const buttons = qsa(".tab-divider");
  const apply = (mode) => {
    setMode(mode);
    buttons.forEach((b) => b.classList.toggle("is-active", b.dataset.tab === mode));
    onChange && onChange(mode);
  };
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => apply(btn.dataset.tab));
  });
  apply(getMode());
}

/** 產生一張食譜卡片的 DOM */
export function renderRecipeCard(recipe) {
  const el = document.createElement("a");
  el.href = `detail.html?id=${recipe.id}`;
  el.className = "recipe-card";
  el.dataset.category = recipe.category;
  el.setAttribute("data-cat-label", CATEGORY_LABEL[recipe.category] || recipe.category);

  const tags = (recipe.tags || [])
    .map((t) => `<span>#${escapeHtml(t)}</span>`)
    .join("");

  el.innerHTML = `
    ${recipe.image ? `<div class="card-img-wrap" style="margin:-18px -16px 10px -16px;"><img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.title)}" style="width:100%; height:130px; object-fit:cover; border-radius:var(--radius) var(--radius) 0 0;" /></div>` : ""}
    <h3>${escapeHtml(recipe.title || "未命名食譜")}</h3>
    <div class="tags">${tags}</div>
    <div class="card-foot">
      <span>${(recipe.steps || []).length} 個步驟</span>
      <button class="fav-btn ${recipe.isFavorite ? "is-fav" : ""}" data-id="${recipe.id}">
        ${recipe.isFavorite ? "★" : "☆"}
      </button>
    </div>
  `;
  return el;
}

export function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 依模式 / 搜尋字 / 標籤 過濾食譜清單 */
export function filterRecipes(recipes, { mode, keyword, tag }) {
  return recipes.filter((r) => {
    if (mode && mode !== "all" && r.category !== mode) return false;
    if (tag && !(r.tags || []).includes(tag)) return false;
    if (keyword) {
      const k = keyword.trim().toLowerCase();
      const hay = [r.title, ...(r.tags || [])].join(" ").toLowerCase();
      if (!hay.includes(k)) return false;
    }
    return true;
  });
}

/** 從清單中隨機挑一筆(給「隨機推薦」按鈕用) */
export function pickRandom(list) {
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

/** 監控線上/離線狀態,更新畫面上的小圓點徽章 */
export function initSyncBadge(el) {
  if (!el) return;
  const update = () => {
    const online = navigator.onLine;
    el.classList.toggle("is-online", online);
    el.classList.toggle("is-offline", !online);
    el.querySelector(".label") &&
      (el.querySelector(".label").textContent = online ? "已連線同步" : "離線,使用本機快取");
  };
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

export function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/** 收集清單中所有出現過的標籤(去重),給標籤過濾用 */
export function collectTags(recipes) {
  const set = new Set();
  recipes.forEach((r) => (r.tags || []).forEach((t) => set.add(t)));
  return [...set];
}
