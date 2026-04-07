# 📋 材料點算系統 — Notion 雙向同步版

將你的 Notion 材料清單與網頁點算系統雙向連動，任一邊修改都會同步。

---

## 🏗️ 架構說明

```
前端 HTML（Vercel Static）
    ↕ API 呼叫
後端 Serverless API（Vercel Functions）
    ↕ Notion API
Notion 資料庫
```

- **前端 → Notion**：修改數量、勾選、新增品項時，即時寫入 Notion
- **Notion → 前端**：每 60 秒自動拉取 + 手動同步按鈕

---

## 🚀 部署步驟（10 分鐘搞定）

### Step 1：Notion 設定

#### 1-1. 建立 Integration

1. 前往 [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. 點「+ New integration」
3. 命名為「材料點算系統」
4. 權限選「Read content」+「Update content」+「Insert content」
5. 複製 `Internal Integration Secret`（以 `secret_` 開頭）

#### 1-2. 連接資料庫

你的 Notion 資料庫需要加入以下欄位（如果還沒有的話）：

| 欄位名稱 | 類型 | 說明 |
|---------|------|------|
| NAME | Title | 編號（原本就有）|
| 名稱 | Rich Text | 品項名稱（原本就有）|
| 種類 | Select | 類別（原本就有）|
| 缺貨處理方式 | Select | 叫貨/南灣/更換（原本就有）|
| 備註 | Rich Text | 備註（原本就有）|
| **現有數量** | **Number** | ⬅️ 新增此欄位 |
| **最低庫存** | **Number** | ⬅️ 新增此欄位 |
| **已點算** | **Checkbox** | ⬅️ 新增此欄位 |

然後在每個資料庫頁面：
1. 點右上角「⋯」→「Connections」
2. 搜尋並加入你剛建立的「材料點算系統」integration

#### 1-3. 取得 Database ID

打開每個 Notion 資料庫，從 URL 複製 Database ID：

```
https://www.notion.so/你的workspace/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...
                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                    這段 32 字元就是 Database ID
```

如果你的 4 個清單分別是不同的 Notion 資料庫，你需要 4 個 ID。  
如果是同一個資料庫用 View 篩選的，那 4 個都填同一個 ID。

---

### Step 2：推上 GitHub

```bash
cd notion-inventory
git init
git add .
git commit -m "init: 材料點算系統"
git remote add origin https://github.com/你的帳號/notion-inventory.git
git push -u origin main
```

---

### Step 3：部署到 Vercel

1. 前往 [vercel.com](https://vercel.com)，用 GitHub 帳號登入
2. 點「Add New Project」→ 選擇 `notion-inventory` repo
3. 在「Environment Variables」加入以下變數：

| Key | Value |
|-----|-------|
| `NOTION_TOKEN` | `secret_xxxxxxx...`（Step 1-1 的 token）|
| `NOTION_DB_MATERIAL` | 材料資料庫的 Database ID |
| `NOTION_DB_CRAFT` | 代工/植物/動物資料庫的 Database ID |
| `NOTION_DB_CONSUMABLE` | 耗材資料庫的 Database ID |
| `NOTION_DB_PALLET` | 棧板材料/自黏袋資料庫的 Database ID |

4. 點「Deploy」
5. 完成！你會得到一個 `https://xxx.vercel.app` 的網址

---

## 📱 使用方式

- 打開 Vercel 給你的網址，就是首頁
- 選擇要點算的清單類別
- 修改數量、勾選、新增品項都會**即時同步到 Notion**
- 點「同步」按鈕可以手動從 Notion 拉取最新資料
- 頁面每 60 秒自動重新拉取一次
- 在 Notion 端修改的內容，最多 60 秒後或手動點同步就會更新

---

## 🔧 常見問題

**Q: 4 個清單是同一個 Notion 資料庫還是不同的？**  
A: 看你的 Notion 架構。如果是用同一個資料庫搭配不同 View，那 4 個環境變數填同一個 ID 就行。API 會依據「種類」欄位自動篩選。

**Q: 為什麼我在 Notion 改了但網頁沒更新？**  
A: 等 60 秒自動更新，或點右上角的「同步」按鈕手動拉取。

**Q: 重置會影響 Notion 嗎？**  
A: 會。重置會將 Notion 裡所有品項的「現有數量」歸零、「已點算」取消勾選。最低庫存和備註不受影響。

**Q: 可以在手機上用嗎？**  
A: 可以，介面是響應式設計，手機瀏覽器直接打開就能用。

---

## 📁 檔案結構

```
notion-inventory/
├── api/
│   ├── _lib/
│   │   └── notion.js      # Notion client 共用模組
│   ├── items.js            # GET  /api/items?list=xxx
│   ├── update.js           # PATCH /api/update
│   ├── create.js           # POST  /api/create
│   └── reset.js            # POST  /api/reset
├── public/
│   ├── index.html          # 首頁（清單選擇）
│   ├── 材料.html
│   ├── 代工_植物_動物.html
│   ├── 耗材.html
│   └── 棧板材料_自黏袋.html
├── .env.example
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```
