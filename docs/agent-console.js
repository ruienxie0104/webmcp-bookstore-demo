/** Agent Console — schema-driven UI for the page's WEBMCP_DEMO tools. */
(function () {
  "use strict";

  const examples = [
    { tool: "get_low_stock_report", args: {}, label: "補貨報告 get_low_stock_report({})" },
    { tool: "get_inventory_status", args: {}, label: "全量庫存 get_inventory_status({})" },
    { tool: "get_inventory_status", args: { category: "技術" }, label: "技術類庫存 get_inventory_status({category:\"技術\"})" },
    { tool: "get_inventory_status", args: { isbn: "9789573318301" }, label: "單一 ISBN 查詢 get_inventory_status({isbn:\"9789573318301\"})" },
    { tool: "get_inventory_status", args: { isbn: "9780000000000" }, label: "不存在的 ISBN · NOT_FOUND 示範" },
    { tool: "search_titles", args: { keyword: "夜行" }, label: "搜尋「夜行」search_titles({keyword:\"夜行\"})" },
    { tool: "search_titles", args: { keyword: "島", category: "文學" }, label: "文學類搜「島」search_titles({keyword:\"海風\",category:\"文學\"})" },
    { tool: "search_titles", args: { keyword: "python" }, label: "英文關鍵字（大小寫不敏感）{keyword:\"演算法\"}" },
    { tool: "search_titles", args: { keyword: " " }, label: "空關鍵字 · BAD_INPUT 示範" }
  ];
  const history = [];
  let selectedTool = null;
  let lastFocused = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function schemaSummary(schema) {
    const properties = schema.properties || {};
    const required = new Set(schema.required || []);
    const fields = Object.entries(properties).map(([name, definition]) => {
      const type = definition.enum ? definition.enum.join(" | ") : (definition.type || "any");
      return `${name}${required.has(name) ? "*" : "?"}: ${type}`;
    });
    return fields.length ? `{ ${fields.join(", ")} }` : "{}";
  }

  function appendTextElement(parent, tag, className, content) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = content;
    parent.appendChild(element);
    return element;
  }

  function renderHistory() {
    const list = byId("console-history");
    list.replaceChildren();
    if (!history.length) {
      appendTextElement(list, "li", "history-empty", "尚無呼叫紀錄。執行工具後會保留最近 5 筆。");
      return;
    }
    history.forEach((entry) => {
      const item = document.createElement("li");
      item.className = "history-item";
      appendTextElement(item, "strong", "", `${entry.time} · ${entry.tool}`);
      item.appendChild(document.createTextNode(JSON.stringify(entry.args)));
      list.appendChild(item);
    });
  }

  function renderTools(tools) {
    const container = byId("console-tools");
    container.replaceChildren();
    tools.forEach((tool) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `tool-button${tool === selectedTool ? " active" : ""}`;
      button.dataset.tool = tool.name;
      button.setAttribute("aria-pressed", String(tool === selectedTool));
      appendTextElement(button, "span", "tool-name", tool.name);
      appendTextElement(button, "span", "tool-description", tool.description);
      appendTextElement(button, "span", "schema-summary", schemaSummary(tool.inputSchema));
      button.addEventListener("click", () => selectTool(tool));
      container.appendChild(button);
    });
  }

  function renderExamples(tools) {
    const container = byId("console-examples");
    examples.forEach((example) => {
      const button = appendTextElement(container, "button", "example-button", example.label);
      button.type = "button";
      button.addEventListener("click", () => {
        const tool = tools.find((candidate) => candidate.name === example.tool);
        if (tool) selectTool(tool, example.args);
      });
    });
  }

  function makeField(name, definition, isRequired, value) {
    const field = document.createElement("div");
    field.className = "parameter-field";
    const label = document.createElement("label");
    label.htmlFor = `tool-parameter-${name}`;
    label.textContent = name;
    if (isRequired) appendTextElement(label, "span", "required-mark", "必填");
    field.appendChild(label);

    let control;
    if (definition.enum) {
      control = document.createElement("select");
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = isRequired ? "請選擇" : "不指定";
      control.appendChild(emptyOption);
      definition.enum.forEach((optionValue) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        control.appendChild(option);
      });
    } else {
      control = document.createElement("input");
      control.type = definition.type === "number" || definition.type === "integer" ? "number" : "text";
      control.placeholder = definition.type || "value";
    }
    control.id = `tool-parameter-${name}`;
    control.name = name;
    control.required = isRequired;
    control.dataset.valueType = definition.type || "string";
    control.value = value === undefined ? "" : String(value);
    field.appendChild(control);
    if (definition.description) appendTextElement(field, "small", "", definition.description);
    return field;
  }

  function collectArgs(form, schema) {
    const args = {};
    const required = new Set(schema.required || []);
    Object.entries(schema.properties || {}).forEach(([name]) => {
      const control = form.elements.namedItem(name);
      if (!control || (!required.has(name) && control.value === "")) return;
      const type = control.dataset.valueType;
      args[name] = type === "number" || type === "integer" ? Number(control.value) : control.value;
    });
    return args;
  }

  async function executeTool(tool, form, output, runButton) {
    const args = collectArgs(form, tool.inputSchema);
    runButton.disabled = true;
    output.textContent = "執行中…";
    try {
      const result = await Promise.resolve(tool.execute(args));
      output.textContent = JSON.stringify(result, null, 2);
    } catch (error) {
      output.textContent = JSON.stringify({
        ok: false,
        code: "CONSOLE_ERROR",
        message: error instanceof Error ? error.message : String(error)
      }, null, 2);
    } finally {
      history.unshift({
        time: new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date()),
        tool: tool.name,
        args
      });
      history.splice(5);
      renderHistory();
      runButton.disabled = false;
    }
  }

  function selectTool(tool, preset) {
    selectedTool = tool;
    renderTools(window.WEBMCP_DEMO.tools);
    const workspace = byId("console-workspace");
    workspace.replaceChildren();
    appendTextElement(workspace, "h3", "", tool.name);
    appendTextElement(workspace, "p", "console-workspace-description", tool.description);

    const form = document.createElement("form");
    const grid = document.createElement("div");
    grid.className = "parameter-grid";
    const properties = Object.entries(tool.inputSchema.properties || {});
    const required = new Set(tool.inputSchema.required || []);
    if (!properties.length) {
      appendTextElement(grid, "p", "no-parameters", "此工具不需要參數，將以空物件 {} 呼叫。");
    } else {
      properties.forEach(([name, definition]) => {
        grid.appendChild(makeField(name, definition, required.has(name), preset && preset[name]));
      });
    }
    form.appendChild(grid);
    const runButton = appendTextElement(form, "button", "console-run", "執行");
    runButton.type = "submit";
    workspace.appendChild(form);

    const responseLabel = appendTextElement(workspace, "div", "response-label", "JSON response");
    appendTextElement(responseLabel, "span", "", "pretty-print");
    const output = appendTextElement(workspace, "pre", "response-output", "選擇參數後按下「執行」。");
    output.setAttribute("aria-live", "polite");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      executeTool(tool, form, output, runButton);
    });
  }

  function openConsole() {
    const shell = byId("agent-console");
    lastFocused = document.activeElement;
    shell.hidden = false;
    byId("console-launcher").setAttribute("aria-expanded", "true");
    byId("console-close").focus();
  }

  function closeConsole() {
    byId("agent-console").hidden = true;
    byId("console-launcher").setAttribute("aria-expanded", "false");
    if (lastFocused instanceof HTMLElement) lastFocused.focus();
  }

  function initialize() {
    const demo = window.WEBMCP_DEMO;
    if (!demo || !Array.isArray(demo.tools)) return;
    const badge = byId("support-badge");
    badge.textContent = demo.supported ? "原生支援" : "模擬模式";
    badge.className = `support-badge ${demo.supported ? "native" : "simulated"}`;
    byId("console-status-copy").textContent = demo.supported
      ? "瀏覽器已提供原生 registerTool；面板與原生註冊共用同一份工具定義。"
      : "此瀏覽器沒有原生 WebMCP API；面板直接執行頁面工具，不會偽造 modelContext。";

    selectedTool = demo.tools[0] || null;
    renderTools(demo.tools);
    renderExamples(demo.tools);
    renderHistory();
    if (selectedTool) selectTool(selectedTool);

    byId("console-launcher").addEventListener("click", openConsole);
    byId("console-close").addEventListener("click", closeConsole);
    byId("agent-console").addEventListener("click", (event) => {
      if (event.target === event.currentTarget) closeConsole();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !byId("agent-console").hidden) closeConsole();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
