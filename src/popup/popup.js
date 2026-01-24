const DEFAULT_INCOME_ENDPOINT =
  "https://seller.shopee.co.id/api/v4/accounting/pc/seller_income/income_detail/get_order_income_components";
const DEFAULT_ORDER_ENDPOINT =
  "https://seller.shopee.co.id/api/v3/order/get_one_order";
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
    tiktok: {
      baseUrl: "https://powermaxx.test"
    }
  }
};

const fetchBtn = document.getElementById("fetchBtn");
const statusEl = document.getElementById("status");
const statusCardEl = document.getElementById("statusCard");
const statusIconEl = document.getElementById("statusIcon");
const sendExportBtn = document.getElementById("sendExportBtn");
const fetchSendBtn = document.getElementById("fetchSendBtn");
const downloadAwbBtn = document.getElementById("downloadAwbBtn");
const openSettingsBtn = document.getElementById("openSettingsBtn");
const openViewerBtn = document.getElementById("openViewerBtn");
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
const statusSpinner = document.getElementById("statusSpinner");
const errorDetailsEl = document.getElementById("errorDetails");
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
  if (statusCardEl) {
    statusCardEl.classList.remove("ok", "error", "info");
    statusCardEl.classList.add(tone);
  }
  if (statusIconEl) {
    statusIconEl.textContent = tone === "ok" ? "✓" : tone === "error" ? "!" : "•";
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
    return;
  }
  profileNameEl.textContent = authProfileCache?.name || "-";
  profileEmailEl.textContent = authProfileCache?.email || "-";
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
  if (fetchBtn) fetchBtn.disabled = !loggedIn;
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
      const storedMarketplaces = stored.marketplaces || {};
      resolve({
        ...DEFAULT_SETTINGS,
        ...stored,
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
          tiktok: {
            ...DEFAULT_SETTINGS.marketplaces.tiktok,
            ...(storedMarketplaces.tiktok || {})
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
  if (host.includes("tiktok")) return "tiktok";
  return settingsCache.defaultMarketplace || "shopee";
};

const setLoading = (isLoading) => {
  statusSpinner.classList.toggle("hidden", !isLoading);
};

const setError = (message) => {
  if (!message) {
    if (errorDetailsEl) {
      errorDetailsEl.classList.add("hidden");
      errorDetailsEl.open = false;
    }
    errorTextEl.textContent = "";
    return;
  }
  if (errorDetailsEl) {
    errorDetailsEl.classList.remove("hidden");
    errorDetailsEl.open = true;
  }
  errorTextEl.textContent = message;
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
    if (!response.ok) {
      setStatus(`Gagal ambil profil ${response.status}`, "error");
      return;
    }
    setProfile(data);
    await persistAuthSettings({
      baseUrl,
      token,
      email: authEmailEl.value.trim(),
      deviceName: authDeviceNameEl.value.trim() || DEFAULT_DEVICE_NAME,
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
  const deviceName = authDeviceNameEl.value.trim() || DEFAULT_DEVICE_NAME;

  if (!baseUrl) {
    setStatus("Base URL wajib diisi.", "error");
    return;
  }
  if (!email || !password) {
    setStatus("Email dan password wajib diisi.", "error");
    return;
  }

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
  authDeviceNameEl.value = settingsCache.auth?.deviceName || DEFAULT_DEVICE_NAME;
  if (authTokenEl) authTokenEl.value = settingsCache.auth?.token || "";
  setProfile(settingsCache.auth?.profile || null);
  updateActionState();
};

const syncAuthFromInputs = async () => {
  await persistAuthSettings({
    baseUrl: resolveAuthBaseUrl(),
    token: getAuthToken(),
    email: authEmailEl.value.trim(),
    deviceName: authDeviceNameEl.value.trim() || DEFAULT_DEVICE_NAME,
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
      )}${pad(now.getMinutes())}`;
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

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus("Tidak ada tab aktif ditemukan.", "error");
    setError("Tidak ada tab aktif. Buka halaman seller lalu coba lagi.");
    fetchBtn.disabled = false;
    openViewerBtn.disabled = false;
    setLoading(false);
    return false;
  }
  activeMarketplace = detectMarketplace(tab.url);

  if (activeMarketplace !== "shopee") {
    setStatus("Fetch hanya tersedia untuk Shopee saat ini.", "error");
    setError("Marketplace aktif bukan Shopee.");
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
      setError("Eksekusi script di tab gagal. Coba refresh halaman seller.");
      openViewerBtn.disabled = false;
      return false;
    }
    if (result.error) {
      setStatus(`Gagal di tab: ${result.error}`, "error");
      setError(result.error);
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
      setError(message);
    }
    openViewerBtn.disabled = false;
    success = Boolean(incomeOk && orderOk && parsedIncome && parsedOrder);
  } catch (err) {
    setStatus(`Gagal mengambil data: ${err.message}`, "error");
    setError(err.message);
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

const downloadAwb = async () => {
  if (!ensureLoggedIn()) return;
  setStatus("Menyiapkan AWB...", "info");
  setError("");
  setLoading(true);
  if (downloadAwbBtn) downloadAwbBtn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus("Tidak ada tab aktif ditemukan.", "error");
      setError("Tidak ada tab aktif. Buka halaman seller lalu coba lagi.");
      return;
    }

    activeMarketplace = detectMarketplace(tab.url);
    if (activeMarketplace !== "shopee") {
      setStatus("AWB hanya tersedia untuk Shopee.", "error");
      setError("Marketplace aktif bukan Shopee.");
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
      setError("Eksekusi script di tab gagal. Coba refresh halaman seller.");
      return;
    }

    if (result.error) {
      setStatus(`Gagal download AWB: ${result.error}`, "error");
      setError([result.error, result.detail].filter(Boolean).join("\n"));
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
    setError(err.message);
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

const init = async () => {
  settingsCache = await loadSettings();
  setStatus("Belum ada permintaan.");
  setError("");
  setLoading(false);
  setOutput("", "");
  clearRendered();

  fetchBtn.addEventListener("click", fetchData);
  if (fetchSendBtn) fetchSendBtn.addEventListener("click", fetchAndSend);
  if (downloadAwbBtn) downloadAwbBtn.addEventListener("click", downloadAwb);
  if (openViewerBtn) openViewerBtn.addEventListener("click", openViewerPage);
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

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeMarketplace = detectMarketplace(tab?.url);
  } catch (e) {
    activeMarketplace = settingsCache.defaultMarketplace || "shopee";
  }

  hydrateAuthForm();
  openViewerBtn.disabled = true;

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
