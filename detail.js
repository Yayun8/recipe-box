import { qs, escapeHtml, setMode, getMode } from "./app.js";
import { subscribeRecipes, toggleFavorite, deleteRecipe } from "./db.js";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

setMode(getMode());

const titleEl = qs("#title");
const imageContainer = qs("#recipeImageContainer");
const sourceContainer = qs("#recipeSourceContainer");
const tagsEl = qs("#tags");
const favBtn = qs("#favBtn");
const editLink = qs("#editLink");
const deleteBtn = qs("#deleteBtn");
const ingredientList = qs("#ingredientList");
const stepsList = qs("#stepsList");

let current = null;

function render(recipe) {
  current = recipe;
  if (!recipe) {
    titleEl.textContent = "找不到這道食譜";
    return;
  }
  setMode(recipe.category || "sweet");
  titleEl.textContent = recipe.title || "未命名食譜";

  // 渲染圖片
if (imageContainer) {
  imageContainer.innerHTML = recipe.image
    ? `<img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.title)}" style="width:100%; height:320px; object-fit:cover; border-radius:var(--radius); box-shadow:var(--shadow);" />`
    : "";
}

// 渲染來源網址
if (sourceContainer) {
  sourceContainer.innerHTML = recipe.sourceUrl
    ? `<p style="font-size:14px;"><a href="${escapeHtml(recipe.sourceUrl)}" target="_blank" style="color:var(--accent); text-decoration:underline; font-weight:500;">🔗 點此檢視食譜原始來源網址</a></p>`
    : "";
}

// 渲染被圈起來的標籤
// 直接使用專案內建的 span 樣式，讓它跟首頁完全一致
  tagsEl.innerHTML = (recipe.tags || [])
    .map((t) => `<span class="tag-capsule">#${escapeHtml(t)}</span>`)
    .join("");

  

 
  favBtn.textContent = recipe.isFavorite ? "★" : "☆";
  favBtn.classList.toggle("is-fav", !!recipe.isFavorite);
  editLink.href = `edit_recipe.html?id=${recipe.id}`;

  ingredientList.innerHTML = (recipe.ingredients || [])
    .map((ing) => {
      // 如果資料是舊的物件格式 (有 name)
      if (typeof ing === "object" && ing !== null) {
        return `<li><span>${escapeHtml(ing.name || "")}</span><b>${escapeHtml(ing.amount || "")}${escapeHtml(ing.unit || "")}</b></li>`;
      }
      // 如果資料是新的純文字格式 (直接印出字串)
      return `<li><span>${escapeHtml(ing)}</span></li>`;
    })
    .join("") || `<li style="color:var(--ink-soft)">尚未填寫食材</li>`;

  stepsList.innerHTML = (recipe.steps || [])
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("") || `<li style="color:var(--ink-soft)">尚未填寫做法</li>`;
}

favBtn.addEventListener("click", () => {
  if (!current) return;
  toggleFavorite(current.id, !current.isFavorite).catch((err) => console.error(err));
});

deleteBtn.addEventListener("click", async () => {
  if (!current) return;
  if (!confirm(`確定要刪除「${current.title}」嗎?此動作無法復原。`)) return;
  try {
    await deleteRecipe(current.id);
    window.location.href = "dashboard.html";
  } catch (err) {
    alert("刪除失敗:" + err.message);
  }
});

if (!id) {
  titleEl.textContent = "缺少食譜 ID";
} else {
  subscribeRecipes((recipes) => {
    const recipe = recipes.find((r) => r.id === id);
    render(recipe);
  });
}