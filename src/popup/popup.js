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
const DEFAULT_AUTH_BASE_URL = "https://powermaxx.test";
const DEFAULT_DEVICE_NAME = "powermaxx-extension";
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
const DEFAULT_COMPONENTS = "2,3,4,5";
const SETTINGS_KEY = "arvaSettings";
const DEFAULT_SETTINGS = {
  defaultMarketplace: "shopee",
  auth: {
    baseUrl: DEFAULT_AUTH_BASE_URL,
    token: "",
    email: "",
    deviceName: DEFAULT_DEVICE_NAME,
    profile: null
  },
  marketplaces: {
    shopee: {
      baseUrl: "https://powermaxx.test",
      incomeEndpoint: DEFAULT_INCOME_ENDPOINT,
      orderEndpoint: DEFAULT_ORDER_ENDPOINT,
      awb: {
        getPackageEndpoint: DEFAULT_AWB_PACKAGE_ENDPOINT,
        createJobEndpoint: DEFAULT_AWB_CREATE_JOB_ENDPOINT,
        downloadJobEndpoint: DEFAULT_AWB_DOWNLOAD_JOB_ENDPOINT,
        regionId: DEFAULT_AWB_REGION_ID,
        asyncSdVersion: DEFAULT_AWB_ASYNC_VERSION,
        fileType: DEFAULT_AWB_FILE_TYPE,
        fileName: DEFAULT_AWB_FILE_NAME,
        fileContents: DEFAULT_AWB_FILE_CONTENTS
      }
    },
    tiktok_shop: {
      baseUrl: "https://powermaxx.test",
      orderEndpoint: DEFAULT_TIKTOK_ORDER_ENDPOINT,
      statementEndpoint: DEFAULT_TIKTOK_STATEMENT_ENDPOINT,
      statementDetailEndpoint: DEFAULT_TIKTOK_STATEMENT_DETAIL_ENDPOINT,
      awb: {
        generateEndpoint: DEFAULT_TIKTOK_AWB_GENERATE_ENDPOINT,
        filePrefix: DEFAULT_TIKTOK_AWB_FILE_PREFIX
      }
    }
  }
};

const fetchBtn = document.getElementById("fetchBtn");
const fetchSendAwbBtn = document.getElementById("fetchSendAwbBtn");
const refreshIncomeBtn = document.getElementById("refreshIncomeBtn");
const statusEl = document.getElementById("status");
const statusCardEl = document.getElementById("statusCard");
const statusIconEl = document.getElementById("statusIcon");
const statusActionsEl = document.getElementById("statusActions");
const openOrderBtn = document.getElementById("openOrderBtn");
const sendExportBtn = document.getElementById("sendExportBtn");
const fetchSendBtn = document.getElementById("fetchSendBtn");
const downloadAwbBtn = document.getElementById("downloadAwbBtn");
const openBulkBtn = document.getElementById("openBulkBtn");
const openSettingsBtn = document.getElementById("openSettingsBtn");
const openViewerBtn = document.getElementById("openViewerBtn");
const profileMenuEl = document.getElementById("profileMenu");
const authBaseUrlEl = document.getElementById("authBaseUrl");
const authEmailEl = document.getElementById("authEmail");
const authPasswordEl = document.getElementById("authPassword");
const authDeviceNameEl = document.getElementById("authDeviceName");
const authTokenEl = document.getElementById("authToken");
const authStatusEl = document.getElementById("authStatus");
const loginViewEl = document.getElementById("loginView");
const mainViewEl = document.getElementById("mainView");
const loginBtn = document.getElementById("loginBtn");
const refreshProfileBtn = document.getElementById("refreshProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profileNameEl = document.getElementById("profileName");
const profileEmailEl = document.getElementById("profileEmail");
const profileInitialsEl = document.getElementById("profileInitials");
const statusSpinner = document.getElementById("statusSpinner");
const errorDetailsEl = document.getElementById("errorDetails");
const errorDetailsToggleEl = document.getElementById("errorDetailsToggle");
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
let currentStatusTone = "info";

const buildDeviceName = (email) => {
  const clean = String(email || "").trim();
  return clean ? `${clean}-powermaxx_extension` : "";
};

const buildOriginPattern = (baseUrl) => {
  const clean = normalizeBaseUrl(baseUrl);
  if (!clean) return "";
  try {
    const url = new URL(clean);
    return `${url.origin}/*`;
  } catch (e) {
    return "";
  }
};

const hasPowermaxxPermission = (baseUrl) =>
  new Promise((resolve) => {
    if (!chrome?.permissions) return resolve(false);
    const origin = buildOriginPattern(baseUrl);
    if (!origin) return resolve(false);
    chrome.permissions.contains({ origins: [origin] }, (granted) => {
      resolve(Boolean(granted));
    });
  });

const requestPowermaxxPermission = (baseUrl) =>
  new Promise((resolve) => {
    if (!chrome?.permissions) return resolve(false);
    const origin = buildOriginPattern(baseUrl);
    if (!origin) return resolve(false);
    chrome.permissions.request({ origins: [origin] }, (granted) => {
      resolve(Boolean(granted));
    });
  });

const ensurePowermaxxPermission = async (baseUrl) => {
  const hasPermission = await hasPowermaxxPermission(baseUrl);
  if (hasPermission) return true;
  return requestPowermaxxPermission(baseUrl);
};

const registerPowermaxxBridge = (baseUrl) =>
  new Promise((resolve) => {
    if (!chrome?.runtime?.sendMessage) return resolve(false);
    chrome.runtime.sendMessage(
      {
        type: "POWERMAXX_BRIDGE_REGISTER",
        baseUrl
      },
      () => resolve(true)
    );
  });

const getTargetTab = () =>
  new Promise((resolve) => {
    if (!chrome?.runtime?.sendMessage) {
      return resolve({
        ok: false,
        error: "Chrome runtime tidak tersedia."
      });
    }
    chrome.runtime.sendMessage({ type: "POWERMAXX_GET_TARGET_TAB" }, (resp) => {
      const payload = resp && typeof resp === "object" ? resp : null;
      resolve(
        payload || {
          ok: false,
          error: "Gagal mendapatkan target tab."
        }
      );
    });
  });

const clearStatusAction = () => {
  if (statusActionsEl) statusActionsEl.classList.add("hidden");
  if (openOrderBtn) {
    openOrderBtn.textContent = "Buka Order";
    openOrderBtn.dataset.url = "";
    openOrderBtn.dataset.orderId = "";
  }
};

const setStatus = (message, tone = "info") => {
  currentStatusTone = tone;
  clearStatusAction();
  const payload =
    message && typeof message === "object"
      ? message
      : { title: message, subtitle: "", description: "" };
  statusEl.innerHTML = "";
  if (payload.title) {
    const titleEl = document.createElement("div");
    titleEl.className = "status-title";
    titleEl.textContent = payload.title;
    statusEl.appendChild(titleEl);
  }
  if (payload.subtitle) {
    const subtitleEl = document.createElement("div");
    subtitleEl.className = "status-subtitle";
    subtitleEl.textContent = payload.subtitle;
    statusEl.appendChild(subtitleEl);
  }
  if (payload.description) {
    const descEl = document.createElement("div");
    descEl.className = "status-description";
    descEl.textContent = payload.description;
    statusEl.appendChild(descEl);
  }
  if (statusCardEl) {
    statusCardEl.classList.remove("ok", "error", "info");
    statusCardEl.classList.add(tone);
  }
  if (statusIconEl) {
    statusIconEl.textContent = tone === "ok" ? "✓" : tone === "error" ? "!" : "•";
  }
  if (tone !== "error") {
    if (errorDetailsEl) {
      errorDetailsEl.classList.add("hidden");
      errorDetailsEl.open = false;
    }
    if (errorTextEl) {
      errorTextEl.textContent = "";
    }
  }
};

const setOutput = () => {};
let authProfileCache = null;

const getAuthToken = () => (authTokenEl?.value || settingsCache.auth?.token || "").trim();

const setProfile = (profile) => {
  authProfileCache = profile || null;
  if (!authProfileCache) {
    profileNameEl.textContent = "-";
    profileEmailEl.textContent = "-";
    if (profileInitialsEl) profileInitialsEl.textContent = "U";
    return;
  }
  profileNameEl.textContent = authProfileCache?.name || "-";
  profileEmailEl.textContent = authProfileCache?.email || "-";
  if (profileInitialsEl) {
    const source = authProfileCache?.name || authProfileCache?.email || "";
    const initials = String(source)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    profileInitialsEl.textContent = initials || "U";
  }
};

const updateAuthStatus = () => {
  const token = getAuthToken();
  const loggedIn = Boolean(token);
  if (!authStatusEl) return loggedIn;
  authStatusEl.textContent = loggedIn ? "Login aktif" : "Belum login";
  authStatusEl.classList.toggle("ok", loggedIn);
  authStatusEl.classList.toggle("error", !loggedIn);
  return loggedIn;
};

const toggleAuthViews = (loggedIn) => {
  if (loginViewEl) loginViewEl.classList.toggle("hidden", loggedIn);
  if (mainViewEl) mainViewEl.classList.toggle("hidden", !loggedIn);
};

const setAuthBusy = (isBusy) => {
  if (loginBtn) loginBtn.disabled = isBusy;
  if (refreshProfileBtn) refreshProfileBtn.disabled = isBusy;
  if (logoutBtn) logoutBtn.disabled = isBusy;
  if (authBaseUrlEl) authBaseUrlEl.disabled = isBusy;
  if (authEmailEl) authEmailEl.disabled = isBusy;
  if (authPasswordEl) authPasswordEl.disabled = isBusy;
  if (authDeviceNameEl) authDeviceNameEl.disabled = isBusy;
};

const updateActionState = () => {
  const loggedIn = updateAuthStatus();
  toggleAuthViews(loggedIn);
  if (profileMenuEl) profileMenuEl.classList.toggle("hidden", !loggedIn);
  if (fetchBtn) fetchBtn.disabled = !loggedIn;
  if (fetchSendAwbBtn) fetchSendAwbBtn.disabled = !loggedIn;
  if (refreshIncomeBtn) refreshIncomeBtn.disabled = !loggedIn;
  if (fetchSendBtn) fetchSendBtn.disabled = !loggedIn;
  if (sendExportBtn) sendExportBtn.disabled = !loggedIn;
  if (downloadAwbBtn) downloadAwbBtn.disabled = !loggedIn;
  return loggedIn;
};

const persistAuthSettings = async (updates) => {
  settingsCache = {
    ...settingsCache,
    auth: {
      ...settingsCache.auth,
      ...updates
    }
  };
  await saveSettings(settingsCache);
};

const ensureLoggedIn = () => {
  const token = getAuthToken();
  if (token) return true;
  setStatus("Login diperlukan.", "error");
  setError("Silakan login terlebih dahulu di popup.");
  updateActionState();
  return false;
};


const saveViewerPayload = (payload) => {
  viewerPayloadCache = payload;
  if (!chrome?.storage?.local) return;
  try {
    chrome.storage.local.set({ viewerPayload: payload });
  } catch (e) {
    console.warn("Gagal menyimpan viewer payload", e);
  }
};

const buildExportPayload = () => {
  if (activeMarketplace === "tiktok_shop") {
    return {
      marketplace: "tiktok_shop",
      tiktok_shop_fulfillment_order_get_json: viewerPayloadCache?.orderRawJson || null,
      tiktok_shop_statement_json: {
        statement_order_list: viewerPayloadCache?.incomeRawJson || null,
        statement_transaction_detail: viewerPayloadCache?.incomeDetailRawJson || null
      }
    };
  }
  return {
    marketplace: "shopee",
    shopee_get_one_order_json: viewerPayloadCache?.orderRawJson || null,
    shopee_get_order_income_components_json: viewerPayloadCache?.incomeRawJson || null
  };
};

const normalizeBaseUrl = (value) => (value || "").trim().replace(/\/+$/, "");

const normalizeOrderIdValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return "";
  const text = String(value).trim();
  return text ? text : "";
};

const extractPowermaxxOrderId = (data) => {
  if (!data) return "";
  if (Array.isArray(data)) {
    for (const item of data) {
      const id = extractPowermaxxOrderId(item);
      if (id) return id;
    }
    return "";
  }
  if (typeof data !== "object") return "";
  const candidates = [
    data.order_id,
    data.orderId,
    data.id,
    data.data?.order_id,
    data.data?.orderId,
    data.data?.id,
    data.data?.order?.order_id,
    data.data?.order?.orderId,
    data.data?.order?.id,
    data.order?.order_id,
    data.order?.orderId,
    data.order?.id,
    data.result?.order_id,
    data.result?.orderId,
    data.result?.id,
    data.orders?.[0]?.order_id,
    data.orders?.[0]?.orderId,
    data.orders?.[0]?.id,
    data.data?.orders?.[0]?.order_id,
    data.data?.orders?.[0]?.orderId,
    data.data?.orders?.[0]?.id
  ];
  for (const candidate of candidates) {
    const id = normalizeOrderIdValue(candidate);
    if (id) return id;
  }
  return "";
};

const setOrderAction = (orderId, baseUrl) => {
  if (!statusActionsEl || !openOrderBtn) return;
  const cleanBaseUrl = normalizeBaseUrl(baseUrl);
  if (!cleanBaseUrl) return;
  const normalizedId = normalizeOrderIdValue(orderId);
  if (!normalizedId) return;
  const orderUrl = `${cleanBaseUrl}/admin/orders/${encodeURIComponent(normalizedId)}`;
  openOrderBtn.textContent = `Buka Order #${normalizedId}`;
  openOrderBtn.dataset.url = orderUrl;
  openOrderBtn.dataset.orderId = normalizedId;
  statusActionsEl.classList.remove("hidden");
};

const getStorageArea = () => chrome.storage?.sync || chrome.storage?.local;

const loadSettings = async () => {
  const storage = getStorageArea();
  if (!storage) return DEFAULT_SETTINGS;
  return new Promise((resolve) => {
    storage.get([SETTINGS_KEY], (result) => {
      const stored = result?.[SETTINGS_KEY];
      if (!stored) return resolve(DEFAULT_SETTINGS);
      const storedMarketplaces = stored.marketplaces || {};
      const legacyTikTok = storedMarketplaces.tiktok || {};
      const tiktokShopStored = storedMarketplaces.tiktok_shop || legacyTikTok;
      const normalizedDefault =
        stored.defaultMarketplace === "tiktok" ? "tiktok_shop" : stored.defaultMarketplace;
      resolve({
        ...DEFAULT_SETTINGS,
        ...stored,
        defaultMarketplace: normalizedDefault || DEFAULT_SETTINGS.defaultMarketplace,
        auth: {
          ...DEFAULT_SETTINGS.auth,
          ...(stored.auth || {})
        },
        marketplaces: {
          shopee: {
            ...DEFAULT_SETTINGS.marketplaces.shopee,
            ...(storedMarketplaces.shopee || {}),
            awb: {
              ...DEFAULT_SETTINGS.marketplaces.shopee.awb,
              ...(storedMarketplaces.shopee?.awb || {})
            }
          },
          tiktok_shop: {
            ...DEFAULT_SETTINGS.marketplaces.tiktok_shop,
            ...tiktokShopStored,
            awb: {
              ...DEFAULT_SETTINGS.marketplaces.tiktok_shop.awb,
              ...(tiktokShopStored.awb || {})
            }
          }
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
  if (host.includes("tiktok")) return "tiktok_shop";
  if (host.includes("tokopedia.com")) return "tiktok_shop";
  return settingsCache.defaultMarketplace || "shopee";
};

const setLoading = (isLoading) => {
  statusSpinner.classList.toggle("hidden", !isLoading);
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

const extractTikTokStatusInfo = (detail) => {
  const subtitles = [];
  const descriptions = [];
  const seenSubtitle = new Set();
  const seenDescription = new Set();
  const pushSubtitle = (value) => {
    const text = String(value || "").trim();
    if (!text || seenSubtitle.has(text)) return;
    seenSubtitle.add(text);
    subtitles.push(text);
  };
  const pushDescription = (value) => {
    const text = String(value || "").trim();
    if (!text || seenDescription.has(text)) return;
    seenDescription.add(text);
    descriptions.push(text);
  };
  const visit = (value) => {
    if (!value) return;
    const parsed = parseJsonMaybe(value);
    if (typeof parsed === "string") return;
    const obj = parsed;
    if (Array.isArray(obj?.failed_reason)) {
      obj.failed_reason.forEach((reason) => {
        pushSubtitle(reason?.status_msg_text);
        pushDescription(reason?.status_msg_sop_text);
      });
    }
    ["detail", "body", "income", "incomeDetail", "order", "data"].forEach((key) => {
      if (obj?.[key]) visit(obj[key]);
    });
  };

  visit(detail);
  return {
    subtitle: subtitles.join(" • "),
    description: descriptions.join(" • ")
  };
};

const extractShopeeStatusInfo = (detail) => {
  const parsed = parseJsonMaybe(detail);
  const payload = typeof parsed === "string" ? null : parsed;
  const innerDetail = parseJsonMaybe(payload?.detail);
  const detailPayload = typeof innerDetail === "string" ? payload?.detail : innerDetail;
  const subtitle =
    detailPayload?.user_message ||
    detailPayload?.message ||
    payload?.user_message ||
    payload?.message ||
    "";
  return { subtitle: String(subtitle || "").trim() };
};

const pickFirstValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
};

const buildErrorDetailPayload = (message, detail) => {
  const normalized = normalizeDetailObject(detail);
  const tiktokMessages = extractTikTokMessages(normalized);
  const tiktokStatusInfo = extractTikTokStatusInfo(normalized);
  const shopeeStatusInfo = extractShopeeStatusInfo(normalized);
  const status = pickFirstValue(
    normalized?.status,
    normalized?.response?.status,
    normalized?.income?.status,
    normalized?.incomeDetail?.status,
    normalized?.order?.status
  );
  const statusText = pickFirstValue(
    normalized?.statusText,
    normalized?.response?.statusText,
    normalized?.income?.statusText,
    normalized?.incomeDetail?.statusText,
    normalized?.order?.statusText
  );
  const endpoints = {};
  [
    "incomeEndpoint",
    "orderEndpoint",
    "statementEndpoint",
    "statementDetailEndpoint",
    "packageEndpoint",
    "createEndpoint",
    "downloadEndpoint",
    "generateEndpoint",
    "filePrefix"
  ].forEach((key) => {
    if (normalized?.[key]) endpoints[key] = normalized[key];
  });
  if (normalized?.endpoints && typeof normalized.endpoints === "object") {
    Object.assign(endpoints, normalized.endpoints);
  }

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

  const raw =
    normalized && typeof normalized === "object"
      ? { ...normalized }
      : normalized || null;
  if (raw && typeof raw === "object") {
    [
      "marketplace",
      "step",
      "status",
      "statusText",
      "url",
      "tabUrl",
      "orderId",
      "statementDetailId",
      "endpoints",
      "stack",
      "trace",
      "tiktokMessages",
      "tiktokMessage"
    ].forEach((key) => {
      delete raw[key];
    });
  }

  const summary = {};
  if (message) summary.title = message;
  if (tiktokStatusInfo.subtitle || tiktokStatusInfo.description) {
    if (tiktokStatusInfo.subtitle) summary.subtitle = tiktokStatusInfo.subtitle;
    if (tiktokStatusInfo.description) summary.description = tiktokStatusInfo.description;
  } else if (shopeeStatusInfo.subtitle) {
    summary.subtitle = shopeeStatusInfo.subtitle;
  }

  const context = {};
  if (normalized?.marketplace) context.marketplace = normalized.marketplace;
  if (normalized?.step) context.step = normalized.step;
  if (status !== "" && status !== undefined && status !== null) context.status = status;
  if (statusText) context.statusText = statusText;
  if (normalized?.url) context.url = normalized.url;
  if (normalized?.tabUrl) context.tabUrl = normalized.tabUrl;
  if (normalized?.orderId) context.orderId = normalized.orderId;
  if (normalized?.statementDetailId) context.statementDetailId = normalized.statementDetailId;
  if (Object.keys(endpoints).length) context.endpoints = endpoints;

  const externalResponse = pruneEmptyFields(raw);

  const output = {};
  const prunedSummary = pruneEmptyFields(summary);
  const prunedContext = pruneEmptyFields(context);
  if (prunedSummary) output.summary = prunedSummary;
  if (prunedContext) output.context = prunedContext;
  if (externalResponse !== undefined) output.externalResponse = externalResponse;
  const trace = pruneEmptyFields(normalized?.stack || normalized?.trace || "");
  if (trace) output.trace = trace;
  if (!Object.keys(output).length) {
    output.summary = { title: "Unknown error" };
  }
  return output;
};

const isUnauthenticated = (status, data, rawText) => {
  if ([401, 403, 419].includes(Number(status))) return true;
  const message = String(data?.message || "").toLowerCase();
  const raw = String(rawText || "").toLowerCase();
  return message.includes("unauthenticated") || raw.includes("unauthenticated");
};

const forceLogout = async (reason) => {
  if (authTokenEl) authTokenEl.value = "";
  authPasswordEl.value = "";
  setProfile(null);
  await persistAuthSettings({
    baseUrl: resolveAuthBaseUrl(),
    token: "",
    profile: null
  });
  updateActionState();
  setStatus(reason || "Sesi login habis. Silakan login ulang.", "error");
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

const normalizeDetailObject = (detail) => {
  if (!detail || typeof detail !== "object") return detail;
  const cloned = Array.isArray(detail) ? [...detail] : { ...detail };
  const keysToParse = ["detail", "body"];
  keysToParse.forEach((key) => {
    if (typeof cloned[key] === "string") {
      cloned[key] = parseJsonMaybe(cloned[key]);
    }
  });
  return cloned;
};

const extractTikTokAwbMessage = (detail) => {
  const parsed = parseJsonMaybe(detail);
  const payload = typeof parsed === "string" ? null : parsed;
  const failed = payload?.data?.failed_reason?.[0];
  return (
    failed?.status_msg_sop_text ||
    failed?.status_msg_text ||
    failed?.status_msg ||
    ""
  );
};

const stringifyDetail = (detail) => {
  if (!detail) return "";
  if (typeof detail === "string") {
    const parsed = parseJsonMaybe(detail);
    return typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
  }
  try {
    const normalized = normalizeDetailObject(detail);
    return JSON.stringify(normalized, null, 2);
  } catch (e) {
    return String(detail);
  }
};

const trimDetail = (value, limit = 2000) => {
  if (!value) return "";
  const text = String(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}...`;
};

const setError = (message, detail) => {
  if (currentStatusTone !== "error") {
    if (errorDetailsEl) {
      errorDetailsEl.classList.add("hidden");
      errorDetailsEl.open = false;
    }
    if (errorTextEl) {
      errorTextEl.textContent = "";
    }
    return;
  }
  const payload = buildErrorDetailPayload(message, detail);
  const detailText = stringifyDetail(payload);
  const finalText = trimDetail(detailText, 8000);

  if (!finalText) {
    if (errorDetailsEl) {
      errorDetailsEl.classList.add("hidden");
      errorDetailsEl.open = false;
    }
    errorTextEl.textContent = "";
    return;
  }

  if (errorDetailsEl) {
    errorDetailsEl.classList.remove("hidden");
    errorDetailsEl.open = false;
    if (errorDetailsToggleEl) {
      errorDetailsToggleEl.textContent = "Tampilkan detail";
    }
  }
  errorTextEl.textContent = finalText;
};

const buildFetchErrorDetail = (info, label) => {
  if (!info) {
    return label ? { label } : null;
  }
  return {
    label,
    status: info.status,
    statusText: info.statusText,
    appCode: info.appCode,
    appMessage: info.appMessage,
    hint: info.hint,
    url: info.finalUrl || info.url,
    body: info.body
  };
};


const resolveAuthBaseUrl = () => {
  const fallback =
    authBaseUrlEl?.value ||
    settingsCache.auth?.baseUrl ||
    settingsCache.marketplaces?.[activeMarketplace]?.baseUrl ||
    settingsCache.marketplaces?.[settingsCache.defaultMarketplace]?.baseUrl ||
    DEFAULT_AUTH_BASE_URL;
  return normalizeBaseUrl(fallback);
};

const fetchProfile = async () => {
  const baseUrl = resolveAuthBaseUrl();
  const token = getAuthToken();
  if (!baseUrl) {
    setStatus("Base URL wajib diisi.", "error");
    return;
  }
  if (!token) {
    setStatus("Token belum ada. Login terlebih dahulu.", "error");
    return;
  }

  setStatus("Mengambil profil...", "info");
  setLoading(true);
  setAuthBusy(true);
  try {
    const response = await fetch(`${baseUrl}/api/user`, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`
      }
    });
    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      data = null;
    }
    if (isUnauthenticated(response.status, data, raw)) {
      await forceLogout("Sesi login habis. Silakan login ulang.");
      return;
    }
    if (!response.ok) {
      setStatus(`Gagal ambil profil ${response.status}`, "error");
      return;
    }
    setProfile(data);
    const email = authEmailEl.value.trim();
    await persistAuthSettings({
      baseUrl,
      token,
      email,
      deviceName: buildDeviceName(email) || settingsCache.auth?.deviceName || "",
      profile: data
    });
    updateActionState();
    setStatus("Profil diperbarui.", "ok");
  } catch (err) {
    setStatus(`Gagal ambil profil: ${err.message}`, "error");
  } finally {
    setAuthBusy(false);
    setLoading(false);
  }
};

const login = async () => {
  const baseUrl = resolveAuthBaseUrl();
  const email = authEmailEl.value.trim();
  const password = authPasswordEl.value;
  const deviceName = `${email}-powermaxx_extension`;

  if (!baseUrl) {
    setStatus("Base URL wajib diisi.", "error");
    return;
  }
  if (!email) {
    setStatus("Email wajib diisi.", "error");
    setError("Email tidak boleh kosong. Device Name dibuat dari email.");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setStatus("Email tidak valid.", "error");
    setError("Gunakan format email yang benar agar login berhasil.");
    return;
  }
  if (!password) {
    setStatus("Email dan password wajib diisi.", "error");
    return;
  }

  const bridgeGranted = await ensurePowermaxxPermission(baseUrl);
  setStatus("Login...", "info");
  setLoading(true);
  setAuthBusy(true);
  try {
    const response = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({
        email,
        password,
        device_name: deviceName
      })
    });
    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      data = null;
    }
    if (!response.ok) {
      setStatus(`Login gagal ${response.status}`, "error");
      return;
    }
    const token = data?.token || data?.access_token;
    if (!token) {
      setStatus("Token tidak ditemukan di response.", "error");
      return;
    }
    if (authTokenEl) authTokenEl.value = token;
    authPasswordEl.value = "";
    setProfile(data?.user || null);
    await persistAuthSettings({
      baseUrl,
      token,
      email,
      deviceName,
      profile: data?.user || authProfileCache
    });
    if (bridgeGranted) {
      await registerPowermaxxBridge(baseUrl);
    }
    updateActionState();
    setStatus("Login berhasil.", "ok");
    if (!data?.user) {
      await fetchProfile();
    }
  } catch (err) {
    setStatus(`Login gagal: ${err.message}`, "error");
  } finally {
    setAuthBusy(false);
    setLoading(false);
  }
};

const logout = async () => {
  const baseUrl = resolveAuthBaseUrl();
  const token = getAuthToken();
  if (!baseUrl) {
    setStatus("Base URL wajib diisi.", "error");
    return;
  }

  setStatus("Logout...", "info");
  setLoading(true);
  setAuthBusy(true);
  try {
    if (token) {
      await fetch(`${baseUrl}/api/logout`, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`
        }
      });
    }
  } catch (err) {
    setStatus(`Logout gagal: ${err.message}`, "error");
    return;
  } finally {
    setAuthBusy(false);
    setLoading(false);
  }

  if (authTokenEl) authTokenEl.value = "";
  authPasswordEl.value = "";
  setProfile(null);
  await persistAuthSettings({
    baseUrl,
    token: "",
    profile: null
  });
  updateActionState();
  setStatus("Logout berhasil.", "ok");
};

const hydrateAuthForm = () => {
  const baseUrl =
    settingsCache.auth?.baseUrl ||
    settingsCache.marketplaces?.[activeMarketplace]?.baseUrl ||
    settingsCache.marketplaces?.[settingsCache.defaultMarketplace]?.baseUrl ||
    DEFAULT_AUTH_BASE_URL;
  if (authBaseUrlEl) authBaseUrlEl.value = baseUrl;
  authEmailEl.value = settingsCache.auth?.email || "";
  if (authDeviceNameEl) {
    authDeviceNameEl.value = settingsCache.auth?.deviceName || DEFAULT_DEVICE_NAME;
  }
  if (authTokenEl) authTokenEl.value = settingsCache.auth?.token || "";
  setProfile(settingsCache.auth?.profile || null);
  updateActionState();
};

const syncAuthFromInputs = async () => {
  const email = authEmailEl.value.trim();
  await persistAuthSettings({
    baseUrl: resolveAuthBaseUrl(),
    token: getAuthToken(),
    email,
    deviceName: buildDeviceName(email) || settingsCache.auth?.deviceName || "",
    profile: authProfileCache
  });
  updateActionState();
};


const sendExportRequest = async () => {
  if (!ensureLoggedIn()) return;
  const cfg = settingsCache.marketplaces?.[activeMarketplace] || {};
  const baseUrl = normalizeBaseUrl(settingsCache.auth?.baseUrl || cfg.baseUrl);
  const token = getAuthToken();
  if (!baseUrl) {
    setStatus("Base URL wajib diisi.", "error");
    setError("Base URL belum diatur. Buka Pengaturan terlebih dahulu.");
    return;
  }
  if (!token) {
    setStatus("Token belum ada.", "error");
    setError("Silakan login terlebih dahulu di popup.");
    return;
  }
  const hasOrder = Boolean(viewerPayloadCache?.orderRawJson);
  const hasIncome = Boolean(viewerPayloadCache?.incomeRawJson);
  if (!hasOrder || !hasIncome) {
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
        accept: "application/json",
        "x-requested-with": "XMLHttpRequest",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify(buildExportPayload())
    });
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    const isJson = contentType.includes("application/json");
    const detail = {
      url,
      status: response.status,
      statusText: response.statusText,
      body: isJson ? text : "",
      htmlSnippet: !isJson && text ? text.slice(0, 500) : "",
      marketplace: activeMarketplace
    };
    let data = null;
    if (isJson && text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = null;
      }
    }
    if (isUnauthenticated(response.status, data, text)) {
      await forceLogout("Token tidak valid atau kadaluarsa. Silakan login ulang.");
      setError("Sesi login habis.", detail);
      return;
    }
    const orderId = extractPowermaxxOrderId(data);
    if (response.ok) {
      if (orderId) {
        setStatus(
          {
            title: `Export berhasil (${response.status})`,
            subtitle: `Order ID: ${orderId}`,
            description: "Klik tombol di bawah untuk membuka order di Powermaxx."
          },
          "ok"
        );
        setOrderAction(orderId, baseUrl);
      } else {
        setStatus(`Export berhasil (${response.status})`, "ok");
      }
    } else {
      const message = `Export gagal ${response.status}: ${response.statusText || "Error"}`;
      setStatus(message, "error");
      setError(message, detail);
    }
    console.info("Export response:", text);
  } catch (err) {
    setStatus(`Gagal mengirim: ${err.message}`, "error");
    setError(err.message || "Gagal mengirim.", {
      url,
      baseUrl,
      marketplace: activeMarketplace,
      name: err.name,
      message: err.message,
      hint: "Periksa Base URL, HTTPS, dan CORS server."
    });
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

const buildTikTokOrderSheet = (orderPayload) => {
  const mainOrder = orderPayload?.data?.main_order?.[0];
  const items = Array.isArray(mainOrder?.sku_module) ? mainOrder.sku_module : [];
  if (!items.length) return null;

  const headers = [
    "Order ID",
    "Order Line IDs",
    "SKU ID",
    "Product",
    "SKU Name",
    "Seller SKU",
    "Qty",
    "Unit Price",
    "Total"
  ];

  const formatAmount = (amount) => {
    if (!amount) return "";
    if (typeof amount === "string" || typeof amount === "number") return String(amount);
    return amount.format_with_symbol || amount.format_price || amount.amount || "";
  };

  const orderId = mainOrder?.main_order_id || "";

  const rows = items.map((item) => {
    const orderLineIds = Array.isArray(item.order_line_ids) ? item.order_line_ids.join(",") : "";
    const unitPrice = formatAmount(item.sku_unit_price);
    const totalPrice = formatAmount(item.sku_total_price);
    return [
      orderId,
      orderLineIds,
      item.sku_id || "",
      item.product_name || "",
      item.sku_name || "",
      item.seller_sku_name || "",
      item.quantity ?? "",
      unitPrice,
      totalPrice
    ].map(sanitizeCell);
  });

  const copy = rows.map((row) => row.join("\t")).join("\n");
  return { headers, rows, copy };
};

const buildTikTokIncomeSheet = (incomePayload) => {
  const records = incomePayload?.data?.order_records || [];
  if (!records.length) return null;

  const headers = [
    "Order ID",
    "Settlement",
    "Earning",
    "Fees",
    "Shipping",
    "Placed Time",
    "Status"
  ];

  const formatAmount = (amount) => {
    if (!amount) return "";
    if (typeof amount === "string" || typeof amount === "number") return String(amount);
    return amount.format_with_symbol || amount.format_price || amount.amount || "";
  };

  const rows = records.map((record) => {
    return [
      record.reference_id || record.trade_order_id || "",
      formatAmount(record.settlement_amount),
      formatAmount(record.earning_amount),
      formatAmount(record.fees),
      formatAmount(record.shipping_amount),
      record.placed_time || "",
      record.settlement_status || ""
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

const pageFetcherTikTok = async (orderBase, statementBase, statementDetailBase) => {
  try {
    const parseOrderId = () => {
      const params = new URLSearchParams(location.search || "");
      const fromQuery =
        params.get("order_no") ||
        params.get("orderNo") ||
        params.get("main_order_id") ||
        params.get("order_id");
      if (fromQuery) return fromQuery;
      const pathMatch = location.pathname.match(/order\/(detail\/)?(\d+)/);
      return pathMatch ? pathMatch[2] : "";
    };

    const safeJson = (raw) => {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    };

    const pickLatestResourceUrl = (keyword, paramKey, paramValue) => {
      const entries = performance.getEntriesByType("resource") || [];
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        const url = entries[i]?.name || "";
        if (!url.includes(keyword)) continue;
        if (paramKey && paramValue) {
          try {
            const parsed = new URL(url);
            if (parsed.searchParams.get(paramKey) !== String(paramValue)) {
              continue;
            }
          } catch (e) {
            continue;
          }
        }
        return url;
      }
      return "";
    };

    const orderId = parseOrderId();
    if (!orderId) {
      return { error: "Order ID tidak ditemukan (buka halaman order detail TikTok)" };
    }

    const perfOrderUrl = pickLatestResourceUrl("/api/fulfillment/order/get");
    const perfStatementUrl = pickLatestResourceUrl(
      "/api/v1/pay/statement/order/list",
      "reference_id",
      orderId
    );
    const orderUrl = new URL(perfOrderUrl || orderBase);
    const statementUrl = new URL(perfStatementUrl || statementBase);
    if (!perfStatementUrl && perfOrderUrl) {
      for (const [key, value] of orderUrl.searchParams.entries()) {
        if (!statementUrl.searchParams.has(key)) {
          statementUrl.searchParams.set(key, value);
        }
      }
    }
    const ensureParam = (key, value) => {
      if (!statementUrl.searchParams.has(key)) {
        statementUrl.searchParams.set(key, value);
      }
    };
    ensureParam("pagination_type", "1");
    ensureParam("from", "0");
    ensureParam("size", "5");
    ensureParam("cursor", "");
    ensureParam("page_type", "12");
    ensureParam("need_total_amount", "true");
    if (!statementUrl.searchParams.get("reference_id")) {
      statementUrl.searchParams.set("reference_id", orderId);
    }

    const orderResp = await fetch(orderUrl.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        accept: "application/json, text/plain, */*"
      },
      credentials: "include",
      body: JSON.stringify({ main_order_id: [String(orderId)] })
    });
    const orderBody = await orderResp.text();
    const orderJson = safeJson(orderBody);

    let statementResp;
    let statementBody = "";
    let statementJson = null;
    try {
      statementResp = await fetch(statementUrl.toString(), {
        method: "GET",
        headers: { accept: "application/json, text/plain, */*" },
        credentials: "include"
      });
      statementBody = await statementResp.text();
      statementJson = safeJson(statementBody);
    } catch (e) {
      statementResp = null;
      statementBody = `{"error":"${e.message}"}`;
    }

    let detailResp;
    let detailBody = "";
    let detailJson = null;
    let detailUrl = "";
    let statementDetailId = "";
    let detailHint = "";
    const statementRecords = statementJson?.data?.order_records || [];
    const matchedRecord =
      statementRecords.find((record) => String(record.reference_id) === String(orderId)) ||
      statementRecords.find((record) => String(record.trade_order_id) === String(orderId)) ||
      statementRecords[0];
    statementDetailId = matchedRecord?.statement_detail_id || "";

    if (statementDetailId && statementDetailBase) {
      const perfDetailUrl = pickLatestResourceUrl(
        "/api/v1/pay/statement/transaction/detail",
        "statement_detail_id",
        statementDetailId
      );
      const detailUrlObj = new URL(perfDetailUrl || statementDetailBase);
      if (!perfDetailUrl) {
        for (const [key, value] of statementUrl.searchParams.entries()) {
          if (!detailUrlObj.searchParams.has(key)) {
            detailUrlObj.searchParams.set(key, value);
          }
        }
        [
          "reference_id",
          "pagination_type",
          "from",
          "size",
          "cursor",
          "need_total_amount",
          "page_type",
          "settlement_status",
          "no_need_sku_record",
          "X-Bogus",
          "X-Gnarly"
        ].forEach((key) => detailUrlObj.searchParams.delete(key));
      }
      const ensureDetailParam = (key, value) => {
        if (!detailUrlObj.searchParams.has(key)) {
          detailUrlObj.searchParams.set(key, value);
        }
      };
      ensureDetailParam("terminal_type", "1");
      ensureDetailParam("page_type", "8");
      ensureDetailParam("statement_version", "0");
      detailUrlObj.searchParams.set("statement_detail_id", statementDetailId);
      detailUrl = detailUrlObj.toString();
      try {
        detailResp = await fetch(detailUrl, {
          method: "GET",
          headers: { accept: "application/json, text/plain, */*" },
          credentials: "include"
        });
        detailBody = await detailResp.text();
        detailJson = safeJson(detailBody);
        if (detailJson?.code === 98001004) {
          detailHint = "Buka halaman Finance > Transactions lalu detail order agar URL detail valid.";
        }
      } catch (e) {
        detailResp = null;
        detailBody = `{"error":"${e.message}"}`;
      }
    } else if (!statementDetailId) {
      detailBody = "{\"error\":\"statement_detail_id not found\"}";
    }

    return {
      income: {
        ok: statementResp ? statementResp.ok : false,
        status: statementResp ? statementResp.status : 0,
        statusText: statementResp ? statementResp.statusText : "Statement request failed",
        appCode: statementJson?.code,
        appMessage: statementJson?.message,
        body: statementBody,
        finalUrl: statementUrl.toString()
      },
      incomeDetail: {
        ok: detailResp ? detailResp.ok : false,
        status: detailResp ? detailResp.status : 0,
        statusText: detailResp ? detailResp.statusText : statementDetailId ? "Statement detail request failed" : "statement_detail_id missing",
        appCode: detailJson?.code,
        appMessage: detailJson?.message,
        hint: detailHint,
        body: detailBody,
        finalUrl: detailUrl
      },
      order: {
        ok: orderResp.ok,
        status: orderResp.status,
        statusText: orderResp.statusText,
        appCode: orderJson?.code,
        appMessage: orderJson?.message,
        body: orderBody,
        finalUrl: orderUrl.toString()
      },
      orderId,
      statementDetailId
    };
  } catch (e) {
    return { error: e.message };
  }
};


const pageFetcherShopeeIncomeOnly = async (incomeBase, defaultComponents = "2,3,4,5") => {
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
    const cdsCookie = pickCookie("SPC_CDS");
    const cdsVerCookie = pickCookie("SPC_CDS_VER");

    if (!incomeUrl.searchParams.get("SPC_CDS") && cdsCookie) {
      incomeUrl.searchParams.set("SPC_CDS", cdsCookie);
    }
    if (!incomeUrl.searchParams.get("SPC_CDS_VER")) {
      if (cdsVerCookie) {
        incomeUrl.searchParams.set("SPC_CDS_VER", cdsVerCookie);
      } else {
        incomeUrl.searchParams.set("SPC_CDS_VER", "2");
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

    const orderId = parseOrderId();
    if (!orderId) {
      return { error: "Order ID tidak ditemukan (buka halaman order Shopee)" };
    }

    const components = parseComponents("");
    const payload = {
      order_id: Number.isFinite(Number(orderId)) ? Number(orderId) : orderId,
      components
    };

    const response = await fetch(incomeUrl.toString(), {
      method: "POST",
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json;charset=UTF-8"
      },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const body = await response.text();

    return {
      income: {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body,
        finalUrl: incomeUrl.toString()
      },
      orderId
    };
  } catch (e) {
    return { error: e.message };
  }
};

const pageFetcherTikTokIncomeOnly = async (statementBase, statementDetailBase) => {
  try {
    const parseOrderId = () => {
      const params = new URLSearchParams(location.search || "");
      const fromQuery =
        params.get("order_no") ||
        params.get("orderNo") ||
        params.get("main_order_id") ||
        params.get("order_id");
      if (fromQuery) return fromQuery;
      const pathMatch = location.pathname.match(/order\/(detail\/)?(\d+)/);
      return pathMatch ? pathMatch[2] : "";
    };

    const safeJson = (raw) => {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    };

    const pickLatestResourceUrl = (keyword, paramKey, paramValue) => {
      const entries = performance.getEntriesByType("resource") || [];
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        const url = entries[i]?.name || "";
        if (!url.includes(keyword)) continue;
        if (paramKey && paramValue) {
          try {
            const parsed = new URL(url);
            if (parsed.searchParams.get(paramKey) !== String(paramValue)) {
              continue;
            }
          } catch (e) {
            continue;
          }
        }
        return url;
      }
      return "";
    };

    const orderId = parseOrderId();
    if (!orderId) {
      return { error: "Order ID tidak ditemukan (buka halaman order detail TikTok)" };
    }

    const perfStatementUrl = pickLatestResourceUrl(
      "/api/v1/pay/statement/order/list",
      "reference_id",
      orderId
    );
    const statementUrl = new URL(perfStatementUrl || statementBase);
    if (!statementUrl.searchParams.get("reference_id")) {
      statementUrl.searchParams.set("reference_id", orderId);
    }
    const ensureParam = (key, value) => {
      if (!statementUrl.searchParams.has(key)) {
        statementUrl.searchParams.set(key, value);
      }
    };
    ensureParam("pagination_type", "1");
    ensureParam("from", "0");
    ensureParam("size", "5");
    ensureParam("cursor", "");
    ensureParam("page_type", "12");
    ensureParam("need_total_amount", "true");

    let statementResp;
    let statementBody = "";
    let statementJson = null;
    try {
      statementResp = await fetch(statementUrl.toString(), {
        method: "GET",
        headers: { accept: "application/json, text/plain, */*" },
        credentials: "include"
      });
      statementBody = await statementResp.text();
      statementJson = safeJson(statementBody);
    } catch (e) {
      statementResp = null;
      statementBody = `{"error":"${e.message}"}`;
    }

    let detailResp;
    let detailBody = "";
    let detailJson = null;
    let detailUrl = "";
    let statementDetailId = "";
    let detailHint = "";
    const statementRecords = statementJson?.data?.order_records || [];
    const matchedRecord =
      statementRecords.find((record) => String(record.reference_id) === String(orderId)) ||
      statementRecords.find((record) => String(record.trade_order_id) === String(orderId)) ||
      statementRecords[0];
    statementDetailId = matchedRecord?.statement_detail_id || "";

    if (statementDetailId && statementDetailBase) {
      const perfDetailUrl = pickLatestResourceUrl(
        "/api/v1/pay/statement/transaction/detail",
        "statement_detail_id",
        statementDetailId
      );
      const detailUrlObj = new URL(perfDetailUrl || statementDetailBase);
      if (!perfDetailUrl) {
        for (const [key, value] of statementUrl.searchParams.entries()) {
          if (!detailUrlObj.searchParams.has(key)) {
            detailUrlObj.searchParams.set(key, value);
          }
        }
        [
          "reference_id",
          "pagination_type",
          "from",
          "size",
          "cursor",
          "need_total_amount",
          "page_type",
          "settlement_status",
          "no_need_sku_record",
          "X-Bogus",
          "X-Gnarly"
        ].forEach((key) => detailUrlObj.searchParams.delete(key));
      }
      const ensureDetailParam = (key, value) => {
        if (!detailUrlObj.searchParams.has(key)) {
          detailUrlObj.searchParams.set(key, value);
        }
      };
      ensureDetailParam("terminal_type", "1");
      ensureDetailParam("page_type", "8");
      ensureDetailParam("statement_version", "0");
      detailUrlObj.searchParams.set("statement_detail_id", statementDetailId);
      detailUrl = detailUrlObj.toString();
      try {
        detailResp = await fetch(detailUrl, {
          method: "GET",
          headers: { accept: "application/json, text/plain, */*" },
          credentials: "include"
        });
        detailBody = await detailResp.text();
        detailJson = safeJson(detailBody);
        if (detailJson?.code === 98001004) {
          detailHint = "Buka halaman Finance > Transactions lalu detail order agar URL detail valid.";
        }
      } catch (e) {
        detailResp = null;
        detailBody = `{"error":"${e.message}"}`;
      }
    } else if (!statementDetailId) {
      detailBody = "{\"error\":\"statement_detail_id not found\"}";
    }

    return {
      income: {
        ok: statementResp ? statementResp.ok : false,
        status: statementResp ? statementResp.status : 0,
        statusText: statementResp ? statementResp.statusText : "Statement request failed",
        appCode: statementJson?.code,
        appMessage: statementJson?.message,
        body: statementBody,
        finalUrl: statementUrl.toString()
      },
      incomeDetail: {
        ok: detailResp ? detailResp.ok : false,
        status: detailResp ? detailResp.status : 0,
        statusText: detailResp
          ? detailResp.statusText
          : statementDetailId
            ? "Statement detail request failed"
            : "statement_detail_id missing",
        appCode: detailJson?.code,
        appMessage: detailJson?.message,
        hint: detailHint,
        body: detailBody,
        finalUrl: detailUrl
      },
      orderId,
      statementDetailId
    };
  } catch (e) {
    return { error: e.message };
  }
};

const pageFetcherAwb = async (
  packageBase,
  createBase,
  downloadBase,
  orderBase,
  awbOptions
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

    const safeJsonParse = (raw) => {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    };

    const ensureParams = (url) => {
      const cdsCookie = pickCookie("SPC_CDS");
      const cdsVerCookie = pickCookie("SPC_CDS_VER");
      if (!url.searchParams.get("SPC_CDS") && cdsCookie) {
        url.searchParams.set("SPC_CDS", cdsCookie);
      }
      if (!url.searchParams.get("SPC_CDS_VER")) {
        if (cdsVerCookie) {
          url.searchParams.set("SPC_CDS_VER", cdsVerCookie);
        } else {
          url.searchParams.set("SPC_CDS_VER", "2");
        }
      }
    };

    const parseOrderId = () => {
      const match = location.pathname.match(/order\/([0-9]+)/);
      return match ? match[1] : "";
    };

    const orderId = parseOrderId();
    if (!orderId) {
      return { error: "Order ID tidak ditemukan (buka halaman order)" };
    }

    const packageUrl = new URL(packageBase);
    ensureParams(packageUrl);
    packageUrl.searchParams.set("order_id", orderId);

    const orderUrl = new URL(orderBase || "https://seller.shopee.co.id/api/v3/order/get_one_order");
    ensureParams(orderUrl);
    orderUrl.searchParams.set("order_id", orderId);

    const orderResp = await fetch(orderUrl.toString(), {
      method: "GET",
      headers: { accept: "application/json, text/plain, */*" },
      credentials: "include"
    });
    const orderText = await orderResp.text();
    const orderJson = safeJsonParse(orderText);
    if (!orderResp.ok || orderJson?.code !== 0) {
      return {
        error: `Get order gagal ${orderResp.status}`,
        detail: orderText,
        step: "get_order"
      };
    }

    const orderSn = orderJson?.data?.order_sn || "";
    const formatTimestamp = () => {
      const now = new Date();
      const pad = (num) => String(num).padStart(2, "0");
      return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
        now.getHours()
      )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    };
    const sanitizeFilePart = (value) =>
      String(value || "").replace(/[^a-zA-Z0-9_-]+/g, "");
    const safeOrderSn = sanitizeFilePart(orderSn) || sanitizeFilePart(orderId) || "order";
    const downloadFileName = `${formatTimestamp()}_SHOPEE_${safeOrderSn}.pdf`;
    const customBaseName = String(awbOptions?.fileName || "").trim();
    const createFileName = customBaseName || downloadFileName.replace(/\.pdf$/i, "");

    const shopId = orderJson?.data?.shop_id;
    if (!shopId) {
      return {
        error: "shop_id tidak ditemukan",
        detail: orderText,
        step: "get_order"
      };
    }

    const packageResp = await fetch(packageUrl.toString(), {
      method: "GET",
      headers: { accept: "application/json, text/plain, */*" },
      credentials: "include"
    });
    const packageText = await packageResp.text();
    const packageJson = safeJsonParse(packageText);
    if (!packageResp.ok || packageJson?.code !== 0) {
      return {
        error: `Get package gagal ${packageResp.status}`,
        detail: packageText,
        step: "get_package"
      };
    }

    const orderInfo = packageJson?.data?.order_info;
    const packages = Array.isArray(orderInfo?.package_list)
      ? orderInfo.package_list
      : [];
    if (!packages.length) {
      return { error: "Package list kosong", detail: packageText, step: "get_package" };
    }

    const orderIdValue = Number(orderId);
    const orderIdPayload = Number.isFinite(orderIdValue) ? orderIdValue : orderId;
    const groupMap = new Map();

    packages.forEach((pkg) => {
      const groupRaw = pkg?.items?.[0]?.group_id ?? pkg?.group_id ?? 0;
      const groupNum = Number(groupRaw);
      const groupId = Number.isFinite(groupNum) ? groupNum : 0;
      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, {
          primary_package_number: pkg?.package_number ?? "",
          group_shipment_id: groupId,
          package_list: []
        });
      }
      const group = groupMap.get(groupId);
      group.package_list.push({
        order_id: orderIdPayload,
        package_number: pkg?.package_number ?? ""
      });
    });

    const groupList = Array.from(groupMap.values()).filter(
      (group) => group.primary_package_number
    );
    if (!groupList.length) {
      return { error: "Group list kosong", detail: packageText, step: "group_list" };
    }

    const channelId =
      packages[0]?.channel_id ??
      packages[0]?.fulfillment_channel_id ??
      packages[0]?.shipping_method ??
      orderJson?.data?.fulfillment_channel_id ??
      orderJson?.data?.checkout_channel_id ??
      0;
    if (!channelId) {
      return { error: "channel_id tidak ditemukan", detail: packageText, step: "group_list" };
    }

    const regionId = (awbOptions?.regionId || orderJson?.data?.seller_address?.country || "ID").trim();
    const parseFileContents = (raw) => {
      const items = String(raw || "")
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((num) => Number.isFinite(num));
      return items.length ? items : [3];
    };

    const createUrl = new URL(createBase);
    ensureParams(createUrl);
    const asyncVersion = String(awbOptions?.asyncSdVersion || "").trim();
    if (asyncVersion) {
      createUrl.searchParams.set("async_sd_version", asyncVersion);
    }

    const createBody = {
      group_list: groupList,
      region_id: regionId,
      shop_id: shopId,
      channel_id: channelId,
      generate_file_details: [
        {
          file_type: awbOptions?.fileType || "THERMAL_PDF",
          file_name: createFileName,
          file_contents: parseFileContents(awbOptions?.fileContents || "3")
        }
      ],
      record_generate_schema: false
    };

    const createResp = await fetch(createUrl.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        accept: "application/json, text/plain, */*"
      },
      credentials: "include",
      body: JSON.stringify(createBody)
    });
    const createText = await createResp.text();
    const createJson = safeJsonParse(createText);
    if (!createResp.ok || createJson?.code !== 0) {
      return {
        error: `Create SD job gagal ${createResp.status}`,
        detail: createText,
        step: "create_job"
      };
    }

    const job = createJson?.data?.list?.[0];
    if (!job?.job_id) {
      return { error: "job_id tidak ditemukan", detail: createText, step: "create_job" };
    }

    const jobId = job.job_id;
    const isFirstTime = job?.is_first_time ?? 0;

    const downloadUrl = new URL(downloadBase);
    ensureParams(downloadUrl);
    downloadUrl.searchParams.set("job_id", jobId);
    downloadUrl.searchParams.set("is_first_time", String(isFirstTime));

    const printUrl = new URL("https://seller.shopee.co.id/awbprint");
    printUrl.searchParams.set("job_id", jobId);
    printUrl.searchParams.set("shop_id", String(shopId));
    printUrl.searchParams.set("first_time", String(isFirstTime));

    const downloadResp = await fetch(downloadUrl.toString(), {
      method: "GET",
      headers: { accept: "application/pdf, application/json, */*" },
      credentials: "include"
    });

    const contentType = downloadResp.headers.get("content-type") || "";
    if (
      downloadResp.ok &&
      (contentType.includes("pdf") ||
        contentType.includes("force-download") ||
        contentType.includes("octet-stream"))
    ) {
      const blob = await downloadResp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const fileName = downloadFileName;
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        anchor.remove();
      }, 1000);
      return {
        ok: true,
        downloaded: true,
        fileName,
        jobId,
        printUrl: printUrl.toString()
      };
    }

    const downloadText = await downloadResp.text();
    const downloadJson = safeJsonParse(downloadText);
    const downloadDataUrl =
      downloadJson?.data?.url ||
      downloadJson?.data?.download_url ||
      downloadJson?.data?.file_url;

    if (downloadResp.ok && downloadDataUrl) {
      return {
        ok: true,
        downloaded: false,
        openUrl: downloadDataUrl,
        fileName: downloadFileName,
        jobId,
        printUrl: printUrl.toString()
      };
    }

    return {
      error: `Download gagal ${downloadResp.status}`,
      detail: downloadText || downloadResp.statusText,
      step: "download",
      downloadUrl: downloadUrl.toString(),
      printUrl: printUrl.toString(),
      jobId
    };
  } catch (e) {
    return { error: e.message, step: "unknown" };
  }
};

const pageFetcherTikTokAwb = async (orderBase, generateBase, filePrefix) => {
  try {
    const parseOrderId = () => {
      const params = new URLSearchParams(location.search || "");
      const fromQuery =
        params.get("order_no") ||
        params.get("orderNo") ||
        params.get("main_order_id") ||
        params.get("order_id");
      if (fromQuery) return fromQuery;
      const pathMatch = location.pathname.match(/order\/(detail\/)?(\d+)/);
      return pathMatch ? pathMatch[2] : "";
    };

    const safeJson = (raw) => {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    };

    const pickLatestResourceUrl = (keyword, paramKey, paramValue) => {
      const entries = performance.getEntriesByType("resource") || [];
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        const url = entries[i]?.name || "";
        if (!url.includes(keyword)) continue;
        if (paramKey && paramValue) {
          try {
            const parsed = new URL(url);
            if (parsed.searchParams.get(paramKey) !== String(paramValue)) {
              continue;
            }
          } catch (e) {
            continue;
          }
        }
        return url;
      }
      return "";
    };

    const orderId = parseOrderId();
    if (!orderId) {
      return { error: "Order ID tidak ditemukan (buka halaman order detail TikTok)" };
    }

    const perfOrderUrl = pickLatestResourceUrl("/api/fulfillment/order/get");
    const perfGenerateUrl = pickLatestResourceUrl(
      "/api/v1/fulfillment/shipping_doc/generate"
    );
    const orderUrl = new URL(perfOrderUrl || orderBase);
    const generateUrl = new URL(perfGenerateUrl || generateBase);

    if (!perfGenerateUrl && perfOrderUrl) {
      for (const [key, value] of orderUrl.searchParams.entries()) {
        if (!generateUrl.searchParams.has(key)) {
          generateUrl.searchParams.set(key, value);
        }
      }
    }

    const orderResp = await fetch(orderUrl.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        accept: "application/json, text/plain, */*"
      },
      credentials: "include",
      body: JSON.stringify({ main_order_id: [String(orderId)] })
    });
    const orderBody = await orderResp.text();
    const orderJson = safeJson(orderBody);
    if (!orderResp.ok || orderJson?.code !== 0) {
      return {
        error: `Get order gagal ${orderResp.status}`,
        detail: orderBody,
        step: "get_order"
      };
    }

    const mainOrder = orderJson?.data?.main_order?.[0];
    const fulfillIds = [];
    const pushId = (value) => {
      if (!value) return;
      fulfillIds.push(String(value));
    };

    const mapper = Array.isArray(mainOrder?.fulfill_unit_id_mapper)
      ? mainOrder.fulfill_unit_id_mapper
      : [];
    mapper.forEach((item) => pushId(item?.fulfill_unit_id));

    const addFromModule = (modules) => {
      if (!Array.isArray(modules)) return;
      modules.forEach((item) => pushId(item?.fulfill_unit_id));
    };
    addFromModule(mainOrder?.fulfillment_module);
    addFromModule(mainOrder?.delivery_module);
    addFromModule(mainOrder?.print_label_module);

    const uniqueIds = Array.from(new Set(fulfillIds));
    if (!uniqueIds.length) {
      return { error: "fulfill_unit_id tidak ditemukan", detail: orderBody, step: "get_order" };
    }

    const prefix = String(filePrefix || "").trim() || "Shipping label";

    const generateBody = {
      fulfill_unit_id_list: uniqueIds,
      content_type_list: [1],
      template_type: 0,
      op_scene: 2,
      file_prefix: prefix,
      request_time: Date.now(),
      print_option: {
        tmpl: 0,
        template_size: 0,
        layout: [0]
      },
      print_source: 101
    };

    const generateResp = await fetch(generateUrl.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        accept: "application/json, text/plain, */*"
      },
      credentials: "include",
      body: JSON.stringify(generateBody)
    });
    const generateText = await generateResp.text();
    const generateJson = safeJson(generateText);
    if (!generateResp.ok || generateJson?.code !== 0) {
      return {
        error: `Generate label gagal ${generateResp.status}`,
        detail: generateText,
        step: "generate"
      };
    }

    const docUrl = generateJson?.data?.doc_url;
    const fileNameRaw = generateJson?.data?.file_prefix;
    if (!docUrl) {
      return { error: "doc_url tidak ditemukan", detail: generateText, step: "generate" };
    }

    const formatTimestamp = () => {
      const now = new Date();
      const pad = (num) => String(num).padStart(2, "0");
      return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
        now.getHours()
      )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    };

    const fileName = `${formatTimestamp()}_TIKTOKSHOP_${orderId}.pdf`;

    const downloadResp = await fetch(docUrl, {
      method: "GET",
      headers: { accept: "application/pdf, application/json, */*" },
      credentials: "include"
    });
    const contentType = downloadResp.headers.get("content-type") || "";
    if (downloadResp.ok && (contentType.includes("pdf") || contentType.includes("octet-stream"))) {
      const blob = await downloadResp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        anchor.remove();
      }, 1000);
      return { ok: true, downloaded: true, fileName, openUrl: docUrl };
    }

    return { ok: true, downloaded: false, fileName, openUrl: docUrl };
  } catch (e) {
    return { error: e.message };
  }
};

const refreshIncomeOnly = async () => {
  if (!ensureLoggedIn()) return false;
  if (!viewerPayloadCache?.orderRawJson) {
    setStatus("Order belum ada. Ambil data dulu.", "error");
    setError("Order belum ada untuk update income.");
    return false;
  }

  setStatus("Mengambil income saja...", "info");
  setError("");
  setLoading(true);
  if (refreshIncomeBtn) refreshIncomeBtn.disabled = true;

  let success = false;
  try {
    const targetTab = await getTargetTab();
    if (!targetTab?.ok || !targetTab?.tabId) {
      setStatus("Tidak ada tab marketplace ditemukan.", "error");
      setError(targetTab?.error || "Tidak ada tab marketplace. Buka halaman seller lalu coba lagi.");
      return false;
    }

    activeMarketplace = detectMarketplace(targetTab.url);

    if (activeMarketplace === "tiktok_shop") {
      const tiktokCfg = settingsCache.marketplaces?.tiktok_shop || {};
      const statementUrl = tiktokCfg.statementEndpoint || DEFAULT_TIKTOK_STATEMENT_ENDPOINT;
      const statementDetailUrl =
        tiktokCfg.statementDetailEndpoint || DEFAULT_TIKTOK_STATEMENT_DETAIL_ENDPOINT;

      const [execResult] = await chrome.scripting.executeScript({
        target: { tabId: targetTab.tabId },
        func: pageFetcherTikTokIncomeOnly,
        args: [statementUrl, statementDetailUrl]
      });
      const result = execResult?.result;
      if (!result) {
        setStatus("Tidak ada hasil dari tab (mungkin diblokir CSP atau error lain).", "error");
        setError("Eksekusi script di tab gagal. Coba refresh halaman seller.", {
          tabUrl: targetTab.url || "",
          statementEndpoint: statementUrl,
          statementDetailEndpoint: statementDetailUrl,
          marketplace: activeMarketplace
        });
        return false;
      }
      if (result.error) {
        setStatus(`Gagal di tab: ${result.error}`, "error");
        setError(result.error, {
          tabUrl: targetTab.url || "",
          statementEndpoint: statementUrl,
          statementDetailEndpoint: statementDetailUrl,
          marketplace: activeMarketplace
        });
        return false;
      }

      const incomeRaw = result.income?.body || "";
      const incomeDetailRaw = result.incomeDetail?.body || "";
      const incomePretty = prettify(incomeRaw);
      const incomeDetailPretty = incomeDetailRaw ? prettify(incomeDetailRaw) : "";

      let parsedIncome;
      let parsedIncomeDetail;
      try {
        parsedIncome = JSON.parse(incomeRaw);
      } catch (e) {
        parsedIncome = null;
      }
      try {
        parsedIncomeDetail = incomeDetailRaw ? JSON.parse(incomeDetailRaw) : null;
      } catch (e) {
        parsedIncomeDetail = null;
      }

      const cachedOrderRaw = viewerPayloadCache?.orderRaw || "";
      const cachedOrderJson = viewerPayloadCache?.orderRawJson || null;
      const cachedOrderSn =
        viewerPayloadCache?.orderSn ||
        cachedOrderJson?.data?.main_order?.[0]?.main_order_id ||
        "";
      const cachedOrderId = viewerPayloadCache?.orderId || result.orderId || "";

      saveViewerPayload({
        ...viewerPayloadCache,
        updatedAt: Date.now(),
        orderId: cachedOrderId,
        orderSn: cachedOrderSn,
        incomeRaw: incomePretty,
        incomeDetailRaw: incomeDetailPretty,
        incomeRawJson: parsedIncome || null,
        incomeDetailRawJson: parsedIncomeDetail || null,
        orderRaw: cachedOrderRaw,
        orderRawJson: cachedOrderJson
      });

      const incomeOk = result.income?.ok && (result.income?.appCode ?? parsedIncome?.code ?? 0) === 0;
      const detailOk = result.incomeDetail?.ok && (result.incomeDetail?.appCode ?? parsedIncomeDetail?.code ?? 0) === 0;

      if (incomeOk && detailOk) {
        setStatus("Income diperbarui.", "ok");
        success = true;
      } else if (incomeOk && !detailOk) {
        setStatus("Income OK, detail belum tersedia.", "info");
        setError("");
        console.info("Income detail belum tersedia.", {
          incomeDetail: buildFetchErrorDetail(result.incomeDetail, "income_detail")
        });
        success = true;
      } else {
        const message = `Income gagal ${result.income?.status || 0}`;
        setStatus(message, "error");
        setError(message, {
          income: buildFetchErrorDetail(result.income, "income")
        });
      }
    } else if (activeMarketplace === "shopee") {
      const shopeeCfg = settingsCache.marketplaces?.shopee || {};
      const incomeUrl = shopeeCfg.incomeEndpoint || DEFAULT_INCOME_ENDPOINT;

      const [execResult] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: pageFetcherShopeeIncomeOnly,
        args: [incomeUrl, DEFAULT_COMPONENTS]
      });
      const result = execResult?.result;
      if (!result) {
        setStatus("Tidak ada hasil dari tab (mungkin diblokir CSP atau error lain).", "error");
        setError("Eksekusi script di tab gagal. Coba refresh halaman seller.");
        return false;
      }
      if (result.error) {
        setStatus(`Gagal di tab: ${result.error}`, "error");
        setError(result.error);
        return false;
      }

      const incomeRaw = result.income?.body || "";
      const incomePretty = prettify(incomeRaw);
      let parsedIncome;
      try {
        parsedIncome = JSON.parse(incomeRaw);
      } catch (e) {
        parsedIncome = null;
      }

      const cachedOrderRaw = viewerPayloadCache?.orderRaw || "";
      const cachedOrderJson = viewerPayloadCache?.orderRawJson || null;
      const cachedOrderSn = viewerPayloadCache?.orderSn || "";
      const cachedOrderId = viewerPayloadCache?.orderId || result.orderId || "";

      saveViewerPayload({
        ...viewerPayloadCache,
        updatedAt: Date.now(),
        orderId: cachedOrderId,
        orderSn: cachedOrderSn,
        incomeRaw: incomePretty,
        incomeRawJson: parsedIncome || null,
        orderRaw: cachedOrderRaw,
        orderRawJson: cachedOrderJson
      });

      const incomeOk = result.income?.ok;
      if (incomeOk) {
        setStatus("Income diperbarui.", "ok");
        success = true;
      } else {
        const message = `Income gagal ${result.income?.status || 0}`;
        setStatus(message, "error");
        setError(message, { income: buildFetchErrorDetail(result.income, "income") });
      }
    } else {
      setStatus("Income hanya tersedia untuk Shopee/TikTok.", "error");
      setError("Marketplace aktif bukan Shopee/TikTok.");
      return false;
    }

    if (success) {
      await sendExportRequest();
    }
  } catch (err) {
    setStatus(`Gagal update income: ${err.message}`, "error");
    setError(err.message);
  } finally {
    if (refreshIncomeBtn) refreshIncomeBtn.disabled = false;
    setLoading(false);
    updateActionState();
  }

  return success;
};

const fetchData = async () => {
  let success = false;
  if (!ensureLoggedIn()) return false;
  setStatus("Mengambil data (menggunakan cookie/tab aktif)...", "info");
  setError("");
  setLoading(true);
  setOutput("", "");
  clearRendered();
  fetchBtn.disabled = true;
  openViewerBtn.disabled = true;

  const targetTab = await getTargetTab();
  if (!targetTab?.ok || !targetTab?.tabId) {
    setStatus("Tidak ada tab marketplace ditemukan.", "error");
    setError(targetTab?.error || "Tidak ada tab marketplace. Buka halaman seller lalu coba lagi.");
    fetchBtn.disabled = false;
    openViewerBtn.disabled = false;
    setLoading(false);
    return false;
  }
  activeMarketplace = detectMarketplace(targetTab.url);
  const tab = { id: targetTab.tabId, url: targetTab.url };

  if (activeMarketplace === "tiktok_shop") {
    const tiktokCfg = settingsCache.marketplaces?.tiktok_shop || {};
    const orderUrl = tiktokCfg.orderEndpoint || DEFAULT_TIKTOK_ORDER_ENDPOINT;
    const statementUrl = tiktokCfg.statementEndpoint || DEFAULT_TIKTOK_STATEMENT_ENDPOINT;
    const statementDetailUrl =
      tiktokCfg.statementDetailEndpoint || DEFAULT_TIKTOK_STATEMENT_DETAIL_ENDPOINT;

    try {
      const [execResult] = await chrome.scripting.executeScript({
        target: { tabId: targetTab.tabId },
        func: pageFetcherTikTok,
        args: [orderUrl, statementUrl, statementDetailUrl]
      });
      const result = execResult?.result;
      if (!result) {
        setStatus("Tidak ada hasil dari tab (mungkin diblokir CSP atau error lain).", "error");
        setError("Eksekusi script di tab gagal. Coba refresh halaman seller.", {
          tabUrl: targetTab.url || "",
          orderEndpoint: orderUrl,
          statementEndpoint: statementUrl,
          statementDetailEndpoint: statementDetailUrl,
          marketplace: activeMarketplace
        });
        openViewerBtn.disabled = false;
        return false;
      }
      if (result.error) {
        setStatus(`Gagal di tab: ${result.error}`, "error");
        setError(result.error, {
          tabUrl: targetTab.url || "",
          orderEndpoint: orderUrl,
          statementEndpoint: statementUrl,
          statementDetailEndpoint: statementDetailUrl,
          marketplace: activeMarketplace
        });
        openViewerBtn.disabled = false;
        return false;
      }

      const incomeRaw = result.income?.body || "";
      const incomeDetailRaw = result.incomeDetail?.body || "";
      const orderRaw = result.order?.body || "";
      const incomePretty = prettify(incomeRaw);
      const incomeDetailPretty = incomeDetailRaw ? prettify(incomeDetailRaw) : "";
      const orderPretty = prettify(orderRaw);
      setOutput(incomePretty, orderPretty);

      let parsedIncome;
      let parsedIncomeDetail;
      let parsedOrder;
      try {
        parsedIncome = JSON.parse(incomeRaw);
      } catch (e) {
        parsedIncome = null;
      }
      try {
        parsedIncomeDetail = incomeDetailRaw ? JSON.parse(incomeDetailRaw) : null;
      } catch (e) {
        parsedIncomeDetail = null;
      }
      try {
        parsedOrder = JSON.parse(orderRaw);
      } catch (e) {
        parsedOrder = null;
      }

      const orderSheet = buildTikTokOrderSheet(parsedOrder);
      const incomeSheet = buildTikTokIncomeSheet(parsedIncome);
      const mainOrder = parsedOrder?.data?.main_order?.[0];
      const orderSn = mainOrder?.main_order_id || result.orderId || "";

      saveViewerPayload({
        updatedAt: Date.now(),
        orderId: result.orderId || "",
        orderSn,
        incomeSheet,
        orderSheet,
        incomeRaw: incomePretty,
        incomeDetailRaw: incomeDetailPretty,
        orderRaw: orderPretty,
        incomeRawJson: parsedIncome || null,
        incomeDetailRawJson: parsedIncomeDetail || null,
        orderRawJson: parsedOrder || null
      });

      const incomeHttpOk = result.income?.ok;
      const detailHttpOk = result.incomeDetail?.ok;
      const orderHttpOk = result.order?.ok;
      const incomeAppCode = result.income?.appCode ?? parsedIncome?.code;
      const detailAppCode = result.incomeDetail?.appCode ?? parsedIncomeDetail?.code;
      const orderAppCode = result.order?.appCode ?? parsedOrder?.code;
      const incomeAppOk = incomeAppCode === undefined || incomeAppCode === 0;
      const detailAppOk = detailAppCode === undefined || detailAppCode === 0;
      const orderAppOk = orderAppCode === undefined || orderAppCode === 0;
      const incomeAppMessage = result.income?.appMessage ?? parsedIncome?.message;
      const detailAppMessage = result.incomeDetail?.appMessage ?? parsedIncomeDetail?.message;
      const orderAppMessage = result.order?.appMessage ?? parsedOrder?.message;
      const detailStatusText = String(result.incomeDetail?.statusText || "");
      const detailBodyText = String(result.incomeDetail?.body || "");
      const detailMissing =
        !detailHttpOk &&
        !detailAppCode &&
        (detailStatusText.includes("statement_detail_id") || detailBodyText.includes("statement_detail_id"));

      const incomeLabel = incomeHttpOk
        ? incomeAppOk
          ? `Income OK ${result.income?.status || 0}`
          : `Income App ${incomeAppCode ?? "?"}: ${incomeAppMessage || "Error"}`
        : `Income HTTP ${result.income?.status || 0}`;
      const detailLabel = detailHttpOk
        ? detailAppOk
          ? `Detail OK ${result.incomeDetail?.status || 0}`
          : `Detail App ${detailAppCode ?? "?"}: ${detailAppMessage || "Error"}`
        : `Detail HTTP ${result.incomeDetail?.status || 0}`;
      const orderLabel = orderHttpOk
        ? orderAppOk
          ? `Order OK ${result.order?.status || 0}`
          : `Order App ${orderAppCode ?? "?"}: ${orderAppMessage || "Error"}`
        : `Order HTTP ${result.order?.status || 0}`;

      if (incomeHttpOk && orderHttpOk && incomeAppOk && orderAppOk && detailHttpOk && detailAppOk) {
        setStatus(`TikTok OK ${result.order?.status || 0}`, "ok");
      } else if (incomeHttpOk && orderHttpOk && incomeAppOk && orderAppOk && detailMissing) {
        const message = `TikTok warning: ${incomeLabel} | Detail belum tersedia | ${orderLabel}`;
        setStatus(message, "info");
        setError("");
        console.info("Income detail belum tersedia.", {
          income: buildFetchErrorDetail(result.income, "income"),
          incomeDetail: buildFetchErrorDetail(result.incomeDetail, "income_detail"),
          order: buildFetchErrorDetail(result.order, "order"),
          orderId: result.orderId || "",
          statementDetailId: result.statementDetailId || "",
          marketplace: activeMarketplace
        });
      } else {
        const detailPayload = {
          income: buildFetchErrorDetail(result.income, "income"),
          incomeDetail: buildFetchErrorDetail(result.incomeDetail, "income_detail"),
          order: buildFetchErrorDetail(result.order, "order"),
          orderId: result.orderId || "",
          statementDetailId: result.statementDetailId || "",
          marketplace: activeMarketplace
        };
        const tiktokMessages = extractTikTokMessages(detailPayload);
        const tiktokStatusInfo = extractTikTokStatusInfo(detailPayload);
        const message = `TikTok error: ${incomeLabel} | ${detailLabel} | ${orderLabel}`;
        const statusMessage = tiktokMessages.length
          ? `TikTok error: ${tiktokMessages.join(" • ")}`
          : message;
        if (tiktokStatusInfo.subtitle || tiktokStatusInfo.description) {
          setStatus(
            {
              title: "TikTok error",
              subtitle: tiktokStatusInfo.subtitle,
              description: tiktokStatusInfo.description
            },
            "error"
          );
        } else {
          setStatus(statusMessage, "error");
        }
        setError(statusMessage, detailPayload);
      }
      openViewerBtn.disabled = false;
      success = Boolean(
        incomeHttpOk &&
          orderHttpOk &&
          incomeAppOk &&
          orderAppOk &&
          parsedIncome &&
          parsedOrder &&
          (detailMissing || (detailHttpOk && detailAppOk && parsedIncomeDetail))
      );
    } catch (err) {
      setStatus(`Gagal mengambil data: ${err.message}`, "error");
      setError(err.message, {
        tabUrl: tab.url || "",
        orderEndpoint: orderUrl,
        statementEndpoint: statementUrl,
        statementDetailEndpoint: statementDetailUrl,
        marketplace: activeMarketplace
      });
      setOutput(String(err), "");
    } finally {
      fetchBtn.disabled = false;
      setLoading(false);
    }

    return success;
  }

  if (activeMarketplace !== "shopee") {
    setStatus("Fetch hanya tersedia untuk Shopee/TikTok saat ini.", "error");
    setError("Marketplace aktif bukan Shopee/TikTok.");
    fetchBtn.disabled = false;
    openViewerBtn.disabled = false;
    setLoading(false);
    return false;
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
      setError("Eksekusi script di tab gagal. Coba refresh halaman seller.", {
        tabUrl: tab.url || "",
        incomeEndpoint: incomeUrl,
        orderEndpoint: orderUrl,
        marketplace: activeMarketplace
      });
      openViewerBtn.disabled = false;
      return false;
    }
    if (result.error) {
      setStatus(`Gagal di tab: ${result.error}`, "error");
      setError(result.error, {
        tabUrl: tab.url || "",
        incomeEndpoint: incomeUrl,
        orderEndpoint: orderUrl,
        marketplace: activeMarketplace
      });
      openViewerBtn.disabled = false;
      return false;
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
      setError(message, {
        income: buildFetchErrorDetail(result.income, "income"),
        order: buildFetchErrorDetail(result.order, "order"),
        orderId: result.orderId || "",
        marketplace: activeMarketplace
      });
    }
    openViewerBtn.disabled = false;
    success = Boolean(incomeOk && orderOk && parsedIncome && parsedOrder);
  } catch (err) {
    setStatus(`Gagal mengambil data: ${err.message}`, "error");
    setError(err.message, {
      tabUrl: targetTab?.url || "",
      incomeEndpoint: incomeUrl,
      orderEndpoint: orderUrl,
      marketplace: activeMarketplace
    });
    setOutput(String(err), "");
  } finally {
    fetchBtn.disabled = false;
    setLoading(false);
  }

  return success;
};

const fetchAndSend = async () => {
  if (fetchSendBtn) fetchSendBtn.disabled = true;
  const ok = await fetchData();
  if (ok) {
    await sendExportRequest();
  }
  updateActionState();
};

const fetchSendAwb = async () => {
  if (fetchSendAwbBtn) fetchSendAwbBtn.disabled = true;
  const ok = await fetchData();
  if (ok) {
    await sendExportRequest();
  }
  await downloadAwb();
  updateActionState();
};

const downloadAwb = async () => {
  if (!ensureLoggedIn()) return;
  setStatus("Menyiapkan AWB...", "info");
  setError("");
  setLoading(true);
  if (downloadAwbBtn) downloadAwbBtn.disabled = true;

  try {
    const targetTab = await getTargetTab();
    if (!targetTab?.ok || !targetTab?.tabId) {
      setStatus("Tidak ada tab marketplace ditemukan.", "error");
      setError(targetTab?.error || "Tidak ada tab marketplace. Buka halaman seller lalu coba lagi.");
      return;
    }

    activeMarketplace = detectMarketplace(targetTab.url);
    const tab = { id: targetTab.tabId, url: targetTab.url };
    if (activeMarketplace === "tiktok_shop") {
      const tiktokCfg = settingsCache.marketplaces?.tiktok_shop || {};
      const awbCfg = tiktokCfg.awb || {};
      const generateUrl = awbCfg.generateEndpoint || DEFAULT_TIKTOK_AWB_GENERATE_ENDPOINT;
      const orderUrl = tiktokCfg.orderEndpoint || DEFAULT_TIKTOK_ORDER_ENDPOINT;
      const filePrefix = awbCfg.filePrefix || DEFAULT_TIKTOK_AWB_FILE_PREFIX;

      const [execResult] = await chrome.scripting.executeScript({
        target: { tabId: targetTab.tabId },
        func: pageFetcherTikTokAwb,
        args: [orderUrl, generateUrl, filePrefix]
      });
      const result = execResult?.result;

      if (!result) {
        setStatus("Tidak ada hasil dari tab (mungkin diblokir CSP atau error lain).", "error");
        setError("Eksekusi script di tab gagal. Coba refresh halaman seller.", {
          tabUrl: targetTab.url || "",
          orderEndpoint: orderUrl,
          generateEndpoint: generateUrl,
          marketplace: activeMarketplace
        });
        return;
      }

      if (result.error) {
        const tiktokMessages = extractTikTokMessages(result.detail);
        const tiktokStatusInfo = extractTikTokStatusInfo(result.detail);
        const statusMessage = tiktokMessages.length
          ? `AWB gagal: ${tiktokMessages.join(" • ")}`
          : `Gagal download AWB: ${result.error}`;
        if (tiktokStatusInfo.subtitle || tiktokStatusInfo.description) {
          setStatus(
            {
              title: "AWB gagal",
              subtitle: tiktokStatusInfo.subtitle,
              description: tiktokStatusInfo.description
            },
            "error"
          );
        } else {
          setStatus(statusMessage, "error");
        }
        setError(result.error, {
          detail: result.detail,
          tiktokMessages,
          step: result.step,
          docUrl: result.openUrl,
          marketplace: activeMarketplace
        });
        return;
      }

      if (result.downloaded) {
        setStatus(`AWB diunduh: ${result.fileName || "PDF"}`, "ok");
        return;
      }

      if (result.openUrl) {
        const label = result.fileName ? ` (${result.fileName})` : "";
        setStatus(`AWB siap${label}, membuka file...`, "ok");
        await chrome.tabs.create({ url: result.openUrl });
        return;
      }

      setStatus("AWB selesai diproses.", "ok");
      return;
    }

    if (activeMarketplace !== "shopee") {
      setStatus("AWB hanya tersedia untuk Shopee/TikTok Shop.", "error");
      setError("Marketplace aktif bukan Shopee/TikTok Shop.");
      return;
    }

    const shopeeCfg = settingsCache.marketplaces?.shopee || {};
    const awbCfg = shopeeCfg.awb || {};
    const packageUrl = awbCfg.getPackageEndpoint || DEFAULT_AWB_PACKAGE_ENDPOINT;
    const createUrl = awbCfg.createJobEndpoint || DEFAULT_AWB_CREATE_JOB_ENDPOINT;
    const downloadUrl = awbCfg.downloadJobEndpoint || DEFAULT_AWB_DOWNLOAD_JOB_ENDPOINT;
    const orderUrl = shopeeCfg.orderEndpoint || DEFAULT_ORDER_ENDPOINT;
    const awbOptions = {
      regionId: awbCfg.regionId || DEFAULT_AWB_REGION_ID,
      asyncSdVersion: awbCfg.asyncSdVersion || DEFAULT_AWB_ASYNC_VERSION,
      fileType: awbCfg.fileType || DEFAULT_AWB_FILE_TYPE,
      fileName: awbCfg.fileName || DEFAULT_AWB_FILE_NAME,
      fileContents: awbCfg.fileContents || DEFAULT_AWB_FILE_CONTENTS
    };

    const [execResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: pageFetcherAwb,
      args: [packageUrl, createUrl, downloadUrl, orderUrl, awbOptions]
    });
    const result = execResult?.result;

    if (!result) {
      setStatus("Tidak ada hasil dari tab (mungkin diblokir CSP atau error lain).", "error");
      setError("Eksekusi script di tab gagal. Coba refresh halaman seller.", {
        tabUrl: tab.url || "",
        packageEndpoint: packageUrl,
        createJobEndpoint: createUrl,
        downloadJobEndpoint: downloadUrl,
        orderEndpoint: orderUrl,
        marketplace: activeMarketplace
      });
      return;
    }

    if (result.error) {
      const shopeeStatusInfo = extractShopeeStatusInfo(result.detail);
      if (shopeeStatusInfo.subtitle) {
        setStatus(
          {
            title: "AWB gagal",
            subtitle: shopeeStatusInfo.subtitle,
            description: ""
          },
          "error"
        );
      } else {
        setStatus(`Gagal download AWB: ${result.error}`, "error");
      }
      setError(result.error, {
        detail: result.detail,
        step: result.step,
        downloadUrl: result.downloadUrl,
        printUrl: result.printUrl,
        jobId: result.jobId
      });
      if (result.step === "download" && result.printUrl) {
        await chrome.tabs.create({ url: result.printUrl });
      }
      return;
    }

    if (result.openUrl) {
      const label = result.fileName ? ` (${result.fileName})` : "";
      setStatus(`AWB siap${label}, membuka file...`, "ok");
      await chrome.tabs.create({ url: result.openUrl });
      return;
    }

    if (result.downloaded) {
      setStatus(`AWB diunduh: ${result.fileName || "PDF"}`, "ok");
      return;
    }

    if (result.printUrl) {
      const label = result.fileName ? ` (${result.fileName})` : "";
      setStatus(`AWB siap${label}, membuka halaman AWB...`, "ok");
      await chrome.tabs.create({ url: result.printUrl });
      return;
    }

    setStatus("AWB selesai diproses.", "ok");
  } catch (err) {
    setStatus(`Gagal memproses AWB: ${err.message}`, "error");
    setError(err.message, {
      marketplace: activeMarketplace
    });
  } finally {
    if (downloadAwbBtn) downloadAwbBtn.disabled = false;
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

const openBulkPage = async () => {
  const url = chrome.runtime.getURL("src/bulk/bulk.html");
  try {
    await chrome.tabs.create({ url });
  } catch (err) {
    setStatus(`Gagal membuka bulk: ${err.message}`, "error");
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
  if (fetchSendAwbBtn) fetchSendAwbBtn.addEventListener("click", fetchSendAwb);
  if (fetchSendBtn) fetchSendBtn.addEventListener("click", fetchAndSend);
  if (refreshIncomeBtn) refreshIncomeBtn.addEventListener("click", refreshIncomeOnly);
  if (downloadAwbBtn) downloadAwbBtn.addEventListener("click", downloadAwb);
  if (openViewerBtn) openViewerBtn.addEventListener("click", openViewerPage);
  if (openBulkBtn) openBulkBtn.addEventListener("click", openBulkPage);
  if (openOrderBtn) {
    openOrderBtn.addEventListener("click", async () => {
      const url = openOrderBtn.dataset.url || "";
      if (!url) return;
      try {
        await chrome.tabs.create({ url });
      } catch (err) {
        setStatus(`Gagal membuka order: ${err.message}`, "error");
      }
    });
  }
  if (sendExportBtn) sendExportBtn.addEventListener("click", sendExportRequest);
  if (openSettingsBtn) openSettingsBtn.addEventListener("click", openOptionsPage);
  if (loginBtn) loginBtn.addEventListener("click", login);
  if (refreshProfileBtn) refreshProfileBtn.addEventListener("click", fetchProfile);
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
  if (authBaseUrlEl) authBaseUrlEl.addEventListener("change", syncAuthFromInputs);
  if (authEmailEl) authEmailEl.addEventListener("change", syncAuthFromInputs);
  if (authDeviceNameEl) authDeviceNameEl.addEventListener("change", syncAuthFromInputs);
  if (authTokenEl) {
    authTokenEl.addEventListener("change", async () => {
      await syncAuthFromInputs();
      if (authTokenEl.value.trim()) {
        await fetchProfile();
      }
    });
  }
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
  if (errorDetailsEl && errorDetailsToggleEl) {
    const updateToggle = () => {
      errorDetailsToggleEl.textContent = errorDetailsEl.open
        ? "Sembunyikan detail"
        : "Tampilkan detail";
    };
    errorDetailsEl.addEventListener("toggle", updateToggle);
    updateToggle();
  }

  try {
    const targetTab = await getTargetTab();
    activeMarketplace = detectMarketplace(targetTab?.url);
  } catch (e) {
    activeMarketplace = settingsCache.defaultMarketplace || "shopee";
  }

  hydrateAuthForm();
  openViewerBtn.disabled = true;
  const baseUrl = resolveAuthBaseUrl();
  if (baseUrl) {
    const granted = await ensurePowermaxxPermission(baseUrl);
    if (granted) {
      await registerPowermaxxBridge(baseUrl);
    }
  }

  if (settingsCache.auth?.token && !settingsCache.auth?.profile) {
    fetchProfile();
  }

  if (!getAuthToken()) {
    setStatus("Silakan login untuk mulai.", "error");
  } else {
    setStatus("Siap digunakan.", "ok");
  }
};

document.addEventListener("DOMContentLoaded", init);
