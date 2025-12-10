const DEFAULT_INCOME_ENDPOINT =
  "https://seller.shopee.co.id/api/v4/accounting/pc/seller_income/income_detail/get_order_income_components";
const DEFAULT_ORDER_ENDPOINT =
  "https://seller.shopee.co.id/api/v3/order/get_one_order";
const DEFAULT_COMPONENTS = "2,3,4,5";

const fetchBtn = document.getElementById("fetchBtn");
const statusEl = document.getElementById("status");
const incomeEndpointInput = document.getElementById("incomeEndpoint");
const orderEndpointInput = document.getElementById("orderEndpoint");
const incomePayloadInput = document.getElementById("incomePayload");
const resetIncomeBtn = document.getElementById("resetIncomeUrl");
const resetOrderBtn = document.getElementById("resetOrderUrl");
const toggleIncomeSettingsBtn = document.getElementById("toggleIncomeSettings");
const toggleOrderSettingsBtn = document.getElementById("toggleOrderSettings");
const incomeSettingsEl = document.getElementById("incomeSettings");
const orderSettingsEl = document.getElementById("orderSettings");
const toggleSummaryBtn = document.getElementById("toggleSummary");
const toggleIncomeRawBtn = document.getElementById("toggleIncomeRaw");
const toggleOrderRawBtn = document.getElementById("toggleOrderRaw");
const copyIncomeBtn = document.getElementById("copyIncomeBtn");
const downloadIncomeBtn = document.getElementById("downloadIncomeBtn");
const copyOrderBtn = document.getElementById("copyOrderBtn");
const downloadOrderBtn = document.getElementById("downloadOrderBtn");
const renderedSection = document.getElementById("rendered");
const sellerBreakdownEl = document.getElementById("sellerBreakdown");
const buyerBreakdownEl = document.getElementById("buyerBreakdown");
const orderSummaryEl = document.getElementById("orderSummary");
const outputIncomeEl = document.getElementById("outputIncome");
const outputOrderEl = document.getElementById("outputOrder");

const setStatus = (message, tone = "info") => {
  statusEl.textContent = message;
  statusEl.classList.remove("ok", "error");
  if (tone === "ok") statusEl.classList.add("ok");
  if (tone === "error") statusEl.classList.add("error");
};

const setOutput = (incomeText, orderText) => {
  outputIncomeEl.textContent = incomeText || "";
  outputOrderEl.textContent = orderText || "";
};

const prettify = (text) => {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return text;
  }
};

// Shopee money values dikirim dengan faktor 100000; konversi ke rupiah.
const formatAmount = (amount) => {
  const value = Number(amount || 0) / 100000; // Shopee API memakai faktor 100000
  return value.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  });
};

const clearRendered = () => {
  sellerBreakdownEl.innerHTML = "";
  buyerBreakdownEl.innerHTML = "";
  orderSummaryEl.innerHTML = "";
};

const renderSummary = (incomeData, orderData) => {
  clearRendered();
  if (!incomeData && !orderData) return;
  const orderInfo = incomeData?.order_info || orderData || {};
  const createTs =
    orderData?.create_time ||
    incomeData?.create_time ||
    orderInfo.create_time ||
    orderData?.status_info?.status_description?.description_timestamp_list?.[0]?.timestamp;
  const breakdown = incomeData?.seller_income_breakdown?.breakdown || [];
  const escrow = breakdown.find(
    (b) => b.field_name === "ESCROW_AMOUNT" || b.field_id === 250
  );

  const formatDate = (ts) => {
    if (!ts) return "-";
    const ms = ts > 1e12 ? ts : ts * 1000;
    return new Date(ms).toLocaleString("id-ID");
  };

  const pills = [
    { label: "Order ID", value: orderInfo.order_id || "-" },
    { label: "Order SN", value: orderInfo.order_sn || "-" },
    { label: "Dibuat", value: formatDate(createTs) },
    { label: "Status", value: orderInfo.status ?? "-" },
    {
      label: "Estimasi Total Penghasilan",
      value: escrow ? formatAmount(escrow.amount) : "-",
      tone: "positive"
    }
  ];

  pills.forEach((pill) => {
    const div = document.createElement("div");
    div.className = "pill";
    const valueClass =
      pill.tone === "positive" ? "value positive" : pill.tone === "negative" ? "value negative" : "value";
    div.innerHTML = `<div class="label">${pill.label}</div><div class="${valueClass}">${pill.value}</div>`;
    orderSummaryEl.appendChild(div);
  });
};

const renderBreakdown = (items = [], targetEl) => {
  targetEl.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";

    const amountClass = item.amount < 0 ? "amount negative" : "amount positive";
    card.innerHTML = `
      <div class="row">
        <div>
          <div class="title">${item.display_name || item.field_name || "-"}</div>
          <div class="muted">${item.field_name || ""}</div>
        </div>
        <div class="${amountClass}">${formatAmount(item.amount)}</div>
      </div>
    `;

    if (Array.isArray(item.sub_breakdown) && item.sub_breakdown.length) {
      const ul = document.createElement("div");
      ul.className = "sub-list";
      item.sub_breakdown.forEach((sub) => {
        const row = document.createElement("div");
        row.className = "sub-item";
        const subAmountClass = sub.amount < 0 ? "amount negative" : "amount positive";
        row.innerHTML = `
          <span class="name">${sub.display_name || sub.field_name || "-"}</span>
          <span class="${subAmountClass}">${formatAmount(sub.amount)}</span>
        `;
        ul.appendChild(row);
      });
      card.appendChild(ul);
    }

    targetEl.appendChild(card);
  });
};

// Jalankan income POST dan order GET di dalam tab aktif agar cookie ikut.
const pageFetcher = async (
  incomeBase,
  orderBase,
  bodyOverride,
  defaultComponents = "2,3,4,5"
) => {
  try {
    const pickCookie = (name) => {
      const pair = document.cookie
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${name}=`));
      if (!pair) return "";
      const raw = pair.slice(pair.indexOf("=") + 1);
      try {
        return decodeURIComponent(raw);
      } catch (e) {
        return raw;
      }
    };

    const incomeUrl = new URL(incomeBase);
    const orderUrl = new URL(orderBase || "https://seller.shopee.co.id/api/v3/order/get_one_order");
    const cdsCookie = pickCookie("SPC_CDS");
    const cdsVerCookie = pickCookie("SPC_CDS_VER");

    if (!incomeUrl.searchParams.get("SPC_CDS") && cdsCookie) {
      incomeUrl.searchParams.set("SPC_CDS", cdsCookie);
    }
    if (!incomeUrl.searchParams.get("SPC_CDS_VER")) {
      if (cdsVerCookie) {
        incomeUrl.searchParams.set("SPC_CDS_VER", cdsVerCookie);
      } else {
        incomeUrl.searchParams.set("SPC_CDS_VER", "2"); // fallback umum yang terlihat di XHR
      }
    }
    if (!orderUrl.searchParams.get("SPC_CDS") && cdsCookie) {
      orderUrl.searchParams.set("SPC_CDS", cdsCookie);
    }
    if (!orderUrl.searchParams.get("SPC_CDS_VER")) {
      if (cdsVerCookie) {
        orderUrl.searchParams.set("SPC_CDS_VER", cdsVerCookie);
      } else {
        orderUrl.searchParams.set("SPC_CDS_VER", "2");
      }
    }

    const parseComponents = (raw) => {
      const seed = raw || defaultComponents || "2,3,4,5";
      const nums = seed
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n));
      return nums.length ? nums : [2, 3, 4, 5];
    };

    const parseOrderId = () => {
      const match = location.pathname.match(/order\/([0-9]+)/);
      return match ? match[1] : "";
    };

    const orderIdFromUrl = parseOrderId();
    let orderIdForDisplay = orderIdFromUrl || "";

    // Jika user isi body custom, kirim apa adanya; jika tidak, pakai body default.
    let bodyString = "";
    if (bodyOverride && bodyOverride.trim()) {
      try {
        const parsedBody = JSON.parse(bodyOverride);
        const overrideOrderId = parsedBody.order_id;
        if (overrideOrderId) {
          orderIdForDisplay = overrideOrderId;
        }
        if (!overrideOrderId && !orderIdFromUrl) {
          return { error: "Order ID tidak ditemukan: pastikan ada di payload atau di URL tab aktif" };
        }
        bodyString = JSON.stringify(parsedBody);
        const orderIdToUse = overrideOrderId || orderIdFromUrl;
        if (orderIdToUse) orderUrl.searchParams.set("order_id", orderIdToUse);
      } catch (e) {
        return { error: `Body override bukan JSON valid: ${e.message}` };
      }
    } else {
      const components = parseComponents(defaultComponents);
      if (!orderIdFromUrl) {
        return { error: "Order ID tidak ditemukan (buka halaman order atau isi payload manual)" };
      }
      orderIdForDisplay = orderIdFromUrl;
      bodyString = JSON.stringify({ order_id: Number(orderIdFromUrl), components });
      orderUrl.searchParams.set("order_id", orderIdFromUrl);
    }

    const response = await fetch(incomeUrl.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        accept: "application/json, text/plain, */*"
      },
      credentials: "include",
      body: bodyString
    });
    const body = await response.text();

    let orderResp;
    let orderBody = "";
    try {
      orderResp = await fetch(orderUrl.toString(), {
        method: "GET",
        headers: { accept: "application/json, text/plain, */*" },
        credentials: "include"
      });
      orderBody = await orderResp.text();
    } catch (e) {
      orderResp = null;
      orderBody = `{"error":"${e.message}"}`;
    }

    return {
      income: {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body,
        finalUrl: incomeUrl.toString()
      },
      order: {
        ok: orderResp ? orderResp.ok : false,
        status: orderResp ? orderResp.status : 0,
        statusText: orderResp ? orderResp.statusText : "Order request failed",
        body: orderBody,
        finalUrl: orderUrl.toString()
      },
      orderId: orderIdForDisplay
    };
  } catch (e) {
    return { error: e.message };
  }
};

const fetchData = async () => {
  setStatus("Mengambil data (menggunakan cookie/tab aktif)...", "info");
  setOutput("", "");
  clearRendered();
  fetchBtn.disabled = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus("Tidak ada tab aktif ditemukan.", "error");
    fetchBtn.disabled = false;
    return;
  }

  const incomeUrl = (incomeEndpointInput.value || "").trim() || DEFAULT_INCOME_ENDPOINT;
  const orderUrl = (orderEndpointInput.value || "").trim() || DEFAULT_ORDER_ENDPOINT;
  const bodyOverride = (incomePayloadInput.value || "").trim();

  try {
    const [execResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: pageFetcher,
      args: [incomeUrl, orderUrl, bodyOverride, DEFAULT_COMPONENTS]
    });
    const result = execResult?.result;
    if (!result) {
      setStatus("Tidak ada hasil dari tab (mungkin diblokir CSP atau error lain).", "error");
      return;
    }
    if (result.error) {
      setStatus(`Gagal di tab: ${result.error}`, "error");
      return;
    }

    const incomeRaw = result.income?.body || "";
    const orderRaw = result.order?.body || "";
    const incomePretty = prettify(incomeRaw);
    const orderPretty = prettify(orderRaw);
    setOutput(incomePretty, orderPretty);

    let parsedIncome;
    let parsedOrder;
    try {
      parsedIncome = JSON.parse(incomeRaw);
    } catch (e) {
      parsedIncome = null;
    }
    try {
      parsedOrder = JSON.parse(orderRaw);
    } catch (e) {
      parsedOrder = null;
    }
    if (parsedIncome?.data) {
      renderSummary(parsedIncome.data, parsedOrder?.data);
      renderBreakdown(parsedIncome.data.seller_income_breakdown?.breakdown, sellerBreakdownEl);
      renderBreakdown(parsedIncome.data.buyer_payment_breakdown?.breakdown, buyerBreakdownEl);
    }

    const incomeOk = result.income?.ok;
    const orderOk = result.order?.ok;

    if (incomeOk) {
      setStatus(
        `Income OK ${result.income.status} (order ${result.orderId}) | Order ${orderOk ? "OK" : "ERR"} ${result.order?.status || 0}`,
        "ok"
      );
    } else {
      setStatus(
        `Income error ${result.income?.status || 0} (${result.income?.statusText || "Permintaan gagal"}) — cek login/parameter`,
        "error"
      );
    }
  } catch (err) {
    setStatus(`Gagal mengambil data: ${err.message}`, "error");
    setOutput(String(err), "");
  } finally {
    fetchBtn.disabled = false;
  }
};

const copyIncomeOutput = async () => {
  const text = outputIncomeEl.textContent.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Income JSON sudah dicopy", "ok");
  } catch (err) {
    setStatus(`Tidak bisa copy income: ${err.message}`, "error");
  }
};

const copyOrderOutput = async () => {
  const text = outputOrderEl.textContent.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Order JSON sudah dicopy", "ok");
  } catch (err) {
    setStatus(`Tidak bisa copy order: ${err.message}`, "error");
  }
};

const downloadIncomeOutput = () => {
  const text = outputIncomeEl.textContent;
  if (!text) return;
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "income.json";
  link.click();
  URL.revokeObjectURL(url);
  setStatus("Income JSON siap diunduh", "ok");
};

const downloadOrderOutput = () => {
  const text = outputOrderEl.textContent;
  if (!text) return;
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "order.json";
  link.click();
  URL.revokeObjectURL(url);
  setStatus("Order JSON siap diunduh", "ok");
};

const init = () => {
  incomeEndpointInput.value = DEFAULT_INCOME_ENDPOINT;
  orderEndpointInput.value = DEFAULT_ORDER_ENDPOINT;
  incomePayloadInput.value = "";
  setStatus("Belum ada permintaan.");
  setOutput("", "");
  clearRendered();

  fetchBtn.addEventListener("click", fetchData);
  resetIncomeBtn.addEventListener("click", () => {
    incomeEndpointInput.value = DEFAULT_INCOME_ENDPOINT;
  });
  resetOrderBtn.addEventListener("click", () => {
    orderEndpointInput.value = DEFAULT_ORDER_ENDPOINT;
  });
  incomeEndpointInput.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter" && (evt.metaKey || evt.ctrlKey)) fetchData();
  });
  orderEndpointInput.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter" && (evt.metaKey || evt.ctrlKey)) fetchData();
  });

  copyIncomeBtn.addEventListener("click", copyIncomeOutput);
  downloadIncomeBtn.addEventListener("click", downloadIncomeOutput);
  copyOrderBtn.addEventListener("click", copyOrderOutput);
  downloadOrderBtn.addEventListener("click", downloadOrderOutput);

  let incomeSettingsOpen = false;
  let orderSettingsOpen = false;
  const updateIncomeSettings = () => {
    incomeSettingsEl.classList.toggle("open", incomeSettingsOpen);
    toggleIncomeSettingsBtn.textContent = incomeSettingsOpen ? "Sembunyikan" : "Tampilkan";
  };
  const updateOrderSettings = () => {
    orderSettingsEl.classList.toggle("open", orderSettingsOpen);
    toggleOrderSettingsBtn.textContent = orderSettingsOpen ? "Sembunyikan" : "Tampilkan";
  };
  toggleIncomeSettingsBtn.addEventListener("click", () => {
    incomeSettingsOpen = !incomeSettingsOpen;
    updateIncomeSettings();
  });
  toggleOrderSettingsBtn.addEventListener("click", () => {
    orderSettingsOpen = !orderSettingsOpen;
    updateOrderSettings();
  });
  updateIncomeSettings();
  updateOrderSettings();

  let summaryOpen = true;
  const updateSummaryToggle = () => {
    renderedSection.classList.toggle("hidden", !summaryOpen);
    toggleSummaryBtn.textContent = summaryOpen ? "Sembunyikan Ringkasan" : "Tampilkan Ringkasan";
  };
  toggleSummaryBtn.addEventListener("click", () => {
    summaryOpen = !summaryOpen;
    updateSummaryToggle();
  });
  updateSummaryToggle();

  let incomeRawOpen = true;
  let orderRawOpen = true;
  const updateIncomeRawToggle = () => {
    outputIncomeEl.classList.toggle("hidden", !incomeRawOpen);
    toggleIncomeRawBtn.textContent = incomeRawOpen ? "Sembunyikan" : "Tampilkan";
  };
  const updateOrderRawToggle = () => {
    outputOrderEl.classList.toggle("hidden", !orderRawOpen);
    toggleOrderRawBtn.textContent = orderRawOpen ? "Sembunyikan" : "Tampilkan";
  };
  toggleIncomeRawBtn.addEventListener("click", () => {
    incomeRawOpen = !incomeRawOpen;
    updateIncomeRawToggle();
  });
  toggleOrderRawBtn.addEventListener("click", () => {
    orderRawOpen = !orderRawOpen;
    updateOrderRawToggle();
  });
  updateIncomeRawToggle();
  updateOrderRawToggle();
};

document.addEventListener("DOMContentLoaded", init);
