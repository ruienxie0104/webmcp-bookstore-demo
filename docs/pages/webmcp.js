/**
 * webmcp.js — Bookstore WebMCP Adapter
 *
 * 資料一律取自頁面的 window.DB；成功輸出與錯誤格式依
 * docs/adapter-contract.md，三個工具皆為 read-only。
 */
(function () {
  "use strict";

  const CATEGORIES = ["文學", "科普", "技術", "兒童"];
  const LOW_THRESHOLD = 5;

  function computeStatus(qty) {
    if (qty <= 0) return "out";
    if (qty < LOW_THRESHOLD) return "low";
    return "ok";
  }

  function structErr(code, message) {
    return { ok: false, code, message };
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function hasOnlyKeys(value, allowedKeys) {
    return Object.keys(value).every((key) => allowedKeys.includes(key));
  }

  function validText(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function validateArgs(rawArgs, allowedKeys) {
    const args = rawArgs === undefined ? {} : rawArgs;
    if (!isRecord(args)) {
      return { error: structErr("BAD_INPUT", "輸入必須是物件") };
    }
    if (!hasOnlyKeys(args, allowedKeys)) {
      return { error: structErr("BAD_INPUT", "輸入包含未支援的欄位") };
    }
    return { args };
  }

  function validateCategory(category) {
    if (category === undefined) return null;
    if (typeof category !== "string" || !CATEGORIES.includes(category)) {
      return structErr("BAD_INPUT", `category 必須是：${CATEGORIES.join("、")}`);
    }
    return null;
  }

  // 建立的是當次查詢的引用集合，不內嵌任何書目或庫存資料。
  function readCatalog() {
    const db = typeof window !== "undefined" ? window.DB : undefined;
    if (!isRecord(db) || !isRecord(db.titles) || !isRecord(db.stock)) {
      throw new Error("DB 必須包含 titles 與 stock 物件");
    }

    const titleEntries = Object.entries(db.titles);
    const stockEntries = Object.entries(db.stock);
    const stockIds = new Set(stockEntries.map(([id]) => id));

    for (const [id, title] of titleEntries) {
      if (!isRecord(title) || !validText(title.title) || !validText(title.author) ||
          !validText(title.isbn) || !validText(title.cat) || !Number.isFinite(title.price)) {
        throw new Error(`DB.titles.${id} 缺少必要欄位或欄位格式錯誤`);
      }
      if (!stockIds.has(id)) {
        throw new Error(`DB.stock 缺少書目 ${id} 的庫存資料`);
      }
    }

    for (const [id, stock] of stockEntries) {
      if (!Object.prototype.hasOwnProperty.call(db.titles, id)) {
        throw new Error(`DB.stock.${id} 找不到對應書目`);
      }
      if (!isRecord(stock) || !Number.isFinite(stock.qty) || !validText(stock.shelf)) {
        throw new Error(`DB.stock.${id} 缺少必要欄位或欄位格式錯誤`);
      }
    }

    return { titles: db.titles, stock: db.stock, titleEntries, stockEntries };
  }

  function internalError(error) {
    const detail = error instanceof Error ? error.message : String(error);
    return structErr("INTERNAL", `資料查詢失敗：${detail}`);
  }

  function inventoryTool() {
    return {
      name: "get_inventory_status",
      description: "查詢書店庫存狀態。可依 ISBN 或分類過濾；不帶參數回傳全量。",
      inputSchema: {
        type: "object",
        properties: {
          isbn: { type: "string", description: "書目 ISBN（完整比對）" },
          category: { type: "string", enum: CATEGORIES, description: "分類過濾" }
        },
        additionalProperties: false
      },
      readOnlyHint: true,
      execute(rawArgs) {
        try {
          const checked = validateArgs(rawArgs, ["isbn", "category"]);
          if (checked.error) return checked.error;
          const { isbn, category } = checked.args;

          if (isbn !== undefined && !validText(isbn)) {
            return structErr("BAD_INPUT", "isbn 必須是非空字串");
          }
          const categoryError = validateCategory(category);
          if (categoryError) return categoryError;

          const normalizedIsbn = isbn === undefined ? undefined : isbn.trim();
          const { titles, titleEntries, stockEntries } = readCatalog();
          const items = [];

          if (normalizedIsbn !== undefined &&
              !titleEntries.some(([, title]) => title.isbn === normalizedIsbn)) {
            return structErr("NOT_FOUND", `查無此 ISBN：${normalizedIsbn}`);
          }

          for (const [id, stock] of stockEntries) {
            const title = titles[id];
            if (normalizedIsbn !== undefined && title.isbn !== normalizedIsbn) continue;
            if (category !== undefined && title.cat !== category) continue;
            items.push({
              title: title.title,
              isbn: title.isbn,
              category: title.cat,
              shelf: stock.shelf,
              qty: stock.qty,
              status: computeStatus(stock.qty)
            });
          }

          return {
            totalTitles: items.length,
            totalQty: items.reduce((sum, item) => sum + item.qty, 0),
            lowStock: items
              .filter((item) => item.status !== "ok")
              .map(({ title, isbn: itemIsbn, shelf, qty, status }) => ({
                title, isbn: itemIsbn, shelf, qty, status
              })),
            items
          };
        } catch (error) {
          return internalError(error);
        }
      }
    };
  }

  function searchTool() {
    return {
      name: "search_titles",
      description: "以關鍵字搜尋書名、作者或 ISBN（大小寫不敏感），可再按分類過濾。",
      inputSchema: {
        type: "object",
        properties: {
          keyword: { type: "string", description: "關鍵字（substring）" },
          category: { type: "string", enum: CATEGORIES, description: "分類過濾" }
        },
        required: ["keyword"],
        additionalProperties: false
      },
      readOnlyHint: true,
      execute(rawArgs) {
        try {
          const checked = validateArgs(rawArgs, ["keyword", "category"]);
          if (checked.error) return checked.error;
          const { keyword, category } = checked.args;

          if (!validText(keyword)) {
            return structErr("BAD_INPUT", "keyword 為必填的非空字串");
          }
          const categoryError = validateCategory(category);
          if (categoryError) return categoryError;

          const query = keyword.trim().toLocaleLowerCase("zh-Hant");
          const { stock, titleEntries } = readCatalog();
          const results = [];

          for (const [id, title] of titleEntries) {
            const matches = [title.title, title.author, title.isbn]
              .some((value) => value.toLocaleLowerCase("zh-Hant").includes(query));
            if (!matches || (category !== undefined && title.cat !== category)) continue;
            const itemStock = stock[id];
            results.push({
              id,
              title: title.title,
              author: title.author,
              isbn: title.isbn,
              price: title.price,
              category: title.cat,
              shelf: itemStock.shelf,
              qty: itemStock.qty,
              status: computeStatus(itemStock.qty)
            });
          }

          return { count: results.length, results };
        } catch (error) {
          return internalError(error);
        }
      }
    };
  }

  function lowStockTool() {
    return {
      name: "get_low_stock_report",
      description: "產生偏低或缺書的庫存清單（庫存少於 5 本），供補貨判斷。",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      readOnlyHint: true,
      execute(rawArgs) {
        try {
          const checked = validateArgs(rawArgs, []);
          if (checked.error) return checked.error;
          const { titles, stockEntries } = readCatalog();
          const items = [];

          for (const [id, stock] of stockEntries) {
            const status = computeStatus(stock.qty);
            if (status === "ok") continue;
            const title = titles[id];
            items.push({
              title: title.title,
              isbn: title.isbn,
              shelf: stock.shelf,
              qty: stock.qty,
              status
            });
          }

          return {
            generatedAt: new Date().toISOString(),
            count: items.length,
            items,
            suggestedAction: "reorder"
          };
        } catch (error) {
          return internalError(error);
        }
      }
    };
  }

  function registerTools() {
    const modelContext = typeof document !== "undefined" ? document.modelContext : undefined;
    const secureContext = typeof window === "undefined" || window.isSecureContext !== false;
    if (!secureContext || !modelContext || typeof modelContext.registerTool !== "function") {
      console.info("[webmcp] modelContext.registerTool not available in a secure context — adapter idle");
      return;
    }

    const tools = [inventoryTool(), searchTool(), lowStockTool()];
    try {
      tools.forEach((tool) => modelContext.registerTool(tool));
      console.info(`[webmcp] registered: ${tools.map((tool) => tool.name).join(", ")}`);
    } catch (error) {
      console.error("[webmcp] tool registration failed", error);
    }
  }

  if (typeof document !== "undefined" && document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", registerTools, { once: true });
  } else {
    registerTools();
  }
})();
