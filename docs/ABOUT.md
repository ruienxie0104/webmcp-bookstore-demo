# 專案完整介紹 — 把網站資料變成 AI Agent 可查詢的介面

> 一分鐘版本：這是一個純前端書店庫存管理網站，透過 **WebMCP** 規格（`document.modelContext.registerTool()`）把自己的資料註冊成三個 AI agent 可查詢的工具。訪客在 Agent Console 面板可以直接看到工具註冊、呼叫工具、得到 JSON 回應——即使瀏覽器還沒支援原生 WebMCP API。

---

## 1. 問題背景：AI Agent 與網站之間的落差

現代的 AI agent（Claude、ChatGPT 等具備瀏覽能力的 agent）看網站的方式，本質上是「讀 HTML 再自己猜」：

- **脆弱**：改一個 class 名，agent 的理解就可能失效
- **模糊**：表格裡的數字代表什麼？庫存還是銷量？agent 只能猜
- **浪費**：每次都重新解析整個 DOM，token 消耗大、延遲高

**WebMCP**（W3C Web Machine Communication Protocol 草案，Draft Community Group Report）就是針對這件事的標準解法：網站主動把自己「想讓 agent 用什麼」註冊出來——宣告工具名稱、參數 schema、行為說明，agent 直接呼叫得到結構化結果，不用再讀 DOM 猜語義。

這個 demo 展示的就是：**一個普通網站，如何升級成 agent 可信賴的查詢介面**。

---

## 2. 這個網站本身

場景：書店庫存管理（書庫示範系統）（書目/庫存/訂單），純前端單檔 SPA：

- 無後端、無 build 工具：`index.html`（UI + 路由 + 模擬資料域 `window.DB`）+ `webmcp.js`（WebMCP adapter）+ `agent-console.js`（Agent Console 面板）
- 資料為虛構（5 本書、5 筆庫存、2 筆訂單），狀態徽章（充足/偏低/缺書）即時計算
- **刻意做成真 SPA**（hash routing + pushState/popstate）——SPA 的 stale-context 問題正是網站級 agent 整合的核心挑戰，這個站保留真實行為

---

## 3. WebMCP 整合的核心設計

### 3.1 三個 read-only tools

| Tool | 用途 | 特點 |
|---|---|---|
| `get_inventory_status` | 查庫存（可過濾 ISBN/分類） | 附偏低/缺書狀態，低庫存清單 |
| `search_titles` | 書名/作者/ISBN 關鍵字搜尋 | 大小寫不敏感 substring，可分類過濾 |
| `get_low_stock_report` | 低庫存報告 | 附補貨建議（`reorder`） |

**為什麼只做 read-only？** v1 聚焦「資料可及性」：讓 agent 能可靠地查，先不碰操作面。寫入操作需要交易語義與 UI 確認流程（是 v2 的自然延伸，不是本次重點）。

### 3.2 資料單一來源（Single Source of Truth）

`webmcp.js` **不內嵌任何資料副本**，一律讀頁面的 `window.DB`。這保證：

> 頁面顯示的 = agent 查到的。兩者永遠一致，不會出現「畫面說缺書、tool 說有貨」的分裂。

這條規則寫在 `docs/adapter-contract.md` 契約裡，任何修改都要遵守。

### 3.3 結構化錯誤

所有錯誤統一回 `{ok:false, code, message}`（`BAD_INPUT` / `NOT_FOUND` / `INTERNAL`），不 throw 給 runtime。Agent 拿到的是可判斷、可重試的語義化結果，不是堆疊追蹤。

### 3.4 契約先行（Contract-First）

實作前先寫 `docs/adapter-contract.md`：註冊方式、每個 tool 的輸入輸出欄位、硬規則（禁區清單）、驗收標準全部事先定義。改動規格先改契約再動程式碼。

### 3.5 原生/模擬雙模式（v1.1）

WebMCP 目前是草案階段，不是每個瀏覽器都有原生 `document.modelContext`。adapter 的處理：

- **原生支援** → 標準路徑 `registerTool()` 真註冊
- **不支援** → 同一份 tool 定義暴露為 `window.WEBMCP_DEMO`，供頁面展示
- **絕不偽造 `document.modelContext`**（不誤導其他腳本與 agent）
- 兩條路徑共用單一定義，行為語義完全一致

---

## 4. Agent Console：讓訪客看得見 WebMCP

GitHub Pages 上任何瀏覽器打開，都能在 Agent Console 面板：

1. 看到 WebMCP 偵測狀態徽章（`原生支援` / `模擬模式`）
2. 瀏覽三個 tool 的名稱、說明、schema 摘要
3. 點任一範例按鈕（9 個、參數全對齊真實資料）→ 呼叫 tool → **即時看到 JSON 回應**
4. 看錯誤處理：不存在的 ISBN（`NOT_FOUND`）、空關鍵字（`BAD_INPUT`）都有當場示範
5. 呼叫歷史保留最近 5 筆

面板由 `docs/agent-console.js` 驅動：schema-driven UI（enum 自動生成下拉、required 標示必填），工具新增不用改面板程式碼。

---

## 5. 驗證方法論

三層驗證，全部有文件：

1. **契約檢查**（`docs/adapter-contract.md`）：註冊方式、schema 欄位、錯誤結構逐項比對
2. **案例測試**（`docs/validation.md`）：每個 tool 至少 4 案例（正常/邊界/錯誤/空結果），含預期輸出
3. **人工煙霧測試**（`validation/smoke-test.md`）：9 步驟涵蓋頁籤切換、徽章渲染、響應式、focus ring、瀏覽器前進後退

---

## 6. 多 Agent 協作的開發流程

本專案的開發過程本身也是一次 multi-agent 工程實踐：

- **規格與契約**：人類主導設計（tool 清單、禁區、schema）
- **Codex 實作**：前端美化 + adapter 邏輯強化 + 驗證文件，按工作單（`docs/WORK-ORDER.md` / `WORK-ORDER-v1.1.md`）分域執行
- **獨立 Review**：每輪交付由 reviewer 逐項驗收（DB 資料 zero-diff、路由零變動、契約逐條檢查），通過才 commit
- **分域規則**：每個 agent 只准動自己工單範圍內的檔案，視覺/邏輯/資料三層互不越界

工作單與契約都存在 repo 內——**審閱者可以直接看到這套流程的原始紀錄**（接案時怎麼發包、怎麼驗收）。

---

## 7. 檔案地圖

```
webmcp-bookstore-demo/
├── README.md                  # 專案說明 + 方法論
├── docs/
│   ├── ABOUT.md               # 本文件（完整介紹）
│   ├── adapter-contract.md    # WebMCP adapter 設計契約（規格源頭）
│   ├── WORK-ORDER.md          # 實作工單（美化+邏輯強化）
│   ├── WORK-ORDER-v1.1.md     # Agent Console 工單
│   ├── validation.md          # Tool 驗證案例
│   ├── index.html             # 網站本體（SPA + 資料域）
│   ├── webmcp.js              # WebMCP adapter（雙模式）
│   └── agent-console.js       # Agent Console 面板
└── validation/
    └── smoke-test.md          # 人工煙霧測試步驟
```

---

## 8. 面試常見問題（FAQ）

**Q: 為什麼不用 MCP server（stdio/SSE）就好？**
WebMCP 的定位不同：它是**網站自己的能力**，瀏覽器內原生註冊——不需要使用者裝 server 設定檔，任何 agent 相容環境打開網站就有工具。這正是「讓一般網站升級成 agent 介面」的意義。

**Q: SPA 路由切換會不會讓 tool 失效？**
tools 是全域查詢介面（註冊一次、不綁路由），讀的是單一資料域，所以路由切換不影響。反過來說，如果要暴露的是「畫面上此刻顯示什麼」這種 UI state，就必須處理 stale-context——這是 WebMCP 整合的真實挑戰，契約裡把 tools 設計成資料查詢而非畫面快取，就是為了避開這個坑。

**Q: 為什麼錯誤要結構化而不是 throw？**
Agent 收到 throw 只能無差別重試或放棄；收到 `{ok:false, code, message}` 可以判斷「參數錯了要改」（`BAD_INPUT`）還是「查無此物換策略」（`NOT_FOUND`）。這是 agent 消費者的一等公民設計。

**Q: 下一步會做什麼？**
- action tool + UI 確認流程（agent 引發的寫入如何讓使用者知情並確認）
- spec 追蹤：WebMCP 草案仍在演進（Draft Community Group Report），規格變更會反映到契約與實作