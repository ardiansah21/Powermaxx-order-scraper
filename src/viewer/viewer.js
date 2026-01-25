const statusEl = document.getElementById("status");
const metaEl = document.getElementById("meta");
const refreshBtn = document.getElementById("refreshBtn");
const orderSnTitleEl = document.getElementById("orderSnTitle");
const summaryGridEl = document.getElementById("summaryGrid");
const toggleSummaryBtn = document.getElementById("toggleSummaryBtn");
const copyIncomeSheetBtn = document.getElementById("copyIncomeSheetBtn");
const copyOrderSheetBtn = document.getElementById("copyOrderSheetBtn");
const toggleIncomeSheetBtn = document.getElementById("toggleIncomeSheetBtn");
const toggleOrderSheetBtn = document.getElementById("toggleOrderSheetBtn");
const incomeSheetWrapEl = document.getElementById("incomeSheetWrap");
const orderSheetWrapEl = document.getElementById("orderSheetWrap");
const tiktokPanelEl = document.getElementById("tiktokPanel");
const toggleTiktokBtn = document.getElementById("toggleTiktokBtn");
const tiktokBodyEl = document.getElementById("tiktokBody");
const tiktokTradeOrderJsonEl = document.getElementById("tiktokTradeOrderJson");
const tiktokStatusJsonEl = document.getElementById("tiktokStatusJson");
const tiktokPriceJsonEl = document.getElementById("tiktokPriceJson");
const tiktokSkuJsonEl = document.getElementById("tiktokSkuJson");
const tiktokBuyerJsonEl = document.getElementById("tiktokBuyerJson");
const tiktokFulfillmentJsonEl = document.getElementById("tiktokFulfillmentJson");
const tiktokIncomeRecordsJsonEl = document.getElementById("tiktokIncomeRecordsJson");
const tiktokSkuRecordsJsonEl = document.getElementById("tiktokSkuRecordsJson");
const tiktokIncomeDetailRecordJsonEl = document.getElementById("tiktokIncomeDetailRecordJson");
const tiktokOrderRawJsonEl = document.getElementById("tiktokOrderRawJson");
const tiktokStatementRawJsonEl = document.getElementById("tiktokStatementRawJson");
const tiktokDetailRawJsonEl = document.getElementById("tiktokDetailRawJson");
const copyIncomeJsonBtn = document.getElementById("copyIncomeJsonBtn");
const copyIncomeDetailJsonBtn = document.getElementById("copyIncomeDetailJsonBtn");
const copyOrderJsonBtn = document.getElementById("copyOrderJsonBtn");
const downloadIncomeJsonBtn = document.getElementById("downloadIncomeJsonBtn");
const downloadIncomeDetailJsonBtn = document.getElementById("downloadIncomeDetailJsonBtn");
const downloadOrderJsonBtn = document.getElementById("downloadOrderJsonBtn");
const toggleIncomeJsonBtn = document.getElementById("toggleIncomeJsonBtn");
const toggleIncomeDetailJsonBtn = document.getElementById("toggleIncomeDetailJsonBtn");
const toggleOrderJsonBtn = document.getElementById("toggleOrderJsonBtn");
const incomeSheetTableEl = document.getElementById("incomeSheetTable");
const orderSheetTableEl = document.getElementById("orderSheetTable");
const incomeJsonEl = document.getElementById("incomeJson");
const incomeDetailJsonEl = document.getElementById("incomeDetailJson");
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


const setJsonText = (el, value) => {
  if (!el) return;
  if (!value) {
    el.textContent = "";
    return;
  }
  try {
    el.textContent = JSON.stringify(value, null, 2);
  } catch (e) {
    el.textContent = String(value);
  }
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

const renderTikTokDetails = (orderPayload, incomePayload, detailPayload) => {
  if (!tiktokPanelEl || !tiktokBodyEl) return;
  const mainOrder = orderPayload?.data?.main_order?.[0];
  if (!mainOrder) {
    tiktokPanelEl.classList.add("hidden");
    tiktokBodyEl.classList.add("hidden");
    return;
  }

  tiktokPanelEl.classList.remove("hidden");
  const orderRecords = incomePayload?.data?.order_records || [];
  const matchedRecord =
    orderRecords.find((record) => String(record.reference_id) === String(mainOrder.main_order_id)) ||
    orderRecords.find((record) => String(record.trade_order_id) === String(mainOrder.main_order_id)) ||
    orderRecords[0];
  const skuRecords = matchedRecord?.sku_records || [];
  const detailRecord = detailPayload?.data?.order_record || null;

  setJsonText(tiktokTradeOrderJsonEl, mainOrder.trade_order_module);
  setJsonText(tiktokStatusJsonEl, mainOrder.order_status_module);
  setJsonText(tiktokPriceJsonEl, mainOrder.price_module);
  setJsonText(tiktokSkuJsonEl, mainOrder.sku_module);
  setJsonText(tiktokBuyerJsonEl, mainOrder.buyer_info_module);
  setJsonText(tiktokFulfillmentJsonEl, mainOrder.fulfillment_module || mainOrder.delivery_module);
  setJsonText(tiktokIncomeRecordsJsonEl, orderRecords);
  setJsonText(tiktokSkuRecordsJsonEl, skuRecords);
  setJsonText(tiktokIncomeDetailRecordJsonEl, detailRecord);
  setJsonText(tiktokOrderRawJsonEl, orderPayload);
  setJsonText(tiktokStatementRawJsonEl, incomePayload);
  setJsonText(tiktokDetailRawJsonEl, detailPayload);
};

const renderSummary = (orderData, incomeData) => {
  if (!summaryGridEl) return;
  summaryGridEl.innerHTML = "";

  const isTikTok = Array.isArray(orderData?.main_order);
  const mainOrder = isTikTok ? orderData.main_order[0] : null;
  const tiktokStatus = mainOrder?.order_status_module?.[0]?.main_order_status;
  const tiktokCreated = mainOrder?.trade_order_module?.create_time;
  const tiktokTotal = mainOrder?.price_module?.grand_total?.format_price;

  const orderSn =
    orderData?.order_sn ||
    incomeData?.order_info?.order_sn ||
    mainOrder?.main_order_id ||
    incomeData?.order_records?.[0]?.reference_id ||
    "-";
  const orderId =
    orderData?.order_id ||
    incomeData?.order_info?.order_id ||
    mainOrder?.main_order_id ||
    incomeData?.order_records?.[0]?.reference_id ||
    "-";
  const status =
    orderData?.status ??
    incomeData?.order_info?.status ??
    tiktokStatus ??
    "-";
  const createdAt = formatLocalDateTime(orderData?.create_time || tiktokCreated) || "-";
  const totalPrice = orderData?.total_price || tiktokTotal || "-";

  const rows = [
    { label: "Order SN", value: orderSn },
    { label: "Order ID", value: orderId },
    { label: "Status", value: status },
    { label: "Dibuat", value: createdAt },
    { label: "Total Harga", value: totalPrice }
  ];

  rows.forEach((row) => {
    const card = document.createElement("div");
    card.className = "summary-card";
    card.innerHTML = `<div class="summary-label">${row.label}</div><div class="summary-value">${row.value}</div>`;
    summaryGridEl.appendChild(card);
  });
};

const loadViewerPayload = () => {
  chrome.storage.local.get("viewerPayload", (result) => {
    const payload = result?.viewerPayload;
    if (!payload) {
      setStatus("Belum ada data. Buka popup dan klik Ambil Data.", "error");
      metaEl.textContent = "Belum ada data.";
      if (orderSnTitleEl) orderSnTitleEl.textContent = "Order SN -";
      setSheetOutput(null, incomeSheetTableEl);
      setSheetOutput(null, orderSheetTableEl);
      incomeJsonEl.textContent = "";
      if (incomeDetailJsonEl) incomeDetailJsonEl.textContent = "";
      orderJsonEl.textContent = "";
      if (summaryGridEl) summaryGridEl.innerHTML = "";
      if (tiktokPanelEl) tiktokPanelEl.classList.add("hidden");
      if (tiktokBodyEl) tiktokBodyEl.classList.add("hidden");
      return;
    }

    const orderData = payload.orderRawJson || {};
    const incomeData = payload.incomeRawJson || {};
    const updatedText = formatLocalDateTime(payload.updatedAt);
    const tiktokMain = orderData?.data?.main_order?.[0];
    const orderSn =
      orderData?.data?.order_sn ||
      payload.orderSn ||
      tiktokMain?.main_order_id ||
      orderData?.data?.main_order?.[0]?.trade_order_module?.main_order_id ||
      "-";
    const orderId =
      orderData?.data?.order_id ||
      payload.orderId ||
      tiktokMain?.main_order_id ||
      "";
    const orderMeta = orderId ? `Order ${orderId}` : "Order tidak terdeteksi";
    metaEl.textContent = `${orderMeta} | Update ${updatedText}`;
    if (orderSnTitleEl) orderSnTitleEl.textContent = `Order SN ${orderSn}`;
    setStatus("Data siap dilihat.", "ok");
    setSheetOutput(payload.incomeSheet, incomeSheetTableEl);
    setSheetOutput(payload.orderSheet, orderSheetTableEl);
    incomeJsonEl.textContent = payload.incomeRaw || "";
    if (incomeDetailJsonEl) incomeDetailJsonEl.textContent = payload.incomeDetailRaw || "";
    orderJsonEl.textContent = payload.orderRaw || "";
    renderSummary(orderData?.data, incomeData?.data);
    renderTikTokDetails(orderData, incomeData, payload.incomeDetailRawJson || {});
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

const downloadJson = (filename, text) => {
  if (!text) return;
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  setStatus(`${filename} siap diunduh.`, "ok");
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
  if (copyIncomeDetailJsonBtn) {
    copyIncomeDetailJsonBtn.addEventListener("click", () =>
      copyText(incomeDetailJsonEl.textContent.trim(), "Income Detail JSON dicopy.")
    );
  }
  copyOrderJsonBtn.addEventListener("click", () =>
    copyText(orderJsonEl.textContent.trim(), "Order JSON dicopy.")
  );
  downloadIncomeJsonBtn.addEventListener("click", () =>
    downloadJson("income.json", incomeJsonEl.textContent.trim())
  );
  if (downloadIncomeDetailJsonBtn) {
    downloadIncomeDetailJsonBtn.addEventListener("click", () =>
      downloadJson("income-detail.json", incomeDetailJsonEl.textContent.trim())
    );
  }
  downloadOrderJsonBtn.addEventListener("click", () =>
    downloadJson("order.json", orderJsonEl.textContent.trim())
  );
  toggleIncomeJsonBtn.addEventListener("click", () => {
    const isHidden = incomeJsonEl.classList.toggle("hidden");
    toggleIncomeJsonBtn.textContent = isHidden ? "Tampilkan" : "Sembunyikan";
  });
  if (toggleIncomeDetailJsonBtn) {
    toggleIncomeDetailJsonBtn.addEventListener("click", () => {
      const isHidden = incomeDetailJsonEl.classList.toggle("hidden");
      toggleIncomeDetailJsonBtn.textContent = isHidden ? "Tampilkan" : "Sembunyikan";
    });
  }
  toggleOrderJsonBtn.addEventListener("click", () => {
    const isHidden = orderJsonEl.classList.toggle("hidden");
    toggleOrderJsonBtn.textContent = isHidden ? "Tampilkan" : "Sembunyikan";
  });
  if (toggleTiktokBtn) {
    toggleTiktokBtn.addEventListener("click", () => {
      const isHidden = tiktokBodyEl.classList.toggle("hidden");
      toggleTiktokBtn.textContent = isHidden ? "Tampilkan" : "Sembunyikan";
    });
  }
  if (toggleSummaryBtn) {
    toggleSummaryBtn.addEventListener("click", () => {
      const isHidden = summaryGridEl.classList.toggle("hidden");
      toggleSummaryBtn.textContent = isHidden ? "Tampilkan" : "Sembunyikan";
    });
  }
  if (toggleOrderSheetBtn) {
    toggleOrderSheetBtn.addEventListener("click", () => {
      const isHidden = orderSheetWrapEl.classList.toggle("hidden");
      toggleOrderSheetBtn.textContent = isHidden ? "Tampilkan" : "Sembunyikan";
    });
  }
  if (toggleIncomeSheetBtn) {
    toggleIncomeSheetBtn.addEventListener("click", () => {
      const isHidden = incomeSheetWrapEl.classList.toggle("hidden");
      toggleIncomeSheetBtn.textContent = isHidden ? "Tampilkan" : "Sembunyikan";
    });
  }

  loadViewerPayload();
};

document.addEventListener("DOMContentLoaded", init);
