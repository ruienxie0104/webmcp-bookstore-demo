/**
 * webmcp.js — Bookstore WebMCP Adapter
 *
 * 依 docs/adapter-contract.md 契約實作：
 * - document.modelContext.registerTool() 註冊（僅 secure context）
 * - v1 只註冊 read-only 查詢 tools
 * - 資料來源 = index.html 的 DB（不內嵌副本）
 * - 結構化錯誤回傳 {ok:false, code, message}，不 throw
 *
 * 實作：Codex / 契約：Rosia
 */
(function () {
  "use strict";

  // ---------- feature detection ----------
  const mc = typeof document !== "undefined" ? document.modelContext : undefined;
  if (!mc || typeof mc.registerTool !== "function") {
    console.info("[webmcp] modelContext.registerTool not available — adapter idle");
    return;
  }

  // ---------- helpers（讀頁面資料域，建立本地引用供查詢）----------
  // 註：契約規定不內嵌資料副本。此處僅取引用；DB 由 index.html 定義。
  const DB = typeof window.DB !== "undefined"
    ? window.DB
    : (window.DB_REF = window.DB_REF || null, window.DB);

  if (!DB) {
    console.error("[webmcp] DB data domain not found — see docs/adapter-contract.md (data must live in index.html)");
    return;
  }

  // status 計算：qty<=0 → out；<5 → low；否則 ok（與 UI 徽章同邏輯）
  function computeStatus(qty, lowThreshold) {
    if (qty <= 0) return "out";
    if (qty < lowThreshold) return "low";
    return "ok";
  }

  function structErr(code, message) {
    return { ok: false, code, message };
  }

  // ---------- tool 1: get_inventory_status ----------
  // 輸入：{ isbn?, category? }（皆可選，皆空=全量）
  mc.registerTool({
    name: "get_inventory_status",
    description:
      "查詢書店庫存狀態。可依 ISBN 或分類過濾；不帶參數回傳全量。低於 5 本為 low，0 本為 out。",
    inputSchema: {
      type: "object",
      properties: {
        isbn: { type: "string", description: "書目 ISBN（完整比對）" },
        category: { type: "string", enum: ["文學", "科普", "技術", "兒童"], description: "分類過濾" }
      }
    },
    readOnlyHint: true,
    execute({ isbn, category } = {}) {
      try {
        const items = [];
        for (const [id, s] of Object.entries(DB.stock)) {
          const t = DB.titles[id];
          if (!t) continue;
          if (isbn && t.isbn !== isbn) continue;
          if (category && t.cat !== category) continue;
          items.push({
            id,
            title: t.title,
            isbn: t.isbn,
            category: t.cat,
            shelf: s.shelf,
            qty: s.qty,
            status: computeStatus(s.qty, 5)
          });
        }
        if (isbn && items.length === 0) {
          return structErr("NOT_FOUND", `查無此 ISBN：${isbn}`);
        }
        const lowStock = items.filter((it) => it.status !== "ok");
        return {
          ok: true,
          totalTitles: items.length,
          totalQty: items.reduce((a, it) => a + it.qty, 0),
          lowStock: lowStock.map(({ title, isbn, shelf, qty, status }) => ({ title, isbn, shelf, qty, status })),
          items
        };
      } catch (e) {
        return structErr("INTERNAL", e && e.message ? e.message : String(e));
      }
    }
  });

  // ---------- tool 2: search_titles ----------
  // 輸入：{ keyword, category? }
  mc.registerTool({
    name: "search_titles",
    description: "以關鍵字搜尋書目（比對書名/作者/ISBN，大小寫不敏感），可再按分類過濾。",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "關鍵字（substring）" },
        category: { type: "string", enum: ["文學", "科普", "技術", "兒童"], description: "分類過濾" }
      },
      required: ["keyword"]
    },
    readOnlyHint: true,
    execute({ keyword, category } = {}) {
      try {
        if (!keyword || typeof keyword !== "string") {
          return structErr("BAD_INPUT", "keyword 為必填字串");
        }
        const q = keyword.toLowerCase();
        const results = [];
        for (const [id, t] of Object.entries(DB.titles)) {
          const hit =
            t.title.toLowerCase().includes(q) ||
            t.author.toLowerCase().includes(q) ||
            t.isbn.toLowerCase().includes(q);
          if (!hit) continue;
          if (category && t.cat !== category) continue;
          const s = DB.stock[id] || { qty: 0, shelf: "" };
          results.push({
            id, title: t.title, author: t.author, isbn: t.isbn,
            price: t.price, category: t.cat, shelf: s.shelf,
            qty: s.qty, status: computeStatus(s.qty, 5)
          });
        }
        return { ok: true, count: results.length, results };
      } catch (e) {
        return structErr("INTERNAL", e && e.message ? e.message : String(e));
      }
    }
  });

  // ---------- tool 3: get_low_stock_report ----------
  // 輸入：{}
  mc.registerTool({
    name: "get_low_stock_report",
    description: "產生偏低或缺書的庫存清單（qty<5 或 =0），供補貨判斷。",
    inputSchema: { type: "object", properties: {} },
    readOnlyHint: true,
    execute() {
      try {
        const items = [];
        for (const [id, s] of Object.entries(DB.stock)) {
          const t = DB.titles[id];
          const status = computeStatus(s.qty, 5);
          if (status === "ok") continue;
          items.push({ title: t.title, isbn: t.isbn, shelf: s.shelf, qty: s.qty, status });
        }
        return {
          ok: true,
          count: items.length,
          items,
          suggestedAction: items.some((it) => it.status === "out") ? "reorder" : "restock"
        };
      } catch (e) {
        return structErr("INTERNAL", e && e.message ? e.message : String(e));
      }
    }
  });

  // ---------- 註冊完成回報（供 DevTools WebMCP panel / 手動驗證） ----------
  console.info("[webmcp] registered: get_inventory_status, search_titles, get_low_stock_report");
})();