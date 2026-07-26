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
      container.innerHTML = `
        <div style="margin: 20px auto; max-width: 300px;">
          <h4 style="color: #666; margin-bottom: 8px; text-align: center;">✨ 今日隨機推薦</h4>
        </div>
      `;

      // 1. 利用原本的函式產生卡片
      const cardElement = renderRecipeCard(r);

      // 2. 因為原本產出來是 <a> 標籤會直接跳轉，我們把它改成 <div>，讓它乖乖留在首頁
      const divCard = document.createElement("div");
      divCard.className = cardElement.className;
      divCard.style.cssText = "cursor: pointer; position: relative;"; // 讓滑鼠移上去變成手指，保持排版
      divCard.innerHTML = cardElement.innerHTML;

      // 3. 只有當使用者「主動點擊」這張卡片時，才導向詳細頁
      divCard.addEventListener("click", () => {
        window.location.href = `detail.html?id=${r.id}`;
      });

      // 4. 清空容器並把新卡片放進去
      container.querySelector("div").appendChild(divCard);
    }
  });
}