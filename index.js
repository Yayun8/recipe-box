import {
  qs,
  initTabSwitcher,
  renderRecipeCard,
  filterRecipes,
  pickRandom,
  initSyncBadge,
  debounce,
  collectTags,
  getMode,
} from "./app.js";
import { subscribeRecipes, toggleFavorite } from "./db.js";

let allRecipes = [];
let activeTag = null;

const grid = qs("#recipeGrid");
const searchInput = qs("#searchInput");
const tagPillsEl = qs("#tagPills");
const randomBtn = qs("#randomBtn");

function render() {
  const mode = getMode();
  const keyword = searchInput.value;
  const filtered = filterRecipes(allRecipes, { mode, keyword, tag: activeTag });

  grid.innerHTML = "";
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state">這個模式下還沒有食譜。<br><a href="edit_recipe.html">新增第一道食譜 →</a></div>`;
    return;
  }
  filtered.forEach((r) => grid.appendChild(renderRecipeCard(r)));
}

function renderTagPills() {
  const mode = getMode();
  const tags = collectTags(allRecipes.filter((r) => r.category === mode));
  tagPillsEl.innerHTML = "";
  tags.forEach((tag) => {
    const btn = document.createElement("button");
    btn.className = "tag-pill" + (activeTag === tag ? " is-active" : "");
    btn.textContent = "#" + tag;
    btn.addEventListener("click", () => {
      activeTag = activeTag === tag ? null : tag;
      renderTagPills();
      render();
    });
    tagPillsEl.appendChild(btn);
  });
}

// 收藏按鈕(用事件代理,因為卡片是動態生成的)
grid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-fav-id]");
  if (!btn) return;
  e.preventDefault();
  const id = btn.dataset.favId;
  const recipe = allRecipes.find((r) => r.id === id);
  if (!recipe) return;
  toggleFavorite(id, !recipe.isFavorite).catch((err) =>
    console.error("更新收藏失敗:", err)
  );
});

// ==============================
// 隨機推薦彈出視窗相關邏輯
// ==============================
const randomModal = document.querySelector("#randomModal");
const closeModalBtn = document.querySelector("#closeModalBtn");
const drawAgainBtn = document.querySelector("#drawAgainBtn");
const modalCardBody = document.querySelector("#modalCardBody");

function triggerRandomRecipe() {
  const mode = getMode();
  const pool = filterRecipes(allRecipes, { mode, keyword: "", tag: activeTag });
  
  if (!pool.length) {
    alert("這個模式下還沒有食譜可以推薦,先新增一道吧!");
    return;
  }

  const pick = pickRandom(pool);
  if (modalCardBody && pick) {
    const imgSrc = pick.image ? pick.image : "";
    const stepsCount = pick.steps ? pick.steps.length : 0;
    const title = pick.title || "未命名食譜";

    modalCardBody.innerHTML = `
      <div onclick="window.location.href='detail.html?id=${pick.id}'" style="cursor: pointer; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
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
    if (randomModal) randomModal.style.display = "none";
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

searchInput.addEventListener("input", debounce(render, 150));

initTabSwitcher(() => {
  activeTag = null;
  renderTagPills();
  render();
});

initSyncBadge(qs("#syncBadge"));

subscribeRecipes((recipes) => {
  allRecipes = recipes;
  renderTagPills();
  render();
});