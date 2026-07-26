import { qs, qsa, renderRecipeCard, debounce, initSyncBadge, setMode } from "./app.js";
import { subscribeRecipes, toggleFavorite } from "./db.js";

setMode("sweet"); // dashboard 走中性配色,固定甜食主色即可

let allRecipes = [];
let filter = "fav"; // 👉 改這裡：預設為收藏

const grid = qs("#recipeGrid");
const searchInput = qs("#searchInput");
const countLabel = qs("#countLabel");
const filterBtns = qsa("[data-filter]");

function render() {
  const keyword = searchInput.value.trim().toLowerCase();
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

  countLabel.textContent = allRecipes.length;
  grid.innerHTML = "";
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state">目前沒有收藏的食譜。<br><a href="edit_recipe.html">新增或去首頁瀏覽 →</a></div>`;
    return;
  }
  list.forEach((r) => grid.appendChild(renderRecipeCard(r)));
}

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    filterBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
    render();
  });
});

// 👉 改這裡：讓頁面載入時，預設把「收藏」按鈕加上 is-active 樣式
filterBtns.forEach((btn) => {
  if (btn.dataset.filter === "fav") {
    btn.classList.add("is-active");
  } else {
    btn.classList.remove("is-active");
  }
});

grid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-fav-id]");
  if (!btn) return;
  e.preventDefault();
  const id = btn.dataset.favId;
  const recipe = allRecipes.find((r) => r.id === id);
  if (!recipe) return;
  toggleFavorite(id, !recipe.isFavorite).catch((err) => console.error(err));
});

searchInput.addEventListener("input", debounce(render, 150));
initSyncBadge(qs("#syncBadge"));

subscribeRecipes((recipes) => {
  allRecipes = recipes;
  render();
});

const randomBtn = document.querySelector("#randomBtn");

if (randomBtn) {
  randomBtn.addEventListener("click", () => {
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

    // 隨機抽出一道菜
    const randomIndex = Math.floor(Math.random() * targetRecipes.length);
    const r = targetRecipes[randomIndex];

    // 找到首頁放卡片的容器
    const container = document.querySelector("#randomCardContainer");
    if (container && r) {
      // 判斷分類標籤的文字與顏色
      let categoryText = "";
      if (r.category === "sweet") categoryText = '<span class="tag sweet">甜食</span>';
      else if (r.category === "savory") categoryText = '<span class="tag savory">鹹食</span>';

      // 產生跟你平常常見的食譜卡片一模一樣的 HTML
      container.innerHTML = `
        <div style="margin: 20px auto; max-width: 300px;">
          <h4 style="color: #666; margin-bottom: 8px;">✨ 今日隨機推薦</h4>
          <div class="recipe-card" onclick="window.location.href='detail.html?id=${r.id}'" style="cursor: pointer; border: 1px solid #ddd; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); position: relative;">
            ${categoryText}
            <img src="${r.image || 'default.jpg'}" alt="${r.name}" style="width: 100%; height: 180px; object-fit: cover;">
            <div style="padding: 15px;">
              <h3 style="font-size: 18px; margin: 0 0 10px 0; color: #1a2b4c;">${r.name}</h3>
              <div style="display: flex; justify-content: space-between; align-items: center; color: #666; font-size: 14px;">
                <span>${r.steps ? r.steps.length : 0} 個步驟</span>
                <span>⭐</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  });
}