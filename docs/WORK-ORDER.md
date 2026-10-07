# 工作單：WebMCP 書店 Demo — 美化 + 後端邏輯強化

你是這個 repo 的全責實作 agent。**最終輸出前會由另一位 reviewer 依本單逐項驗收，任何一項不符合就要返工。**

## 背景

這是一個 WebMCP 展示用 demo（求職作品集的一部分）：純前端書店庫存管理 SPA + WebMCP adapter，讓 AI agent 能透過 `document.modelContext.registerTool()` 查詢網站資料。**沒有後端、沒有 build 工具**——只有 `site/index.html`（單檔 SPA）+ `site/webmcp.js`（adapter）。

- 設計契約：`docs/adapter-contract.md`（先讀這個）
- 目前狀態：骨架已能運作（commit b016b8d），三個 read-only tools 已註冊

## 任務 1：前端視覺美化（site/index.html）

整體視覺重做，目標「一看像正式產品頁，不是練習作業」：

- 暖色書店風（推薦方向：紙感底色 + 墨色文字 + 木質/青鳥綠點綴；深色系也可，選一個貫徹）
- Google Fonts CDN（中文 webfont，如 Noto Serif TC 標題 + Noto Sans TC 內文）
- Hero/頁首區有設計感；表格層次分明（斑馬紋或 hover 高亮）、狀態徽章精修、卡片陰影與圓角節奏
- 響應式（窄屏不破版）、hover/focus 狀態完整
- 三個頁籤（庫存總覽/訂單/書目資料）都要在美化後正常切換

**絕對禁止（契約硬規則）：**
1. 不得改動 `window.DB` 資料內容（書名/ISBN/庫存量/訂單資料一個字都不能動）
2. 不得改動路由邏輯（`go()`/`pages`/`pushState`/`popstate`）
3. 不得改動狀態計算（`computeStatus`/`shelfStatus`/`LOW_T`）
4. 不得動或刪除 `<script src="./webmcp.js"></script>` 掛載
5. 維持單檔架構：不引入 backend、framework、build 工具（CDN 的 font/CSS 可）

## 任務 2：webmcp.js 後端邏輯強化（site/webmcp.js）

在**不違反** `docs/adapter-contract.md` 契約的前提下強化實作（契約本身是規格，不能改，只能照做）：

- 邊界案例處理：空 keyword、非字串輸入、未知 ISBN/分類、DB 結構缺欄位的防禦
- `get_inventory_status` 與 `get_low_stock_report` 的輸出欄位要與契約完全一致（再核對一次 docs/adapter-contract.md 的欄位清單）
- 保留結構化錯誤 `{ok:false, code, message}` 風格；錯誤碼語義化（BAD_INPUT / NOT_FOUND / INTERNAL）
- 保持「不內嵌資料副本」規則：資料一律讀 `window.DB`
- 新增 `docs/validation.md`：記錄你對三個 tools 的測試案例（每個 tool 至少 4 案例：正常/邊界/錯誤/空結果），含預期輸出摘要

## 任務 3：驗證

- 寫一個 `validation/smoke-test.md`：列出「如何人工驗證」步驟（開 index.html → DevTools console 看三個 tool 註冊訊息 → 三頁籤切換 → 表格/徽章渲染）
- 若環境允許，用 node 對 webmcp.js 的純函式（computeStatus 等）做基本邏輯檢查；若不方便，在 validation.md 註明「人工驗證」

## 完成後

- 不要 git commit（reviewer 驗收後統一 commit）
- 最後輸出一段總結：你改了哪些檔案、美化方向、強化了哪些邊界案例