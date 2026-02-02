const SETTINGS_KEY = "arvaSettings";
const DEFAULT_COMPONENTS = "2,3,4,5";
const DEFAULT_SHOPEE_SEARCH_ENDPOINT =
  "https://seller.shopee.co.id/api/v3/order/get_order_list_search_bar_hint";

const DEFAULT_INCOME_ENDPOINT =
  "https://seller.shopee.co.id/api/v4/accounting/pc/seller_income/income_detail/get_order_income_components";
const DEFAULT_ORDER_ENDPOINT =
  "https://seller.shopee.co.id/api/v3/order/get_one_order";
const DEFAULT_TIKTOK_ORDER_ENDPOINT =
  "https://seller-id.tokopedia.com/api/fulfillment/order/get";
const DEFAULT_TIKTOK_STATEMENT_ENDPOINT =
  "https://seller-id.tokopedia.com/api/v1/pay/statement/order/list";
const DEFAULT_TIKTOK_STATEMENT_DETAIL_ENDPOINT =
  "https://seller-id.tokopedia.com/api/v1/pay/statement/transaction/detail";
const DEFAULT_TIKTOK_AWB_GENERATE_ENDPOINT =
  "https://seller-id.tokopedia.com/api/v1/fulfillment/shipping_doc/generate";
const DEFAULT_TIKTOK_AWB_FILE_PREFIX = "Shipping label";

const DEFAULT_AWB_PACKAGE_ENDPOINT =
  "https://seller.shopee.co.id/api/v3/order/get_package";
const DEFAULT_AWB_CREATE_JOB_ENDPOINT =
  "https://seller.shopee.co.id/api/v3/logistics/create_sd_jobs";
const DEFAULT_AWB_DOWNLOAD_JOB_ENDPOINT =
  "https://seller.shopee.co.id/api/v3/logistics/download_sd_job";
const DEFAULT_AWB_REGION_ID = "ID";
const DEFAULT_AWB_ASYNC_VERSION = "0.2";
const DEFAULT_AWB_FILE_TYPE = "THERMAL_PDF";
const DEFAULT_AWB_FILE_NAME = "Label Pengiriman";
const DEFAULT_AWB_FILE_CONTENTS = "3";

const DEFAULT_TEMPLATES = {
  shopee: "https://seller.shopee.co.id/portal/sale/order/{order_id}",
  tiktok_shop:
    "https://seller-id.tokopedia.com/order/detail?order_no={order_sn}&shop_region=ID"
};

const marketplaceEl = document.getElementById("marketplace");
const actionEl = document.getElementById("bulkAction");
const delayEl = document.getElementById("delayMs");
const orderListEl = document.getElementById("orderList");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");
const progressTextEl = document.getElementById("progressText");
const logListEl = document.getElementById("logList");
const summaryTotalEl = document.getElementById("summaryTotal");
const summarySuccessEl = document.getElementById("summarySuccess");
const summaryErrorEl = document.getElementById("summaryError");
const summarySkippedEl = document.getElementById("summarySkipped");
const summaryTextEl = document.getElementById("summaryText");

let settingsCache = null;
let bridgeOrders = null;
let running = false;
let cancelRun = false;
let shopeeSearchTabId = null;

const getStorageArea = () => chrome.storage?.sync || chrome.storage?.local;

const loadSettings = async () => {
  const storage = getStorageArea();
  if (!storage) return {};
  return new Promise((resolve) => {
    storage.get([SETTINGS_KEY], (result) => {
      const stored = result?.[SETTINGS_KEY] || {};
      const storedMarketplaces = stored.marketplaces || {};
      const legacyTikTok = storedMarketplaces.tiktok || {};
      const tiktokShopStored = storedMarketplaces.tiktok_shop || legacyTikTok;
      resolve({
        ...stored,
        marketplaces: {
          shopee: {
            ...(storedMarketplaces.shopee || {})
          },
          tiktok_shop: {
            ...tiktokShopStored
          }
        },
        auth: stored.auth || {}
      });
    });
  });
};

const setStatus = (message) => {
  statusEl.textContent = message;
};

const setProgress = (done, total) => {
  progressTextEl.textContent = `${done}/${total}`;
};

const setSummary = (summary, note) => {
  summaryTotalEl.textContent = summary.total;
  summarySuccessEl.textContent = summary.success;
  summaryErrorEl.textContent = summary.error;
  summarySkippedEl.textContent = summary.skipped;
  summaryTextEl.textContent = note || "Siap.";
};

const resetLogs = () => {
  logListEl.innerHTML = "";
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "\"":
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });

const buildLogItem = (orderId, status, message, detail, copyText) => {
  const item = document.createElement("li");
  item.className = `log-item ${status}`;
  item.dataset.orderId = orderId;
  const detailText = String(detail || "").trim();
  const trimmedMessage = String(message || "").trim();
  const detailLines = detailText ? detailText.split(/\r?\n/).filter(Boolean) : [];
  const cleanedDetail = detailLines
    .filter((line) => line.trim() && line.trim() !== trimmedMessage)
    .join("\n")
    .trim();
  const fullMessage = cleanedDetail ? `${trimmedMessage}\n${cleanedDetail}` : trimmedMessage;
  const allowCopy = status === "error" && fullMessage.length > 0;
  const fallbackCopy = `${orderId} | ${fullMessage}`;
  item.dataset.copyText = allowCopy ? copyText || fallbackCopy : "";
  item.innerHTML = `
    <div class="log-main">
      <div class="log-text">
        <div class="log-id">${escapeHtml(orderId)}</div>
        <div class="log-message">${escapeHtml(fullMessage)}</div>
      </div>
      ${allowCopy ? '<button class="copy-log" type="button">Copy</button>' : ""}
    </div>
  `;
  return item;
};

const addLog = (orderId, status, message, detail, copyText) => {
  const item = buildLogItem(orderId, status, message, detail, copyText);
  logListEl.appendChild(item);
  return item;
};

const updateLog = (orderId, status, message, detail, copyText) => {
  const existing = logListEl.querySelector(`[data-order-id="${orderId}"]`);
  const item = buildLogItem(orderId, status, message, detail, copyText);
  if (existing) {
    existing.replaceWith(item);
  } else {
    logListEl.appendChild(item);
  }
  return item;
};

const parseOrders = (raw) =>
  raw
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);

const normalizeMarketplaceValue = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "shopee") return "shopee";
  if (normalized === "tiktok_shop" || normalized === "tiktok" || normalized === "tiktok shop") {
    return "tiktok_shop";
  }
  if (normalized === "auto") return "auto";
  return "";
};

const normalizeIdType = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "mp_order_id" || raw === "order_id") return "order_id";
  if (raw === "order_sn") return "order_sn";
  return "";
};

const normalizeOrderEntry = (entry, fallbackMarketplace) => {
  if (entry === null || entry === undefined) return null;
  if (typeof entry === "string" || typeof entry === "number") {
    const id = String(entry).trim();
    if (!id) return null;
    return {
      id,
      marketplace: normalizeMarketplaceValue(fallbackMarketplace),
      idType: ""
    };
  }
  const rawId =
    entry?.mp_order_id ??
    entry?.order_id ??
    entry?.order_sn ??
    entry?.id ??
    entry?.orderId ??
    entry?.orderSn;
  const id = String(rawId || "").trim();
  if (!id) return null;
  const marketplace =
    normalizeMarketplaceValue(entry?.marketplace) ||
    normalizeMarketplaceValue(fallbackMarketplace);
  let idType = normalizeIdType(entry?.id_type || entry?.idType);
  if (!idType) {
    if (entry?.mp_order_id !== undefined || entry?.order_id !== undefined) {
      idType = "order_id";
    } else if (entry?.order_sn !== undefined || entry?.orderSn !== undefined) {
      idType = "order_sn";
    }
  }
  return {
    id,
    marketplace,
    idType
  };
};

const normalizeOrderEntries = (entries, fallbackMarketplace) =>
  (Array.isArray(entries) ? entries : [])
    .map((entry) => normalizeOrderEntry(entry, fallbackMarketplace))
    .filter(Boolean);

const resolveOrderList = (selectedMarketplace) => {
  if (bridgeOrders && bridgeOrders.length) return bridgeOrders;
  return parseOrders(orderListEl.value).map((id) => ({
    id,
    marketplace: normalizeMarketplaceValue(selectedMarketplace) || "auto",
    idType: ""
  }));
};

const resetSummary = (total = 0) =>
  setSummary({ total, success: 0, error: 0, skipped: 0 }, "Siap.");

const getMarketplaceLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "shopee") return "Shopee";
  if (normalized === "tiktok_shop" || normalized === "tiktok" || normalized === "tiktok shop") {
    return "TikTok Shop";
  }
  if (normalized === "auto") return "Auto";
  return String(value || "").toUpperCase();
};

const formatLogMessage = (marketplaceLabel, message) =>
  `${marketplaceLabel}: ${message}`;

const normalizeErrorText = (value) =>
  String(value || "")
    .replace(/^Error:\s*/i, "")
    .trim();

const pruneEmptyFields = (value) => {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => pruneEmptyFields(item))
      .filter((item) => item !== undefined);
    return items.length ? items : undefined;
  }
  if (value && typeof value === "object") {
    const result = {};
    Object.entries(value).forEach(([key, entry]) => {
      const pruned = pruneEmptyFields(entry);
      if (pruned !== undefined) result[key] = pruned;
    });
    return Object.keys(result).length ? result : undefined;
  }
  if (value === "" || value === null || value === undefined) return undefined;
  return value;
};

const buildBulkErrorDetailPayload = (message, detail) => {
  const payload = detail && typeof detail === "object" ? { ...detail } : detail || null;
  const status = detail?.status ?? detail?.response?.status;
  const statusText = detail?.statusText ?? detail?.response?.statusText;
  const shopeeMessage =
    detail?.detail?.user_message ||
    detail?.detail?.message ||
    detail?.response?.user_message ||
    detail?.response?.message ||
    "";
  const tiktokMessages = extractTikTokMessages(detail);
  const context = {};
  if (detail?.marketplace) context.marketplace = detail.marketplace;
  if (detail?.stage) context.step = detail.stage;
  if (detail?.orderId) context.orderId = detail.orderId;
  if (detail?.orderUrl) context.url = detail.orderUrl;
  if (detail?.tabUrl) context.tabUrl = detail.tabUrl;
  if (status !== "" && status !== undefined && status !== null) context.status = status;
  if (statusText) context.statusText = statusText;
  if (detail?.endpoints) context.endpoints = detail.endpoints;

  const summary = message ? { title: message } : {};
  if (tiktokMessages.length) {
    summary.subtitle = tiktokMessages.join(" • ");
  } else if (shopeeMessage) {
    summary.subtitle = String(shopeeMessage || "").trim();
  }
  const trace = detail?.error?.stack || detail?.trace || detail?.stack || "";

  if (payload && typeof payload === "object") {
    [
      "marketplace",
      "stage",
      "orderId",
      "orderUrl",
      "tabUrl",
      "status",
      "statusText",
      "endpoints",
      "stack",
      "trace"
    ].forEach((key) => {
      delete payload[key];
    });
  }

  const externalResponse = pruneEmptyFields(payload);
  const output = {};
  const prunedSummary = pruneEmptyFields(summary);
  const prunedContext = pruneEmptyFields(context);
  if (prunedSummary) output.summary = prunedSummary;
  if (prunedContext) output.context = prunedContext;
  if (externalResponse !== undefined) output.externalResponse = externalResponse;
  const prunedTrace = pruneEmptyFields(trace);
  if (prunedTrace) output.trace = prunedTrace;
  if (!Object.keys(output).length) {
    output.summary = { title: "Unknown error" };
  }
  return output;
};

const parseJsonMaybe = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return value;
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    return value;
  }
};

const normalizePayloadForLog = (value) => {
  const parsed = parseJsonMaybe(value);
  if (Array.isArray(parsed)) {
    return parsed.map((item) => normalizePayloadForLog(item));
  }
  if (parsed && typeof parsed === "object") {
    const output = {};
    Object.entries(parsed).forEach(([key, entry]) => {
      output[key] = normalizePayloadForLog(entry);
    });
    return output;
  }
  return parsed;
};

const extractTikTokMessages = (detail) => {
  const messages = [];
  const seen = new Set();
  const pushMessage = (value) => {
    const text = String(value || "").trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    messages.push(text);
  };
  const visit = (value) => {
    if (!value) return;
    const parsed = parseJsonMaybe(value);
    if (typeof parsed === "string") return;
    const obj = parsed;
    if (obj?.hint) pushMessage(obj.hint);
    if (obj?.appMessage && obj?.appCode && obj?.appCode !== 0) {
      pushMessage(obj.appMessage);
    }
    if (obj?.message && obj?.code !== undefined && obj?.code !== 0) {
      pushMessage(obj.message);
    }
    if (Array.isArray(obj?.failed_reason)) {
      obj.failed_reason.forEach((reason) => {
        pushMessage(reason?.status_msg_sop_text);
        pushMessage(reason?.status_msg_text);
      });
    }
    ["detail", "body", "income", "incomeDetail", "order", "data"].forEach((key) => {
      if (obj?.[key]) visit(obj[key]);
    });
  };

  visit(detail);
  return messages;
};

const buildAbilitySummary = ({ fetched, awbOk, exportOk, awbRequested = true }) => {
  const can = [];
  const cannot = [];
  if (fetched) {
    can.push("Ambil data");
  } else {
    cannot.push("Ambil data");
  }
  if (!awbRequested) {
    can.push("Download AWB (dilewati)");
  } else if (awbOk) {
    can.push("Download AWB");
  } else {
    cannot.push("Download AWB");
  }
  if (exportOk) {
    can.push("Kirim ke API");
  } else {
    cannot.push("Kirim ke API");
  }
  return { can, cannot };
};

const snippet = (value, max = 400) => {
  const text = String(value || "");
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
};

const classifyError = (message) => {
  const raw = String(message || "").toLowerCase();
  if (!raw) return "UNKNOWN";
  if (raw.includes("cannot access contents of the page")) return "EXTENSION_PERMISSION";
  if (raw.includes("failed to fetch")) return "NETWORK_OR_CORS";
  if (raw.includes("timeout")) return "TIMEOUT";
  if (raw.includes("unauthorized") || raw.includes("forbidden")) return "AUTH";
  if (raw.includes("invalid params")) return "INVALID_PARAMS";
  return "UNKNOWN";
};

const buildFetchMeta = (meta) => {
  if (!meta) return null;
  return {
    status: meta.status,
    statusText: meta.statusText,
    appCode: meta.appCode,
    appMessage: meta.appMessage,
    url: meta.finalUrl || ""
  };
};

const isAllowedUrl = (url, marketplace) => {
  if (!url) return false;
  const normalized = String(marketplace || "").trim().toLowerCase();
  if (normalized === "shopee") return url.includes("seller.shopee.co.id");
  if (normalized === "tiktok_shop" || normalized === "tiktok" || normalized === "tiktok shop") {
    return url.includes("seller-id.tokopedia.com");
  }
  return false;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForAllowedUrl = async (tabId, marketplace, fallbackUrl) => {
  const normalizedMarketplace = String(marketplace || "").trim().toLowerCase();
  const timeoutMs = 30000;
  const intervalMs = 400;
  let elapsed = 0;
  let lastUrl = "";

  while (elapsed <= timeoutMs) {
    const tabInfo = await chrome.tabs.get(tabId);
    const url = tabInfo?.url || tabInfo?.pendingUrl || "";
    if (url) lastUrl = url;
    if (isAllowedUrl(url, normalizedMarketplace)) {
      return url;
    }
    if (
      !url &&
      tabInfo?.status === "complete" &&
      isAllowedUrl(fallbackUrl, normalizedMarketplace)
    ) {
      return fallbackUrl;
    }
    await sleep(intervalMs);
    elapsed += intervalMs;
  }

  const hintUrl = lastUrl || fallbackUrl || "-";
  throw new Error(
    `URL bukan ${getMarketplaceLabel(marketplace)}. Pastikan login dan halaman terbuka. URL: ${hintUrl}`
  );
};

const withTimeout = (promise, ms, message) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message || "Timeout proses."));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });

const normalizeBaseUrl = (value) => (value || "").trim().replace(/\/+$/, "");

const buildOrderUrl = (template, orderSn) => {
  if (!template.includes("{order_sn}")) {
    throw new Error("Template URL wajib berisi {order_sn}.");
  }
  return template.replace("{order_sn}", encodeURIComponent(orderSn));
};

const waitForTabComplete = (tabId) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Timeout membuka tab."));
    }, 45000);
    const listener = (updatedTabId, info) => {
      if (updatedTabId !== tabId) return;
      if (info.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });

const ensureShopeeSearchTab = async () => {
  try {
    if (shopeeSearchTabId) {
      await chrome.tabs.get(shopeeSearchTabId);
      return shopeeSearchTabId;
    }
  } catch (e) {
    shopeeSearchTabId = null;
  }

  const tab = await chrome.tabs.create({
    url: "https://seller.shopee.co.id/portal/sale/order",
    active: false
  });
  shopeeSearchTabId = tab.id;
  await waitForTabComplete(tab.id);
  return tab.id;
};

const resolveShopeeOrderId = async (orderSn, searchEndpoint) => {
  const tabId = await ensureShopeeSearchTab();
  const [execResult] = await chrome.scripting.executeScript({
    target: { tabId },
    func: (endpoint, keyword) => {
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

      const safeJson = (raw) => {
        try {
          return JSON.parse(raw);
        } catch (e) {
          return null;
        }
      };

      const buildUrl = () => {
        const url = new URL(endpoint);
        const cds = pickCookie("SPC_CDS");
        const cdsVer = pickCookie("SPC_CDS_VER");
        if (!url.searchParams.get("SPC_CDS") && cds) {
          url.searchParams.set("SPC_CDS", cds);
        }
        if (!url.searchParams.get("SPC_CDS_VER")) {
          url.searchParams.set("SPC_CDS_VER", cdsVer || "2");
        }
        url.searchParams.set("keyword", keyword);
        url.searchParams.set("category", "1");
        url.searchParams.set("order_list_tab", "100");
        url.searchParams.set("entity_type", "1");
        return url;
      };

      return fetch(buildUrl().toString(), {
        method: "GET",
        headers: { accept: "application/json, text/plain, */*" },
        credentials: "include"
      })
        .then((resp) => resp.text().then((body) => ({ resp, body })))
        .then(({ resp, body }) => {
          const json = safeJson(body);
          const list = json?.data?.order_sn_result?.list || [];
          const match =
            list.find((item) => String(item.order_sn) === String(keyword)) || list[0];
          return {
            ok: resp.ok && json?.code === 0,
            orderId: match?.order_id || null,
            body
          };
        })
        .catch((err) => ({ ok: false, orderId: null, error: err.message }));
    },
    args: [searchEndpoint, orderSn]
  });

  const result = execResult?.result || {};
  return result;
};

const buildExportPayload = (marketplace, payload) => {
  if (marketplace === "tiktok_shop") {
    return {
      marketplace: "tiktok_shop",
      tiktok_shop_fulfillment_order_get_json: payload.orderRawJson || null,
      tiktok_shop_statement_json: {
        statement_order_list: payload.incomeRawJson || null,
        statement_transaction_detail: payload.incomeDetailRawJson || null
      }
    };
  }
  return {
    marketplace: "shopee",
    shopee_get_one_order_json: payload.orderRawJson || null,
    shopee_get_order_income_components_json: payload.incomeRawJson || null
  };
};

const sendExport = async (baseUrl, token, payload) => {
  const url = `${baseUrl}/api/orders/import`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-requested-with": "XMLHttpRequest",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    const isJson = contentType.includes("application/json");
    const body = isJson ? text : "";
    const htmlSnippet = !isJson && text ? snippet(text, 500) : "";
    let data = null;
    if (isJson && text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = null;
      }
    }
    const unauthenticated =
      [401, 403, 419].includes(response.status) ||
      String(data?.message || "").toLowerCase().includes("unauthenticated") ||
      String(text || "").toLowerCase().includes("unauthenticated");
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body,
      htmlSnippet,
      url,
      unauthenticated
    };
  } catch (err) {
    const hint =
      "Periksa Base URL, HTTPS/sertifikat, CORS server, dan koneksi jaringan.";
    return {
      ok: false,
      status: 0,
      statusText: "FETCH_ERROR",
      body: "",
      url,
      error: {
        name: err?.name || "Error",
        message: err?.message || "Failed to fetch",
        hint
      }
    };
  }
};

/* global bulkTabRunner */

const runBulk = async () => {
  if (running) return;
  cancelRun = false;
  running = true;

  settingsCache = await loadSettings();
  const selectedMarketplace =
    normalizeMarketplaceValue(marketplaceEl.value || "auto") || "auto";
  const actionMode = String(actionEl?.value || "all");
  const includeAwb = actionMode === "all";
  const orders = resolveOrderList(selectedMarketplace);
  const delayMs = Number(delayEl.value || 0);

  if (!orders.length) {
    setStatus("Daftar order masih kosong.");
    setSummary({ total: 0, success: 0, error: 0, skipped: 0 }, "Daftar kosong.");
    running = false;
    return;
  }

  const token = settingsCache?.auth?.token || "";
  const baseUrl = normalizeBaseUrl(
    settingsCache?.auth?.baseUrl || "https://powermaxx.test"
  );
  if (!token) {
    setStatus("Token belum ada. Login dulu di popup.");
    setSummary(
      { total: orders.length, success: 0, error: 0, skipped: 0 },
      "Token belum ada."
    );
    running = false;
    return;
  }

  const summary = { total: orders.length, success: 0, error: 0, skipped: 0 };
  resetLogs();
  setProgress(0, orders.length);
  setSummary(summary, "Mulai proses bulk...");
  setStatus("Mulai proses bulk...");
  const buildDetailPayload = (message, payload) => {
    const normalized = normalizePayloadForLog(payload);
    const tiktokMessages = extractTikTokMessages(normalized);
    if (
      normalized &&
      typeof normalized === "object" &&
      tiktokMessages.length &&
      !normalized.tiktokMessages
    ) {
      normalized.tiktokMessages = tiktokMessages;
    }
    const detailPayload = buildBulkErrorDetailPayload(message, normalized);
    return JSON.stringify(detailPayload, null, 2);
  };

  let done = 0;
  for (const entry of orders) {
    if (cancelRun) break;
    const orderId = entry?.id;
    if (!orderId) {
      summary.skipped += 1;
      setSummary(summary, "Dilewati: order kosong.");
      done += 1;
      setProgress(done, orders.length);
      if (delayMs) await sleep(delayMs);
      continue;
    }
    const desiredMarketplace =
      normalizeMarketplaceValue(entry?.marketplace) || selectedMarketplace;
    const idType = normalizeIdType(entry?.idType || entry?.id_type);
    let marketplace = desiredMarketplace;
    if (marketplace === "auto" && idType === "order_id") {
      marketplace = "shopee";
    }
    let orderUrl = "";
    let tab = null;
    let stage = "init";
    const startedAt = Date.now();
    let tabUrlForLog = "";
    const initialLabel = getMarketplaceLabel(marketplace || selectedMarketplace);
    addLog(orderId, "warn", formatLogMessage(initialLabel, "Menyiapkan..."));
    try {
      if (marketplace === "shopee" && idType === "order_id") {
        orderUrl = DEFAULT_TEMPLATES.shopee.replace(
          "{order_id}",
          encodeURIComponent(String(orderId))
        );
      } else if (marketplace === "auto" || marketplace === "shopee") {
        stage = "search_shopee";
        const searchEndpoint =
          settingsCache?.marketplaces?.shopee?.searchEndpoint ||
          DEFAULT_SHOPEE_SEARCH_ENDPOINT;
        const searchResult = await resolveShopeeOrderId(orderId, searchEndpoint);
        if (searchResult?.ok && searchResult.orderId) {
          marketplace = "shopee";
          orderUrl = DEFAULT_TEMPLATES.shopee.replace(
            "{order_id}",
            encodeURIComponent(String(searchResult.orderId))
          );
        } else if (marketplace === "shopee") {
          const mpLabel = getMarketplaceLabel("shopee");
          summary.skipped += 1;
          updateLog(
            orderId,
            "error",
            formatLogMessage(mpLabel, "Order SN tidak ditemukan."),
            searchResult?.body || searchResult?.error || "",
            `${mpLabel} | ${orderId} | Order SN tidak ditemukan.\n${
              searchResult?.body || searchResult?.error || ""
            }`
          );
          setSummary(summary, `Dilewati: ${orderId}`);
          done += 1;
          setProgress(done, orders.length);
          if (delayMs) await sleep(delayMs);
          continue;
        }
      }

      if (!orderUrl) {
        if (marketplace === "tiktok_shop" || marketplace === "auto") {
          marketplace = "tiktok_shop";
          orderUrl = buildOrderUrl(DEFAULT_TEMPLATES.tiktok_shop, orderId);
        }
      }
      stage = "open_order";
      const safeMarketplace =
        typeof marketplace === "string" ? marketplace : selectedMarketplace;
      const mpLabel = getMarketplaceLabel(safeMarketplace);
      updateLog(orderId, "warn", formatLogMessage(mpLabel, "Menyiapkan..."));

      tab = await chrome.tabs.create({ url: orderUrl, active: false });
      tabUrlForLog = await waitForAllowedUrl(tab.id, safeMarketplace, orderUrl);
      if (safeMarketplace === "tiktok_shop") {
        updateLog(orderId, "warn", formatLogMessage(mpLabel, "Menunggu halaman siap..."));
      }
      stage = "execute_script";

      const mpSettings = settingsCache?.marketplaces?.[marketplace] || {};
      const shopeeAwb = mpSettings.awb || {};
      const tiktokAwb = mpSettings.awb || {};

      const endpoints = {
        incomeEndpoint: mpSettings.incomeEndpoint || DEFAULT_INCOME_ENDPOINT,
        orderEndpoint: mpSettings.orderEndpoint || DEFAULT_ORDER_ENDPOINT,
        statementEndpoint: mpSettings.statementEndpoint || DEFAULT_TIKTOK_STATEMENT_ENDPOINT,
        statementDetailEndpoint:
          mpSettings.statementDetailEndpoint || DEFAULT_TIKTOK_STATEMENT_DETAIL_ENDPOINT,
        packageEndpoint: shopeeAwb.getPackageEndpoint || DEFAULT_AWB_PACKAGE_ENDPOINT,
        createEndpoint: shopeeAwb.createJobEndpoint || DEFAULT_AWB_CREATE_JOB_ENDPOINT,
        downloadEndpoint: shopeeAwb.downloadJobEndpoint || DEFAULT_AWB_DOWNLOAD_JOB_ENDPOINT,
        generateEndpoint: tiktokAwb.generateEndpoint || DEFAULT_TIKTOK_AWB_GENERATE_ENDPOINT,
        filePrefix: tiktokAwb.filePrefix || DEFAULT_TIKTOK_AWB_FILE_PREFIX
      };

      const awbOptions = {
        regionId: shopeeAwb.regionId || DEFAULT_AWB_REGION_ID,
        asyncSdVersion: shopeeAwb.asyncSdVersion || DEFAULT_AWB_ASYNC_VERSION,
        fileType: shopeeAwb.fileType || DEFAULT_AWB_FILE_TYPE,
        fileName: shopeeAwb.fileName || DEFAULT_AWB_FILE_NAME,
        fileContents: shopeeAwb.fileContents || DEFAULT_AWB_FILE_CONTENTS
      };

      const execResultList = await withTimeout(
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: bulkTabRunner,
          args: [
            marketplace,
            endpoints,
            DEFAULT_COMPONENTS,
            awbOptions,
            { includeAwb, mode: actionMode }
          ]
        }),
        120000,
        "Timeout proses di tab."
      );
      const result = execResultList?.[0]?.result;

      if (!result || result.error) {
        summary.error += 1;
        const endedAt = Date.now();
        const tiktokMessages =
          marketplace === "tiktok_shop" ? extractTikTokMessages(result?.detail) : [];
        const errorMessage = result?.error || "Gagal ambil data";
        const messageWithTikTok = tiktokMessages.length
          ? `${errorMessage} | ${tiktokMessages.join(" • ")}`
          : errorMessage;
        const detailPayload = buildDetailPayload(messageWithTikTok, {
          marketplace,
          orderId,
          stage,
          orderUrl,
          tabUrl: tabUrlForLog || "",
          endpoints,
          timing: {
            startedAt,
            endedAt,
            durationMs: endedAt - startedAt
          },
          ability: buildAbilitySummary({
            fetched: false,
            awbOk: false,
            exportOk: false,
            awbRequested: includeAwb
          }),
          steps: {
            fetch: {
              ok: false,
              error: errorMessage
            },
            export: { ok: false },
            awb: { ok: false, requested: includeAwb }
          },
          detail: result?.detail,
          error: {
            category: classifyError(errorMessage),
            message: messageWithTikTok,
            tiktokMessages
          }
        });
        updateLog(
          orderId,
          "error",
          formatLogMessage(mpLabel, messageWithTikTok),
          detailPayload,
          `${mpLabel} | ${orderId} | ${messageWithTikTok}`
        );
        setSummary(summary, `Gagal: ${orderId}`);
        await chrome.tabs.remove(tab.id);
        done += 1;
        setProgress(done, orders.length);
        if (delayMs) await sleep(delayMs);
        continue;
      }

      const fetchMeta = result.fetchMeta || {};
      const fetchStep = {
        ok: Boolean(result.ok),
        income: buildFetchMeta(fetchMeta.income),
        incomeDetail: buildFetchMeta(fetchMeta.incomeDetail),
        order: buildFetchMeta(fetchMeta.order)
      };
      if (!result.ok) {
        summary.error += 1;
        const msg = "Data error";
        const detailPayload = buildDetailPayload(msg, {
          marketplace,
          orderId,
          stage,
          orderUrl,
          tabUrl: tabUrlForLog || "",
          endpoints,
          ability: buildAbilitySummary({
            fetched: false,
            awbOk: false,
            exportOk: false,
            awbRequested: includeAwb
          }),
          steps: {
            fetch: fetchStep,
            export: { ok: false },
            awb: { ok: false, requested: includeAwb }
          },
          data: {
            order: result.orderRawJson,
            income: result.incomeRawJson,
            incomeDetail: result.incomeDetailRawJson
          }
        });
        updateLog(
          orderId,
          "error",
          formatLogMessage(mpLabel, msg),
          detailPayload,
          `${mpLabel} | ${orderId} | ${msg}\n${detailPayload}`
        );
        setSummary(summary, `Gagal: ${orderId}`);
        await chrome.tabs.remove(tab.id);
        done += 1;
        setProgress(done, orders.length);
        if (delayMs) await sleep(delayMs);
        continue;
      }
      const awbStep = {
        ok: !result.awb?.error,
        requested: includeAwb,
        skipped: !includeAwb,
        downloaded: result.awb?.downloaded,
        fileName: result.awb?.fileName,
        step: result.awb?.step,
        error: result.awb?.error,
        detail: result.awb?.detail,
        openUrl: result.awb?.openUrl
      };

      const exportPayload = buildExportPayload(marketplace, result);
      const exportResult = await sendExport(baseUrl, token, exportPayload);
      const awbStatus = !includeAwb
        ? "AWB dilewati"
        : result.awb?.error
          ? "AWB gagal"
          : result.awb?.downloaded || result.awb?.openUrl
            ? "AWB ok"
            : "AWB selesai";
      const abilitySummary = buildAbilitySummary({
        fetched: true,
        awbOk: !result.awb?.error,
        exportOk: exportResult.ok && result.ok,
        awbRequested: includeAwb
      });

      if (exportResult.unauthenticated) {
        summary.error += 1;
        await clearAuthSession(baseUrl);
        const msg = "Token tidak valid atau kadaluarsa. Login ulang di popup.";
        const detail = buildDetailPayload(msg, {
          marketplace,
          orderId,
          stage,
          orderUrl,
          tabUrl: tabUrlForLog || "",
          endpoints,
          error: {
            category: "AUTH",
            message: msg
          },
          response: exportResult
        });
        updateLog(
          orderId,
          "error",
          formatLogMessage(mpLabel, msg),
          detail,
          `${mpLabel} | ${orderId} | ${msg}\n${detail}`
        );
        setSummary(summary, `Gagal: ${orderId}`);
        cancelRun = true;
      } else if (exportResult.ok && result.ok) {
        summary.success += 1;
        updateLog(
          orderId,
          "ok",
          formatLogMessage(mpLabel, `Export OK ${exportResult.status} | ${awbStatus}`),
          "",
          `${mpLabel} | ${orderId} | Export OK ${exportResult.status} | ${awbStatus}`
        );
        setSummary(summary, `Berhasil: ${orderId}`);
      } else {
        const msg = exportResult.ok ? "Data error" : `Export ${exportResult.status}`;
        const endedAt = Date.now();
        const exportStep = {
          ok: exportResult.ok && result.ok,
          status: exportResult.status,
          statusText: exportResult.statusText,
          url: exportResult.url,
          bodySnippet: snippet(exportResult.body, 500),
          htmlSnippet: snippet(exportResult.htmlSnippet, 500)
        };
        const detailPayload = exportResult.ok
          ? {
              marketplace,
              orderId,
              stage,
              orderUrl,
              tabUrl: tabUrlForLog || "",
              endpoints,
              timing: {
                startedAt,
                endedAt,
                durationMs: endedAt - startedAt
              },
              ability: abilitySummary,
              steps: {
                fetch: fetchStep,
                awb: awbStep,
                export: exportStep
              },
              data: {
                order: result.orderRawJson,
                income: result.incomeRawJson,
                incomeDetail: result.incomeDetailRawJson
              }
            }
          : exportResult.error
            ? {
                marketplace,
                orderId,
                stage,
                orderUrl,
                tabUrl: tabUrlForLog || "",
                endpoints,
                timing: {
                  startedAt,
                  endedAt,
                  durationMs: endedAt - startedAt
                },
                ability: abilitySummary,
                steps: {
                  fetch: fetchStep,
                  awb: awbStep,
                  export: exportStep
                },
                error: {
                  category: classifyError(exportResult.error?.message || ""),
                  ...exportResult.error
                },
                connection: {
                  baseUrl,
                  url: exportResult.url,
                  hasToken: Boolean(token)
                }
              }
            : {
                marketplace,
                orderId,
                stage,
                orderUrl,
                tabUrl: tabUrlForLog || "",
                endpoints,
                timing: {
                  startedAt,
                  endedAt,
                  durationMs: endedAt - startedAt
                },
                ability: abilitySummary,
                steps: {
                  fetch: fetchStep,
                  awb: awbStep,
                  export: exportStep
                },
                error: {
                  category: "EXPORT_ERROR",
                  message: msg,
                  bodySnippet: snippet(exportResult.body, 500),
                  htmlSnippet: snippet(exportResult.htmlSnippet, 500)
                }
              };
        const detail = buildDetailPayload(`${msg} | ${awbStatus}`, detailPayload);
        summary.error += 1;
        updateLog(
          orderId,
          "error",
          formatLogMessage(mpLabel, `${msg} | ${awbStatus}`),
          detail,
          `${mpLabel} | ${orderId} | ${msg} | ${awbStatus}\n${detail}`
        );
        setSummary(summary, `Gagal: ${orderId}`);
      }

      await chrome.tabs.remove(tab.id);
      done += 1;
      setProgress(done, orders.length);
      if (delayMs) await sleep(delayMs);
    } catch (err) {
      summary.error += 1;
      let safeMarketplace =
        typeof marketplace === "string" ? marketplace : selectedMarketplace;
      if (safeMarketplace === "auto" && stage === "search_shopee") {
        safeMarketplace = "shopee";
      }
      const mpLabel = getMarketplaceLabel(safeMarketplace);
      const rawMessage = normalizeErrorText(err.message || "Error");
      const isPermissionError = rawMessage.includes("Cannot access contents of the page");
      const errorMessage = isPermissionError
        ? "Tidak bisa akses halaman. Pastikan izin host ada dan login sesuai."
        : rawMessage;
      const abilitySummary = buildAbilitySummary({
        fetched: false,
        awbOk: false,
        exportOk: false,
        awbRequested: includeAwb
      });
      let tabUrl = "";
      if (tab?.id) {
        try {
          const tabInfo = await chrome.tabs.get(tab.id);
          tabUrl = tabInfo?.url || "";
        } catch (e) {
          tabUrl = "";
        }
      }
      const rawDetail = normalizeErrorText(err.stack || err.message || "");
      const endedAt = Date.now();
      const errorPayload = {
        marketplace: safeMarketplace,
        orderId,
        stage,
        orderUrl,
        tabUrl: tabUrl || tabUrlForLog || "",
        endpoints,
        timing: {
          startedAt,
          endedAt,
          durationMs: endedAt - startedAt
        },
        ability: abilitySummary,
        steps: {
          fetch: { ok: false },
          awb: { ok: false, requested: includeAwb },
          export: { ok: false }
        },
        error: {
          category: classifyError(rawMessage),
          message: errorMessage,
          stack: rawDetail,
          url: tabUrl || tabUrlForLog || ""
        }
      };
      const errorDetail = buildDetailPayload(errorMessage, errorPayload);
      updateLog(
        orderId,
        "error",
        formatLogMessage(mpLabel, errorMessage),
        errorDetail,
        `${mpLabel} | ${orderId} | ${errorMessage}${errorDetail ? `\n${errorDetail}` : ""}`
      );
      setSummary(summary, `Gagal: ${orderId}`);
      if (typeof tab !== "undefined" && tab?.id) {
        await chrome.tabs.remove(tab.id);
      }
      done += 1;
      setProgress(done, orders.length);
      if (delayMs) await sleep(delayMs);
    }
  }

  setStatus(cancelRun ? "Dihentikan." : "Selesai.");
  setSummary(summary, cancelRun ? "Dihentikan." : "Selesai.");
  running = false;
};

const stopBulk = () => {
  cancelRun = true;
  setStatus("Menghentikan proses...");
};

const clearAuthSession = async (baseUrl = "") => {
  await chrome.storage.local.set({
    settings: {
      ...settingsCache,
      auth: {
        ...settingsCache.auth,
        baseUrl: baseUrl || settingsCache.auth?.baseUrl || "",
        token: "",
        profile: null
      }
    }
  });
  settingsCache = await loadSettings();
};

const clearForm = () => {
  orderListEl.value = "";
  bridgeOrders = null;
  resetLogs();
  setStatus("Siap.");
  setProgress(0, 0);
  resetSummary(0);
};

const applyBridgePayload = async () => {
  const stored = await chrome.storage.local.get("bulkBridgePayload");
  const payload = stored?.bulkBridgePayload;
  if (!payload) return;
  await chrome.storage.local.remove("bulkBridgePayload");

  const normalizedOrders = normalizeOrderEntries(payload.orders, payload.marketplace);
  const legacyList = Array.isArray(payload.orderSnList) ? payload.orderSnList : [];
  if (!normalizedOrders.length && !legacyList.length) {
    setStatus("Permintaan Powermaxx tidak berisi order.");
    return;
  }

  if (normalizedOrders.length) {
    bridgeOrders = normalizedOrders;
    orderListEl.value = normalizedOrders.map((item) => item.id).join("\n");
  } else {
    bridgeOrders = null;
    orderListEl.value = legacyList.join("\n");
  }
  marketplaceEl.value = normalizeMarketplaceValue(payload.marketplace) || "auto";
  const actionMap = {
    update_income: "update_income",
    update_order: "update_order",
    update_both: "fetch_send"
  };
  actionEl.value = actionMap[payload.action] || "fetch_send";
  setStatus("Permintaan dari Powermaxx diterima. Menjalankan bulk...");
  setSummary(
    { total: list.length, success: 0, error: 0, skipped: 0 },
    "Permintaan dari Powermaxx diterima."
  );
  setProgress(0, list.length);
  runBulk();
};

const init = async () => {
  settingsCache = await loadSettings();
  marketplaceEl.value = "auto";
  setProgress(0, 0);
  resetSummary(0);

  logListEl.addEventListener("click", async (event) => {
    const button = event.target.closest(".copy-log");
    if (!button) return;
    const item = button.closest(".log-item");
    const copyText = item?.dataset?.copyText || "";
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      const originalText = button.textContent;
      button.textContent = "Tersalin";
      setTimeout(() => {
        button.textContent = originalText;
      }, 1200);
    } catch (err) {
      setStatus("Gagal menyalin log.");
    }
  });

  orderListEl.addEventListener("input", () => {
    bridgeOrders = null;
  });

  startBtn.addEventListener("click", runBulk);
  stopBtn.addEventListener("click", stopBulk);
  clearBtn.addEventListener("click", clearForm);

  await applyBridgePayload();
};

document.addEventListener("DOMContentLoaded", init);
