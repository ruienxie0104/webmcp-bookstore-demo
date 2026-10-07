# WebMCP Bookstore Demo — 青鳥書庫

以「書店庫存管理」為場景的 WebMCP 展示網站：一個純前端 SPA，透過 `document.modelContext.registerTool()` 把網站資料開放給 AI agent 查詢。

> 本專案為獨立自製 demo，所有書目/庫存/訂單資料皆為虛構。

## 是什麼

- `site/index.html` — 單檔 SPA（無後端、無 build 工具）：庫存總覽 / 訂單 / 書目資料三頁，資料模擬在 `window.DB`
- `site/webmcp.js` — WebMCP adapter：註冊三個 read-only tools，讓 agent 直接查詢頁面資料
- `docs/adapter-contract.md` — adapter 設計契約（註冊方式、schema、硬規則）
- `docs/WORK-ORDER.md` — 實作工作單（美化 + 邏輯強化 + 驗證文件的分域規則）
- `docs/validation.md` / `validation/smoke-test.md` — tool 測試案例與人工驗證步驟

## WebMCP Tools（v1，全部 read-only）

| Tool | 用途 |
|---|---|
| `get_inventory_status` | 查庫存（可依 ISBN / 分類過濾），附偏低/缺書狀態 |
| `search_titles` | 書名/作者/ISBN 關鍵字搜尋 |
| `get_low_stock_report` | 低庫存報告 + 補貨建議 |

設計原則：

- **資料單一來源**：tool 不內嵌資料副本，一律讀 `window.DB`，保證「頁面顯示 = agent 查到」
- **結構化錯誤**：`{ok:false, code, message}`，不 throw 給 runtime
- **read-only 優先**：v1 不註冊任何寫入操作

## 方法論

1. **探索** — 盤點網站既有資料域與功能邊界
2. **工具設計** — 從「agent 需要什麼」反推 tool 清單與 schema（而非把 API 全部暴露）
3. **契約先寫** — 規格（`docs/adapter-contract.md`）先於實作，多 agent 分域協作（前端/邏輯/驗收各有禁區）
4. **驗證** — 註冊檢查（DevTools WebMCP panel）+ 案例測試（`docs/validation.md`）+ smoke 測試

## 本機執行

```bash
# 任一靜態伺服器
python3 -m http.server -d site 8080
# 開 http://localhost:8080
```

WebMCP 需在支援的 secure context 環境才會註冊成功；不支援時 adapter 自動 idle，網站 SPA 行為不受影響。