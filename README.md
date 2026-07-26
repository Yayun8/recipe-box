# 食譜箱 RecipeBox

甜食 / 鹹食切換的個人食譜庫。前端純 HTML/CSS/JS,資料庫用 Firebase Firestore,離線時讀 IndexedDB 本機快取。

## 檔案結構

```
recipe-app/
├─ index.html          首頁:甜/鹹模式切換、搜尋、標籤過濾、隨機推薦
├─ detail.html          食譜詳細頁
├─ dashboard.html        我的食譜庫(管理、篩選、收藏)
├─ edit_recipe.html      新增 / 編輯食譜表單
├─ css/style.css        共用設計系統(色彩、字體、元件樣式)
└─ js/
   ├─ firebase-config.js  ← 你要填自己的 Firebase 設定
   ├─ db.js               Firestore 讀寫 + IndexedDB 快取
   ├─ app.js              共用前端邏輯(模式切換、渲染、過濾)
   ├─ index.js
   ├─ detail.js
   ├─ dashboard.js
   └─ edit_recipe.js
```

## 上手步驟

### 1. 建立 Firebase 專案

1. 到 [Firebase 主控台](https://console.firebase.google.com/) 建立新專案。
2. 在「建構」→「Firestore Database」建立資料庫(選「測試模式」先方便開發)。
3. 到「專案設定」→「一般」→ 新增一個「網頁應用程式」,複製產生的設定物件。

### 2. 填入設定

打開 `js/firebase-config.js`,把 `firebaseConfig` 裡的值換成你自己專案的:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

### 3. 設定 Firestore 安全規則

測試模式的規則有到期日,正式使用前建議至少改成這樣(先不做登入驗證,單純允許讀寫):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /recipes/{recipeId} {
      allow read, write: if true; // 之後要加驗證,可換成 request.auth != null
    }
  }
}
```

> 之後如果要開放給多人使用又不想互相看到彼此的食譜,需要加 Firebase Authentication,並在規則加上 `request.auth.uid == resource.data.ownerId` 這類判斷,資料也要多存一個 `ownerId` 欄位。目前版本沒有做登入,所有人共用同一份食譜庫。

### 4. 本機啟動

因為用了 ES module (`type="module"`) 和 Firestore SDK,**不能直接用瀏覽器開啟 file:// 路徑**,要用一個簡單的本機伺服器,例如:

```bash
cd recipe-app
python3 -m http.server 8000
# 或用 VS Code 的 Live Server 套件
```

然後打開 `http://localhost:8000/index.html`。

### 5. 資料結構(Firestore `recipes` collection)

每份文件大致長這樣:

```json
{
  "title": "蜂蜜檸檬瑪德蓮",
  "category": "sweet",           // "sweet" 或 "savory"
  "tags": ["烘焙", "早餐"],
  "ingredients": [
    { "name": "低筋麵粉", "amount": "100", "unit": "g" }
  ],
  "steps": ["融化黃油放涼", "混合乾濕材料", "冷藏 30 分鐘後烘烤"],
  "isFavorite": false,
  "createdAt": "<serverTimestamp>",
  "updatedAt": "<serverTimestamp>"
}
```

### 6. 之後可能要注意的地方

- 如果之後想「甜食/鹹食 + 特定標籤」同時查詢並排序,Firestore 對複合查詢需要建立**複合索引**(第一次跑到相關查詢時,瀏覽器 console 會直接跳出一個連結,點進去一鍵建立即可)。
- 目前是把整個 `recipes` collection 都監聽下來,食譜量若成長到幾百筆以上,可以改成分頁或依模式分開查詢,減少讀取量與費用。
- 圖片目前沒有做上傳,若要加封面照片,建議用 Firebase Storage 存圖、Firestore 只存圖片網址。

## 設計說明

視覺概念是「食譜箱裡的分隔卡片」:首頁的甜/鹹切換做成兩個交疊的分隔頁籤,食譜卡片本身模擬索引卡,右上角用小色塊標示分類。字體搭配 Fraunces(標題,帶手寫感的襯線)+ Work Sans(內文)+ JetBrains Mono(標籤與資料型文字)。
