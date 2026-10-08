# WebMCP Bookstore Demo — 書庫示範系統

**[🌐 線上網站](https://ruienxie0104.github.io/webmcp-bookstore-demo/)** · 以「書店庫存管理」為場景的 WebMCP 展示網站：一個純前端 SPA，透過 `document.modelContext.registerTool()` 把網站資料開放給 AI agent 查詢，並內建 **Agent Console** 讓任何瀏覽器的訪客都能看到工具註冊、呼叫與 JSON 回應。

> 本專案為獨立自製 demo，所有書目/庫存/訂單資料皆為虛構。

## 快速導覽

| 想看什麼 | 去哪裡 |
|---|---|
| 完整介紹（問題背景/設計決策/FAQ） | [docs/ABOUT.md](docs/ABOUT.md) |
| WebMCP adapter 設計契約 | [docs/adapter-contract.md](docs/adapter-contract.md) |
| Tool 驗證案例 | [docs/validation.md](docs/validation.md) |
| 人工煙霧測試步驟 | [validation/smoke-test.md](validation/smoke-test.md) |
| 多 agent 發包紀錄（工作單） | [docs/WORK-ORDER.md](docs/WORK-ORDER.md) / [v1.1](docs/WORK-ORDER-v1.1.md) |

## WebMCP Tools（v1，全部 read-only）

| Tool | 用途 |
|---|---|
| `get_inventory_status` | 查庫存（可依 ISBN / 分類過濾），附偏低/缺書狀態 |
| `search_titles` | 書名/作者/ISBN 關鍵字搜尋 |
| `get_low_stock_report` | 低庫存報告 + 補貨建議 |

設計原則：

- **資料單一來源**：tool 不內嵌資料副本，一律讀 `window.DB`，保證「頁面顯示 = agent 查到」
- **結構化錯誤**：`{ok:false, code, message}`（BAD_INPUT/NOT_FOUND/INTERNAL），不 throw 給 runtime
- **read-only 優先**：v1 不註冊任何寫入操作
- **原生/模擬雙模式**：標準 `registerTool()` 路徑 + 非支援環境的 `WEBMCP_DEMO` 展示路徑，共用單一定義、語義一致、不偽造原生 API

## 方法論

1. **探索** — 盤點網站既有資料域與功能邊界
2. **工具設計** — 從「agent 需要什麼」反推 tool 清單與 schema（而非把 API 全部暴露）
3. **契約先寫** — 規格（`docs/adapter-contract.md`）先於實作
4. **分域發包** — 多 agent 協作（前端/邏輯/驗收各有禁區），工作單明列驗收標準
5. **逐項驗收** — DB zero-diff、路由零變動、契約逐條檢查，全過才 commit
6. **三層驗證** — 契約檢查 + 案例測試 + 人工煙霧測試

## 本機執行

```bash
# 任一靜態伺服器
python3 -m http.server 8080 --directory docs
# 開 http://localhost:8080
```

WebMCP 需在支援的 secure context 環境才會原生註冊；不支援時 adapter 自動走模擬模式（Agent Console 仍完整可用），網站 SPA 行為不受影響。

## 技術棧

Vanilla JavaScript · Google Fonts · GitHub Pages · WebMCP Draft Community Group Report（`document.modelContext.registerTool()`）