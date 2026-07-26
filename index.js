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

randomBtn.addEventListener("click", () => {
  const mode = getMode();
  const pool = filterRecipes(allRecipes, { mode, keyword: "", tag: activeTag });
  const pick = pickRandom(pool);
  if (!pick) {
    alert("這個模式下還沒有食譜可以推薦,先新增一道吧!");
    return;
  }
  window.location.href = `detail.html?id=${pick.id}`;
});

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
