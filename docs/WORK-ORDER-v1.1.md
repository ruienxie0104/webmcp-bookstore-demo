# 工作單 v1.1：Agent Console（讓 GitHub Pages 訪客看見 WebMCP）

你是這個 repo 的實作 agent。**輸出前會由 reviewer 依本單逐項驗收。**

## 背景

`site`（現為 `docs/`，GitHub Pages 源）是一個 WebMCP demo：`webmcp.js` 用 `document.modelContext.registerTool()` 註冊三個 read-only tools。**問題**：一般瀏覽器不支援原生 API → adapter idle → 訪客在 GitHub Pages 上完全看不到 WebMCP 效果。

先讀：`docs/adapter-contract.md`（含 v1.1 增補段）+ 現有 `docs/webmcp.js` + `docs/index.html`。

## 任務：實作 Agent Console

### webmcp.js（依契約 v1.1）

1. 三個 tools 的**定義抽成單一來源**（name/description/inputSchema/execute 集中一份）
2. 原生 `document.modelContext?.registerTool` 存在 → 逐一真註冊（`supported: true`）
3. 不存在 → `supported: false`；**絕不偽造 document.modelContext**
4. 兩種情況都掛 `window.WEBMCP_DEMO = { supported, tools, metadata: {spec: "WebMCP Draft Community Group Report", mode: "page-side registerTool"} }`
5. execute 語義不變（輸出欄位、錯誤碼 BAD_INPUT/NOT_FOUND/INTERNAL 都不動）

### index.html 增加一個「Agent Console」面板（第四籤或浮動按鈕展開皆可，你設計）

- 標題區顯示偵測狀態徽章：`原生支援`（綠）或 `模擬模式`（橘）＋一行說明文字
-列出三個 tool（名稱 + description + inputSchema 摘要）
- 點任一 tool → 顯示參數輸入 UI（照 inputSchema 動態生成；enum 用下拉、required 標示）+ 「執行」按鈕
- 執行 → 呼叫 `WEBMCP_DEMO.tools[].execute(...)` → **JSON 回應 pretty-print 呈現**（深色 code 區塊 + 語法高亮可有可無）
- 每次呼叫保留**呼叫歷史**（最近 5 筆，時間戳 + 參數摘要）
- 預填幾個範例按鈕：`get_inventory_status({})`、`search_titles({keyword:"夜行"})`、`search_titles({keyword:" ",})`（壞輸入示範 BAD_INPUT）、`get_low_stock_report({})`

### 視覺

- 跟現有深青綠書店風一致；Console 面板要像開發者工具的質感（monospace JSON、徽章）
- 響應式：窄屏不破版

## 絕對禁止（契約硬規則）

1. 不動 `window.DB` 資料內容
2. 不動 `go()`/`pages`/`pushState`/`popstate` 路由
3. 不動 computeStatus 等狀態計算
4. 不引入 backend/build 工具/外部 JS framework（vanilla only）
5. 不偽造 `document.modelContext`
6. tool 輸出欄位與 `docs/validation.md` 中記錄的案例保持一致（若你強化邏輯導致欄位變化，同步更新 docs/validation.md）

## 驗收標準（reviewer 逐項檢查）

- [ ] `WEBMCP_DEMO` 兩種模式都正確暴露
- [ ] Console 面板在任何瀏覽器都能操作三個 tool 並看到 JSON 回應（含錯誤案例）
- [ ] 原生支援路徑仍走 registerTool（契約 v1 不變）
- [ ] 資料域/路由/狀態計算零變動
- [ ] 呼叫歷史 + 範例按鈕齊全

## 完成後

不要 commit。輸出總結：改動檔案、Console 設計、新增的互動細節。