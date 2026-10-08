# WebMCP Adapter 設計契約（site/webmcp.js）

本文件定義 `webmcp.js` 的設計契約。實作（Codex）與美化（Gemini）都以本文件為準。

## 註冊方式（規格正確性）— 不得更改

- 使用 `document.modelContext.registerTool()`（WebMCP Draft Community Group Report 的頁面 API）。
- 只在 secure context 生效；需要 feature-detect：`typeof document.modelContext?.registerTool === "function"`。
- Tool 的 metadata：`name`、`description`、`inputSchema`（JSON Schema）、`readOnlyHint: true`（查詢類）。
- **不發明**統一的 `executeTool()` API；不使用 `RegisteredTool.execute`（spec 不暴露）。
- 頁面載入時註冊；SPA 路由變更不重新註冊（tools 是全域查詢，不綁路由）。

## Tool 清單（v1 — 全部 read-only）

### 1. `get_inventory_status`
- 輸入：`{ isbn?: string, category?: string }`（兩者皆可選；皆空 = 全量）
- 輸出：`{ totalTitles, totalQty, lowStock: [{title, isbn, shelf, qty, status}] , items: [{title, isbn, category, shelf, qty, status}] }`
- `status` 計算：`qty<=0 → "out"`；`qty<5 → "low"`；否則 `"ok"`

### 2. `search_titles`
- 輸入：`{ keyword: string, category?: "文學"|"科普"|"技術"|"兒童" }`
- 行為：keyword 大小寫不敏感的 substring 比對（title / author / isbn）
- 輸出：`{ count, results: [{id, title, author, isbn, price, category, shelf, qty, status}] }`

### 3. `get_low_stock_report`
- 輸入：`{}`
- 輸出：`{ generatedAt, count, items: [{title, isbn, shelf, qty, status}], suggestedAction: "reorder" }`

## 不得做的事（硬規則）

- 不註冊 action tool（下訂/出貨/刪除）— v1 只查詢
- 不暴露 DB 原始結構以外的新業務規則（例如不虛構會員系統）
- 資料來源 = `index.html` 內的 `DB` 模擬資料域；webmcp.js **不內嵌資料副本**（讀同一個 `DB`，避免雙源不一致）
- 出錯時回傳 `{ok:false, code, message}` 結構化錯誤，不 throw 給 runtime

## 註冊時機與驗證

- `DOMContentLoaded` 後註冊，`console.info` 一行列出已註冊的工具名稱（方便 DevTools WebMCP panel 檢查）
- 欄位語彙與 UI 一致（書名/ISBN/書架/庫存），agent 查網頁 vs 查 tool 結果應一致

## 給 Gemini（美化）的邊界

- 只動 `site/index.html` 的 `<style>`、HTML 結構、視覺（可引入 webfont/CDN 套件）
- **不得動**：`<script>` 內的 DB 資料域、路由邏輯、狀態計算（shelfStatus）、以及對 webmcp.js 的掛載點
- `webmcp.js` 是後端域檔案：Gemini 不碰
## v1.1 增補：Agent Console（模擬面板）

背景：一般瀏覽器不支援原生 `document.modelContext`，訪客看不到 WebMCP 效果。
規定：

- `webmcp.js` 若偵測到原生 API → 照原契約註冊（真路徑）
- 若偵測不到 → **不得偽造 `document.modelContext`**（避免誤導其他腳本），改暴露 `window.WEBMCP_DEMO = { supported: false, tools: [...] }`
- 兩種情況都統一暴露 `window.WEBMCP_DEMO = { supported: boolean, tools: [{name, description, inputSchema, execute}] }`，作為頁面 UI 的單一介面
- tool 的 execute 邏輯、schema、結構化錯誤**語義完全不變**（輸出欄位與 v1 契約一致）
- 頁面 UI（Agent Console）呼叫 tools 一律走 `WEBMCP_DEMO.tools[].execute`，與原生註冊共用同一份定義
- Console 必須標示偵測結果（原生支援/模擬模式），不得令訪客誤會模擬為真
