# WebMCP Tool 驗證案例

驗證基準：`docs/adapter-contract.md`。成功回傳只包含契約列出的欄位；失敗統一為
`{ok:false, code, message}`。以下案例可從 WebMCP DevTools panel 呼叫，或以 mock
`document.modelContext.registerTool()` 擷取 tool 後呼叫其 `execute()`。

## `get_inventory_status`

| 類型 | 輸入 | 預期輸出摘要 |
|---|---|---|
| 正常（全量） | `{}` | `totalTitles:5`、`totalQty:46`；`items` 5 筆，`lowStock` 2 筆 |
| 正常（篩選） | `{category:"文學"}` | `totalTitles:2`、`totalQty:14`；包含「夜行的鳥」與「地熱之屋」 |
| 邊界 | `{isbn:" 9786263106172 "}` | 去除輸入前後空白後精確比對，回傳 1 筆且 `status:"low"` |
| 錯誤 | `{isbn:123}` | `{ok:false, code:"BAD_INPUT", ...}` |
| 錯誤（未知 ISBN） | `{isbn:"0000000000000"}` | `{ok:false, code:"NOT_FOUND", ...}` |
| 錯誤（未知分類） | `{category:"歷史"}` | `{ok:false, code:"BAD_INPUT", ...}` |
| 空結果 | `{isbn:"9789573318301",category:"技術"}` | ISBN 存在但不符合分類，成功回傳 `totalTitles:0`、`totalQty:0`、兩個空陣列 |

欄位檢查：頂層僅 `totalTitles,totalQty,lowStock,items`；`lowStock` 項目僅
`title,isbn,shelf,qty,status`；`items` 項目僅
`title,isbn,category,shelf,qty,status`。

## `search_titles`

| 類型 | 輸入 | 預期輸出摘要 |
|---|---|---|
| 正常 | `{keyword:"夜行"}` | `count:1`，結果為「夜行的鳥」 |
| 正常（ISBN substring） | `{keyword:"626310",category:"科普"}` | `count:1`，結果為「雜訊」 |
| 邊界（前後空白） | `{keyword:"  劉梓潔  "}` | 關鍵字正規化後 `count:1` |
| 錯誤（空字串） | `{keyword:"   "}` | `{ok:false, code:"BAD_INPUT", ...}` |
| 錯誤（非字串） | `{keyword:42}` | `{ok:false, code:"BAD_INPUT", ...}` |
| 錯誤（未知分類） | `{keyword:"鳥",category:"歷史"}` | `{ok:false, code:"BAD_INPUT", ...}` |
| 空結果 | `{keyword:"不存在的書名"}` | `{count:0, results:[]}` |

結果項目欄位僅
`id,title,author,isbn,price,category,shelf,qty,status`。

## `get_low_stock_report`

| 類型 | 輸入／前置條件 | 預期輸出摘要 |
|---|---|---|
| 正常 | `{}` | `count:2`；「雜訊」為 `low`、「地熱之屋」為 `out`；`suggestedAction:"reorder"` |
| 邊界（臨界值） | 隔離資料分別設 `qty` 為 0、4、5 | 狀態依序為 `out`、`low`、`ok`，只有前兩筆進入報告 |
| 錯誤（多餘輸入） | `{extra:true}` | `{ok:false, code:"BAD_INPUT", ...}` |
| 錯誤（資料缺欄） | 隔離資料移除任一 `stock.shelf` | `{ok:false, code:"INTERNAL", ...}`，不向 runtime throw |
| 空結果 | 隔離資料將所有 `qty` 設為 5 以上 | `count:0`、`items:[]`，`suggestedAction` 仍固定為 `"reorder"` |

欄位檢查：頂層僅 `generatedAt,count,items,suggestedAction`；`generatedAt` 為 ISO 8601
字串；項目僅 `title,isbn,shelf,qty,status`。

## 已執行的自動檢查

2026-10-07 使用 Node.js `vm` 建立隔離的 `window.DB` 與
`document.modelContext.registerTool()` mock，確認：

- `DOMContentLoaded` 前不註冊，事件後恰好註冊三個 read-only tools。
- 全量庫存為 5 種、46 本，低庫存報告為 2 筆。
- 三個狀態、成功輸出欄位與固定 `suggestedAction:"reorder"` 符合契約。
- 空 keyword、非字串、未知分類、多餘欄位、未知 ISBN 與 DB 缺欄皆回傳正確錯誤碼。

結果：`PASS`。另以 `node --check site/webmcp.js` 完成語法檢查。
