# 人工 Smoke Test

## 啟動

WebMCP 只在 secure context 且瀏覽器提供 `document.modelContext.registerTool()` 時啟用。
建議以支援 WebMCP 的瀏覽器開啟本機 HTTPS 開發站；若該瀏覽器將 localhost 視為
secure context，也可在 repo 根目錄執行 `python3 -m http.server 8000`，再開啟
`http://localhost:8000/site/`。不要只以不受支援的瀏覽器判定 adapter 失敗。

## 驗證步驟

1. 開啟 `site/index.html` 對應頁面，確認頁首為深青綠 Hero、紙色背景，字型載入後標題與內文層次清楚。
2. 開啟 DevTools Console；在支援 WebMCP 的 secure context 中應只看到一次：
   `[webmcp] registered: get_inventory_status, search_titles, get_low_stock_report`。
   若環境不支援，應看到 adapter idle 訊息且一般 SPA 仍可使用。
3. 依序點擊「庫存總覽／訂單／書目資料」。確認網址 hash 改變、active 頁籤同步切換，三張表皆正常渲染。
4. 在庫存總覽確認三張統計卡為「5 種／46 本／2 項」，表格有 5 筆；「雜訊」顯示偏低，「地熱之屋」顯示缺書，其餘顯示充足。
5. 在訂單頁確認 K-201 為待出貨、K-202 為已出；右下角待出貨浮標保持可見。
6. 在書目資料頁確認 5 筆資料的書名、作者、ISBN、定價、分類與書架完整顯示。
7. 將 viewport 縮至 375px：Hero 與統計卡不重疊、頁籤可用、表格可水平捲動，右下浮標不遮住主要操作。
8. 使用鍵盤 Tab 聚焦三個頁籤，確認有清楚的 focus ring；以滑鼠 hover 頁籤與表格列，確認高亮狀態可見。
9. 重新載入帶有 `#orders`、`#titles` 的網址並使用瀏覽器上一頁／下一頁，確認頁面仍可切換且 Console 沒有例外。

## Tool 快查

若 DevTools WebMCP panel 支援直接呼叫，至少執行：

- `get_inventory_status({})`：應為 5 種、46 本，且 lowStock 2 筆。
- `search_titles({keyword:"夜行"})`：應找到「夜行的鳥」。
- `search_titles({keyword:" "})`：應回傳 `BAD_INPUT`。
- `get_low_stock_report({})`：應有 2 筆且 `suggestedAction` 為 `reorder`。

完整案例與欄位清單見 `docs/validation.md`。
