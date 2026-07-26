import { qs, qsa, renderRecipeCard, debounce, initSyncBadge, setMode } from "./app.js";
import { subscribeRecipes, toggleFavorite } from "./db.js";

setMode("sweet"); // dashboard 走中性配色,固定甜食主色即可

let allRecipes = [];
let filter = "fav"; // 預設為收藏

const grid = qs("#recipeGrid");
const searchInput = qs("#searchInput");
const countLabel = qs("#countLabel");
const filterBtns = qsa("[data-filter]");

function render() {
  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
  let list = allRecipes;

  if (filter === "sweet" || filter === "savory") {
    list = list.filter((r) => r.category === filter);
  } else if (filter === "fav") {
    list = list.filter((r) => r.isFavorite);
  }
  if (keyword) {
    list = list.filter((r) =>
      [r.title, ...(r.tags || [])].join(" ").toLowerCase().includes(keyword)
    );
  }

  if (countLabel) {
    countLabel.textContent = allRecipes.length;
  }
  
  if (grid) {
    grid.innerHTML = "";
    if (!list.length) {
      grid.innerHTML = `<div class="empty-state">目前沒有收藏的食譜。<br><a href="edit_recipe.html">新增或去首頁瀏覽 →</a></div>`;
      return;
    }
    list.forEach((r) => grid.appendChild(renderRecipeCard(r)));
  }
}

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    filterBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
    render();
  });
});

filterBtns.forEach((btn) => {
  if (btn.dataset.filter === "fav") {
    btn.classList.add("is-active");
  } else {
    btn.classList.remove("is-active");
  }
});

if (grid) {
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-fav-id]");
    if (!btn) return;
    e.preventDefault();
    const id = btn.dataset.favId;
    const recipe = allRecipes.find((r) => r.id === id);
    if (!recipe) return;
    toggleFavorite(id, !recipe.isFavorite).catch((err) => console.error(err));
  });
}

if (searchInput) {
  searchInput.addEventListener("input", debounce(render, 150));
}

const syncBadgeEl = qs("#syncBadge");
if (syncBadgeEl) {
  initSyncBadge(syncBadgeEl);
}

subscribeRecipes((recipes) => {
  allRecipes = recipes;
  render();
});

// ==============================
// 隨機推薦彈出視窗相關邏輯
// ==============================
const randomBtn = document.querySelector("#randomBtn");
const randomModal = document.querySelector("#randomModal");
const closeModalBtn = document.querySelector("#closeModalBtn");
const drawAgainBtn = document.querySelector("#drawAgainBtn");
const modalCardBody = document.querySelector("#modalCardBody");

function triggerRandomRecipe() {
  let targetRecipes = allRecipes || [];
  if (filter === "sweet" || filter === "savory") {
    targetRecipes = targetRecipes.filter(r => r.category === filter);
  } else if (filter === "fav") {
    targetRecipes = targetRecipes.filter(r => r.isFavorite);
  }

  if (targetRecipes.length === 0) {
    alert("目前這個分類沒有食譜可以推薦！");
    return;
  }

  const randomIndex = Math.floor(Math.random() * targetRecipes.length);
  const r = targetRecipes[randomIndex];

  if (modalCardBody && r) {
    const imgSrc = r.image ? r.image : "";
    const stepsCount = r.steps ? r.steps.length : 0;
    const title = r.title || "未命名食譜";

    modalCardBody.innerHTML = `
      <div onclick="window.location.href='detail.html?id=${r.id}'" style="cursor: pointer; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        ${imgSrc ? `<div style="width: 100%; height: 180px; overflow: hidden;"><img src="${imgSrc}" alt="${title}" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ""}
        <div style="padding: 15px;">
          <h3 style="font-size: 18px; margin: 0 0 8px 0; color: #1a2b4c;">${title}</h3>
          <div style="display: flex; justify-content: space-between; align-items: center; color: #666; font-size: 14px;">
            <span>${stepsCount} 個步驟</span>
            <span style="color: #f39c12;">⭐ 點擊查看詳細做法</span>
          </div>
        </div>
      </div>
    `;
  }

  if (randomModal) {
    randomModal.style.display = "flex";
  }
}

if (randomBtn) {
  randomBtn.addEventListener("click", triggerRandomRecipe);
}

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => {
    randomModal.style.display = "none";
  });
}

if (drawAgainBtn) {
  drawAgainBtn.addEventListener("click", triggerRandomRecipe);
}

if (randomModal) {
  randomModal.addEventListener("click", (e) => {
    if (e.target === randomModal) {
      randomModal.style.display = "none";
    }
  });
}