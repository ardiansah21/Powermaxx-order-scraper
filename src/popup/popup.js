const DEFAULT_INCOME_ENDPOINT =
  "https://seller.shopee.co.id/api/v4/accounting/pc/seller_income/income_detail/get_order_income_components";
const DEFAULT_ORDER_ENDPOINT =
  "https://seller.shopee.co.id/api/v3/order/get_one_order";
const DEFAULT_COMPONENTS = "2,3,4,5";
const SETTINGS_KEY = "arvaSettings";
const DEFAULT_SETTINGS = {
  defaultMarketplace: "shopee",
  marketplaces: {
    shopee: {
      baseUrl: "https://powermaxx.test",
      token: "",
      incomeEndpoint: DEFAULT_INCOME_ENDPOINT,
      orderEndpoint: DEFAULT_ORDER_ENDPOINT
    },
    tiktok: {
      baseUrl: "https://powermaxx.test",
      token: ""
    }
  }
};

const fetchBtn = document.getElementById("fetchBtn");
const statusEl = document.getElementById("status");
const sendExportBtn = document.getElementById("sendExportBtn");
const openSettingsBtn = document.getElementById("openSettingsBtn");
const openViewerBtn = document.getElementById("openViewerBtn");
const statusSpinner = document.getElementById("statusSpinner");
const errorBox = document.getElementById("errorBox");
const errorTextEl = document.getElementById("errorText");
const copyErrorBtn = document.getElementById("copyErrorBtn");
const sellerBreakdownEl = null;
const buyerBreakdownEl = null;
const orderSummaryEl = null;
const outputIncomeEl = null;
const outputOrderEl = null;
const incomeSheetTableEl = null;
const orderSheetTableEl = null;

let viewerPayloadCache = null;
let settingsCache = DEFAULT_SETTINGS;
let activeMarketplace = "shopee";

const setStatus = (message, tone = "info") => {
  statusEl.textContent = message;
  statusEl.classList.remove("ok", "error");
  if (tone === "ok") statusEl.classList.add("ok");
  if (tone === "error") statusEl.classList.add("error");
};

const setOutput = () => {};

const saveViewerPayload = (payload) => {
  viewerPayloadCache = payload;
  if (!chrome?.storage?.local) return;
  try {
    chrome.storage.local.set({ viewerPayload: payload });
  } catch (e) {
    console.warn("Gagal menyimpan viewer payload", e);
  }
};

const buildExportPayload = () => ({
  marketplace: activeMarketplace,
  shopee_get_one_order_json: viewerPayloadCache?.orderRawJson || null,
  shopee_get_order_income_components_json: viewerPayloadCache?.incomeRawJson || null
});

const normalizeBaseUrl = (value) => (value || "").trim().replace(/\/+$/, "");

const getStorageArea = () => chrome.storage?.sync || chrome.storage?.local;

const loadSettings = async () => {
  const storage = getStorageArea();
  if (!storage) return DEFAULT_SETTINGS;
  return new Promise((resolve) => {
    storage.get([SETTINGS_KEY], (result) => {
      const stored = result?.[SETTINGS_KEY];
      if (!stored) return resolve(DEFAULT_SETTINGS);
      resolve({
        ...DEFAULT_SETTINGS,
        ...stored,
        marketplaces: {
          ...DEFAULT_SETTINGS.marketplaces,
          ...(stored.marketplaces || {})
        }
      });
    });
  });
};

const saveSettings = async (settings) => {
  const storage = getStorageArea();
  if (!storage) return;
  return new Promise((resolve) => {
    storage.set({ [SETTINGS_KEY]: settings }, resolve);
  });
};

const detectMarketplace = (url) => {
  if (!url) return settingsCache.defaultMarketplace || "shopee";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch (e) {
    return settingsCache.defaultMarketplace || "shopee";
  }
  if (host.includes("shopee")) return "shopee";
  if (host.includes("tiktok")) return "tiktok";
  return settingsCache.defaultMarketplace || "shopee";
};

const setLoading = (isLoading) => {
  statusSpinner.classList.toggle("hidden", !isLoading);
};

const setError = (message) => {
  if (!message) {
    errorBox.classList.add("hidden");
    errorTextEl.textContent = "";
    return;
  }
  errorBox.classList.remove("hidden");
  errorTextEl.textContent = message;
};

const sendExportRequest = async () => {
  const cfg = settingsCache.marketplaces?.[activeMarketplace] || {};
  const baseUrl = normalizeBaseUrl(cfg.baseUrl);
  const token = (cfg.token || "").trim();
  if (!baseUrl) {
    setStatus("Base URL wajib diisi.", "error");
    setError("Base URL belum diatur. Buka Pengaturan terlebih dahulu.");
    return;
  }
  if (!token) {
    setStatus("Bearer token wajib diisi.", "error");
    setError("Bearer token belum diatur. Buka Pengaturan terlebih dahulu.");
    return;
  }
  if (!viewerPayloadCache?.orderRawJson || !viewerPayloadCache?.incomeRawJson) {
    setStatus("Data belum ada. Klik Ambil Data terlebih dahulu.", "error");
    setError("Belum ada data yang bisa dikirim.");
    return;
  }

  const url = `${baseUrl}/api/orders/import`;
  sendExportBtn.disabled = true;
  setStatus("Mengirim data ke API...", "info");
  setError("");
  setLoading(true);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify(buildExportPayload())
    });
    const text = await response.text();
    if (response.ok) {
      setStatus(`Export OK ${response.status}`, "ok");
    } else {
      const message = `Export gagal ${response.status}: ${response.statusText || "Error"}`;
      setStatus(message, "error");
      setError(text || message);
    }
    console.info("Export response:", text);
  } catch (err) {
    setStatus(`Gagal mengirim: ${err.message}`, "error");
    setError(err.message);
  } finally {
    setLoading(false);
    sendExportBtn.disabled = false;
  }
};

const openOptionsPage = () => {
  if (!chrome?.runtime?.openOptionsPage) return;
  chrome.runtime.openOptionsPage();
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

const formatRupiahDigits = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[^\d-]/g, "");
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

const sanitizeCell = (value) => {
  const raw = value ?? "";
  return String(raw).replace(/[\t\r\n]+/g, " ").trim();
};

const formatIncomeAmount = (amount) => {
  if (amount === null || amount === undefined) return "";
  const num = Number(amount);
  if (!Number.isFinite(num)) return "";
  const rupiah = Math.round(num / 100000);
  if (rupiah === 0) return "0";
  const absValue = Math.abs(rupiah);
  return rupiah < 0 ? `-${absValue}` : String(absValue);
};

const buildVoucherDisplayName = (sub) => {
  const base = sub?.display_name ?? "";
  const codes = Array.isArray(sub?.ext_info?.seller_voucher_codes)
    ? sub.ext_info.seller_voucher_codes
    : [];
  if (!codes.length) return base;
  const cleanedCodes = codes
    .map((code) => String(code ?? "").trim())
    .filter((code) => code !== "");
  if (!cleanedCodes.length) return base;
  const joinedCodes = cleanedCodes.join(", ");
  if (base.includes("{voucher code}")) {
    return base.replace("{voucher code}", joinedCodes);
  }
  if (base.includes("{voucher_code}")) {
    return base.replace("{voucher_code}", joinedCodes);
  }
  return `${base} - ${joinedCodes}`;
};

const buildIncomeSheet = (incomeData) => {
  const breakdown = Array.isArray(incomeData?.seller_income_breakdown?.breakdown)
    ? incomeData.seller_income_breakdown.breakdown
    : [];
  if (!breakdown.length) return { headers: [], rows: [], copy: "" };

  const orderId = incomeData?.order_info?.order_id ?? "";
  const orderSn = incomeData?.order_info?.order_sn ?? "";
  const headers = [
    "order_id",
    "order_sn",
    "level",
    "parent_field_name",
    "field_name",
    "display_name",
    "amount"
  ];
  const rows = [];

  breakdown.forEach((item) => {
    rows.push([
      orderId,
      orderSn,
      "breakdown",
      "",
      item?.field_name ?? "",
      item?.display_name ?? "",
      formatIncomeAmount(item?.amount)
    ]);

    if (!Array.isArray(item?.sub_breakdown) || item.sub_breakdown.length === 0) {
      return;
    }

    const subBreakdowns = item.sub_breakdown;
    subBreakdowns.forEach((sub) => {
      rows.push([
        orderId,
        orderSn,
        "sub_breakdown",
        item?.field_name ?? "",
        sub?.field_name ?? "",
        buildVoucherDisplayName(sub),
        formatIncomeAmount(sub?.amount)
      ]);

      if (sub?.field_name !== "SERVICE_FEE") return;
      const fees = sub?.ext_info?.service_fee_infos;
      if (!Array.isArray(fees) || !fees.length) return;
      fees.forEach((fee) => {
        const feeName = fee?.name ?? "";
        rows.push([
          orderId,
          orderSn,
          "service_fee_infos",
          sub?.field_name ?? "",
          feeName,
          feeName,
          formatIncomeAmount(fee?.amount)
        ]);
      });
    });
  });

  const sanitizedRows = rows.map((row) => row.map(sanitizeCell));
  const copy = [headers, ...sanitizedRows].map((row) => row.join("\t")).join("\n");
  return { headers, rows: sanitizedRows, copy };
};

const buildOrderSheet = (orderData) => {
  const headers = [
    "local.process_date",
    "payby_date",
    "order_id",
    "order_sn",
    "remark",
    "note",
    "order_items.item_id",
    "order_items.model_id",
    "order_items.sku",
    "order_items.item_model.sku",
    "order_items.amount",
    "order_items.order_price",
    "total_price"
  ];
  if (!orderData) return { headers, rows: [], copy: "" };
  const items = Array.isArray(orderData.order_items) ? orderData.order_items : [];
  const processDate = formatLocalDateTime(Date.now());
  const paybyDate = formatLocalDateTime(orderData.payby_date);
  const orderId = orderData.order_id ?? "";
  const orderSn = orderData.order_sn ?? "";
  const remark = orderData.remark ?? "";
  const note = orderData.note ?? "";
  const totalPrice = formatRupiahDigits(orderData.total_price ?? "");

  if (!items.length) {
    return { headers, rows: [], copy: "" };
  }

  const rows = items.map((item) => {
    const sku = item?.product?.sku || item?.sku || item?.item_model?.sku || "";
    const itemModelSku = item?.item_model?.sku || "";
    const itemId = item?.item_id ?? item?.item_model?.item_id ?? "";
    const modelId = item?.model_id ?? item?.item_model?.model_id ?? "";
    const amount = item?.amount ?? "";
    const orderPrice = formatRupiahDigits(item?.order_price ?? "");
    return [
      processDate,
      paybyDate,
      orderId,
      orderSn,
      remark,
      note,
      itemId,
      modelId,
      sku,
      itemModelSku,
      amount,
      orderPrice,
      totalPrice
    ].map(sanitizeCell);
  });

  const copy = rows.map((row) => row.join("\t")).join("\n");
  return { headers, rows, copy };
};

const clearRendered = () => {};

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
  setError("");
  setLoading(true);
  setOutput("", "");
  clearRendered();
  fetchBtn.disabled = true;
  openViewerBtn.disabled = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus("Tidak ada tab aktif ditemukan.", "error");
    setError("Tidak ada tab aktif. Buka halaman seller lalu coba lagi.");
    fetchBtn.disabled = false;
    openViewerBtn.disabled = false;
    setLoading(false);
    return;
  }
  activeMarketplace = detectMarketplace(tab.url);

  if (activeMarketplace !== "shopee") {
    setStatus("Fetch hanya tersedia untuk Shopee saat ini.", "error");
    setError("Marketplace aktif bukan Shopee.");
    fetchBtn.disabled = false;
    openViewerBtn.disabled = false;
    setLoading(false);
    return;
  }
  const incomeCfg = settingsCache.marketplaces?.shopee || {};
  const incomeUrl = incomeCfg.incomeEndpoint || DEFAULT_INCOME_ENDPOINT;
  const orderUrl = incomeCfg.orderEndpoint || DEFAULT_ORDER_ENDPOINT;
  const bodyOverride = "";

  try {
    const [execResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: pageFetcher,
      args: [incomeUrl, orderUrl, bodyOverride, DEFAULT_COMPONENTS]
    });
    const result = execResult?.result;
    if (!result) {
      setStatus("Tidak ada hasil dari tab (mungkin diblokir CSP atau error lain).", "error");
      setError("Eksekusi script di tab gagal. Coba refresh halaman seller.");
      openViewerBtn.disabled = false;
      return;
    }
    if (result.error) {
      setStatus(`Gagal di tab: ${result.error}`, "error");
      setError(result.error);
      openViewerBtn.disabled = false;
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
    const orderSheet = buildOrderSheet(parsedOrder?.data);
    const incomeSheet = buildIncomeSheet(parsedIncome?.data);
    const orderSn = parsedOrder?.data?.order_sn || parsedIncome?.data?.order_info?.order_sn || "";
    saveViewerPayload({
      updatedAt: Date.now(),
      orderId: result.orderId || "",
      orderSn,
      incomeSheet,
      orderSheet,
      incomeRaw: incomePretty,
      orderRaw: orderPretty,
      incomeRawJson: parsedIncome || null,
      orderRawJson: parsedOrder || null
    });

    const incomeOk = result.income?.ok;
    const orderOk = result.order?.ok;

    if (incomeOk) {
      setStatus(
        `Income OK ${result.income.status} | Order ${orderOk ? "OK" : "ERR"} ${result.order?.status || 0}`,
        "ok"
      );
    } else {
      const message = `Income error ${result.income?.status || 0} (${result.income?.statusText || "Permintaan gagal"})`;
      setStatus(message, "error");
      setError(message);
    }
    openViewerBtn.disabled = false;
  } catch (err) {
    setStatus(`Gagal mengambil data: ${err.message}`, "error");
    setError(err.message);
    setOutput(String(err), "");
  } finally {
    fetchBtn.disabled = false;
    setLoading(false);
  }
};

const openViewerPage = async () => {
  const url = chrome.runtime.getURL("src/viewer/viewer.html");
  try {
    await chrome.tabs.create({ url });
  } catch (err) {
    setStatus(`Gagal membuka viewer: ${err.message}`, "error");
  }
};

const init = async () => {
  settingsCache = await loadSettings();
  setStatus("Belum ada permintaan.");
  setError("");
  setLoading(false);
  setOutput("", "");
  clearRendered();

  fetchBtn.addEventListener("click", fetchData);
  if (openViewerBtn) openViewerBtn.addEventListener("click", openViewerPage);
  if (sendExportBtn) sendExportBtn.addEventListener("click", sendExportRequest);
  if (openSettingsBtn) openSettingsBtn.addEventListener("click", openOptionsPage);
  if (copyErrorBtn) {
    copyErrorBtn.addEventListener("click", async () => {
      const text = errorTextEl.textContent.trim();
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setStatus("Error dicopy.", "ok");
      } catch (err) {
        setStatus(`Gagal copy error: ${err.message}`, "error");
      }
    });
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeMarketplace = detectMarketplace(tab?.url);
  } catch (e) {
    activeMarketplace = settingsCache.defaultMarketplace || "shopee";
  }
  openViewerBtn.disabled = true;
  setStatus("Siap digunakan.", "ok");
};

document.addEventListener("DOMContentLoaded", init);
