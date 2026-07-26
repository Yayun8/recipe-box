import { qs, setMode } from "./app.js";
import { subscribeRecipes, createRecipe, updateRecipe } from "./db.js";

const params = new URLSearchParams(window.location.search);
const editId = params.get("id");

const form = document.querySelector("#recipeForm");
const titleInput = document.querySelector("#titleInput");
const imageInput = document.querySelector("#imageInput");
const sourceUrlInput = document.querySelector("#sourceUrlInput");
const tagsInput = document.querySelector("#tagsInput");
const ingredientsTextarea = document.querySelector("#ingredientsTextarea");
const stepsTextarea = document.querySelector("#stepsTextarea");
const statusMsg = document.querySelector("#statusMsg");
const submitBtn = document.querySelector("#submitBtn");
const pageTitle = document.querySelector("#pageTitle");

function collectFormData() {
  const categoryChecked = document.querySelector('input[name="category"]:checked');
  const category = categoryChecked ? categoryChecked.value : "sweet";
  
  const tags = tagsInput.value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const steps = stepsTextarea.value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const ingredients = ingredientsTextarea.value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    title: titleInput.value.trim(),
    image: imageInput ? imageInput.value.trim() : "",
    sourceUrl: sourceUrlInput ? sourceUrlInput.value.trim() : "",
    category,
    tags,
    ingredients,
    steps,
  };
}

function fillForm(recipe) {
  pageTitle.textContent = "編輯食譜";
  submitBtn.textContent = "更新食譜";
  titleInput.value = recipe.title || "";
  if (imageInput) imageInput.value = recipe.image || "";
  if (sourceUrlInput) sourceUrlInput.value = recipe.sourceUrl || "";
  tagsInput.value = (recipe.tags || []).join(", ");
  
  const catInput = document.querySelector(`input[name="category"][value="${recipe.category}"]`);
  if (catInput) catInput.checked = true;
  setMode(recipe.category || "sweet");

  // 將陣列轉為換行的文字填入 textarea
  if (Array.isArray(recipe.ingredients)) {
    ingredientsTextarea.value = recipe.ingredients
      .map(ing => (typeof ing === 'object' ? `${ing.name || ''} ${ing.amount || ''} ${ing.unit || ''}`.trim() : ing))
      .join("\n");
  } else {
    ingredientsTextarea.value = recipe.ingredients || "";
  }

  stepsTextarea.value = (recipe.steps || []).join("\n");
}

if (editId) {
  const unsubscribe = subscribeRecipes((recipes) => {
    const recipe = recipes.find((r) => r.id === editId);
    if (recipe) {
      fillForm(recipe);
      unsubscribe();
    }
  });
}

// 監聽表單送出
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = collectFormData();
  if (!data.title) {
    statusMsg.textContent = "請填入食譜名稱";
    statusMsg.className = "status-msg is-error";
    return;
  }

  submitBtn.disabled = true;
  statusMsg.textContent = "儲存中…";
  statusMsg.className = "status-msg";

  try {
    if (editId) {
      await updateRecipe(editId, data);
      statusMsg.textContent = "已更新!正在返回…";
    } else {
      await createRecipe(data);
      statusMsg.textContent = "已新增!正在返回…";
    }
    statusMsg.className = "status-msg is-ok";
    setTimeout(() => (window.location.href = "dashboard.html"), 500);
  } catch (err) {
    statusMsg.textContent = "儲存失敗:" + err.message;
    statusMsg.className = "status-msg is-error";
    submitBtn.disabled = false;
  }
});