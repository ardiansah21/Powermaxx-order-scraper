const statusEl = document.getElementById("status");
const metaEl = document.getElementById("meta");
const refreshBtn = document.getElementById("refreshBtn");
const copyIncomeSheetBtn = document.getElementById("copyIncomeSheetBtn");
const copyOrderSheetBtn = document.getElementById("copyOrderSheetBtn");
const copyIncomeJsonBtn = document.getElementById("copyIncomeJsonBtn");
const copyOrderJsonBtn = document.getElementById("copyOrderJsonBtn");
const incomeSheetTableEl = document.getElementById("incomeSheetTable");
const orderSheetTableEl = document.getElementById("orderSheetTable");
const incomeJsonEl = document.getElementById("incomeJson");
const orderJsonEl = document.getElementById("orderJson");

const setStatus = (message, tone = "info") => {
  statusEl.textContent = message;
  statusEl.classList.remove("ok", "error");
  if (tone === "ok") statusEl.classList.add("ok");
  if (tone === "error") statusEl.classList.add("error");
};

const renderSheetTable = (tableEl, headers = [], rows = []) => {
  if (!tableEl) return;
  const thead = tableEl.querySelector("thead") || tableEl.createTHead();
  const tbody = tableEl.querySelector("tbody") || tableEl.createTBody();
  thead.innerHTML = "";
  tbody.innerHTML = "";

  if (!headers.length) {
    tableEl.classList.remove("multi-head");
    return;
  }
  const headerRows = Array.isArray(headers[0]) ? headers : [headers];
  tableEl.classList.toggle("multi-head", headerRows.length > 1);
  headerRows.forEach((row) => {
    const headerRow = document.createElement("tr");
    row.forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
  });

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
};

const setSheetOutput = (sheet, tableEl) => {
  const headers = sheet?.headers || [];
  const rows = sheet?.rows || [];
  renderSheetTable(tableEl, headers, rows);
  if (tableEl) {
    tableEl.dataset.copyText = sheet?.copy || "";
  }
};

const formatLocalDateTime = (ts) => {
  if (!ts) return "";
  const ms = ts > 1e12 ? ts : ts * 1000;
  const date = new Date(ms);
  const pad = (num) => String(num).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${year} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`;
};

const loadViewerPayload = () => {
  chrome.storage.local.get("viewerPayload", (result) => {
    const payload = result?.viewerPayload;
    if (!payload) {
      setStatus("Belum ada data. Buka popup dan klik Ambil Data.", "error");
      metaEl.textContent = "Belum ada data.";
      setSheetOutput(null, incomeSheetTableEl);
      setSheetOutput(null, orderSheetTableEl);
      incomeJsonEl.textContent = "";
      orderJsonEl.textContent = "";
      return;
    }

    const updatedText = formatLocalDateTime(payload.updatedAt);
    const orderIdText = payload.orderId ? `Order ${payload.orderId}` : "Order tidak terdeteksi";
    const orderSnText = payload.orderSn ? `SN ${payload.orderSn}` : "";
    const orderMeta = orderSnText ? `${orderIdText} | ${orderSnText}` : orderIdText;
    metaEl.textContent = `${orderMeta} | Update ${updatedText}`;
    setStatus("Data siap dilihat.", "ok");
    setSheetOutput(payload.incomeSheet, incomeSheetTableEl);
    setSheetOutput(payload.orderSheet, orderSheetTableEl);
    incomeJsonEl.textContent = payload.incomeRaw || "";
    orderJsonEl.textContent = payload.orderRaw || "";
  });
};

const copyText = async (text, successMessage) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    setStatus(successMessage, "ok");
  } catch (err) {
    setStatus(`Gagal copy: ${err.message}`, "error");
  }
};

const init = () => {
  refreshBtn.addEventListener("click", loadViewerPayload);
  copyIncomeSheetBtn.addEventListener("click", () =>
    copyText((incomeSheetTableEl?.dataset.copyText || "").trim(), "Income sheet dicopy.")
  );
  copyOrderSheetBtn.addEventListener("click", () =>
    copyText((orderSheetTableEl?.dataset.copyText || "").trim(), "Order sheet dicopy.")
  );
  copyIncomeJsonBtn.addEventListener("click", () =>
    copyText(incomeJsonEl.textContent.trim(), "Income JSON dicopy.")
  );
  copyOrderJsonBtn.addEventListener("click", () =>
    copyText(orderJsonEl.textContent.trim(), "Order JSON dicopy.")
  );

  loadViewerPayload();
};

document.addEventListener("DOMContentLoaded", init);
