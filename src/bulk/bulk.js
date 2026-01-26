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
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: text,
      url
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

const bulkTabRunner = async (
  marketplace,
  endpoints,
  components,
  awbOptions,
  actionOptions
) => {
  const safeJson = (raw) => {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  };

  const pageFetcher = async (incomeBase, orderBase, bodyOverride, defaultComponents) => {
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
        const params = new URLSearchParams(location.search || "");
        const fromQuery = params.get("order_id") || params.get("orderId");
        if (fromQuery) return fromQuery;
        const pathMatch = location.pathname.match(/order\/(detail\/)?(\d+)/);
        return pathMatch ? pathMatch[2] : "";
      };

      const orderId = parseOrderId();
      if (!orderId) {
        return { error: "Order ID tidak ditemukan (buka halaman order)" };
      }

      const incomeUrl = new URL(incomeBase);
      ensureParams(incomeUrl);
      const orderUrl = new URL(orderBase);
      ensureParams(orderUrl);
      incomeUrl.searchParams.set("order_id", orderId);
      orderUrl.searchParams.set("order_id", orderId);

      const parseComponents = (raw) => {
        const list = String(raw || "")
          .split(",")
          .map((val) => Number(val.trim()))
          .filter((num) => Number.isFinite(num));
        return list.length ? list : [2, 3, 4, 5];
      };

      const body = bodyOverride || JSON.stringify({
        order_id: Number(orderId) || orderId,
        components: parseComponents(defaultComponents)
      });

      const incomeResp = await fetch(incomeUrl.toString(), {
        method: "POST",
        headers: {
          "content-type": "application/json;charset=UTF-8",
          accept: "application/json, text/plain, */*"
        },
        credentials: "include",
        body
      });
      const incomeBody = await incomeResp.text();
      const incomeJson = safeJson(incomeBody);

      const orderResp = await fetch(orderUrl.toString(), {
        method: "GET",
        headers: { accept: "application/json, text/plain, */*" },
        credentials: "include"
      });
      const orderBody = await orderResp.text();
      const orderJson = safeJson(orderBody);

      return {
        income: {
          ok: incomeResp.ok,
          status: incomeResp.status,
          statusText: incomeResp.statusText,
          appCode: incomeJson?.code,
          appMessage: incomeJson?.message,
          body: incomeBody
        },
        order: {
          ok: orderResp.ok,
          status: orderResp.status,
          statusText: orderResp.statusText,
          appCode: orderJson?.code,
          appMessage: orderJson?.message,
          body: orderBody
        },
        orderId
      };
    } catch (e) {
      return { error: e.message };
    }
  };

  const pageFetcherAwb = async (packageBase, createBase, downloadBase, orderBase, options) => {
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

      const orderUrl = new URL(orderBase);
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
      const customBaseName = String(options?.fileName || "").trim();
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

      const regionId = (options?.regionId || orderJson?.data?.seller_address?.country || "ID").trim();
      const parseFileContents = (raw) => {
        const items = String(raw || "")
          .split(",")
          .map((part) => Number(part.trim()))
          .filter((num) => Number.isFinite(num));
        return items.length ? items : [3];
      };

      const createUrl = new URL(createBase);
      ensureParams(createUrl);
      const asyncVersion = String(options?.asyncSdVersion || "").trim();
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
            file_type: options?.fileType || "THERMAL_PDF",
            file_name: createFileName,
            file_contents: parseFileContents(options?.fileContents || "3")
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
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = downloadFileName;
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          anchor.remove();
        }, 1000);
        return { ok: true, downloaded: true, fileName: downloadFileName, jobId };
      }

      return { ok: true, downloaded: false, fileName: downloadFileName, jobId };
    } catch (e) {
      return { error: e.message, step: "unknown" };
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
        statementBody = `{\"error\":\"${e.message}\"}`;
      }

      let detailResp;
      let detailBody = "";
      let detailJson = null;
      let detailUrl = "";
      let statementDetailId = "";
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
        } catch (e) {
          detailResp = null;
          detailBody = `{\"error\":\"${e.message}\"}`;
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

      const pickLatestResourceUrl = (keyword) => {
        const entries = performance.getEntriesByType("resource") || [];
        for (let i = entries.length - 1; i >= 0; i -= 1) {
          const url = entries[i]?.name || "";
          if (!url.includes(keyword)) continue;
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
      const formatTimestamp = () => {
        const now = new Date();
        const pad = (num) => String(num).padStart(2, "0");
        return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
          now.getHours()
        )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      };
      const fileName = `${formatTimestamp()}_TIKTOKSHOP_${orderId}.pdf`;

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
      if (!docUrl) {
        return { error: "doc_url tidak ditemukan", detail: generateText, step: "generate" };
      }

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

  const includeAwb = actionOptions?.includeAwb !== false;

  if (marketplace === "shopee") {
    const result = await pageFetcher(
      endpoints.incomeEndpoint,
      endpoints.orderEndpoint,
      "",
      components
    );
    if (result.error) return { error: result.error };
    const incomeJson = safeJson(result.income?.body || "");
    const orderJson = safeJson(result.order?.body || "");
    const incomeOk = result.income?.ok && (incomeJson?.code ?? 0) === 0;
    const orderOk = result.order?.ok && (orderJson?.code ?? 0) === 0;
    const awbResult = includeAwb
      ? await pageFetcherAwb(
          endpoints.packageEndpoint,
          endpoints.createEndpoint,
          endpoints.downloadEndpoint,
          endpoints.orderEndpoint,
          awbOptions
        )
      : { ok: true, skipped: true };
    return {
      ok: incomeOk && orderOk,
      orderRawJson: orderJson,
      incomeRawJson: incomeJson,
      incomeDetailRawJson: null,
      awb: awbResult,
      fetchMeta: {
        income: result.income,
        order: result.order
      }
    };
  }

  if (marketplace === "tiktok_shop") {
    const result = await pageFetcherTikTok(
      endpoints.orderEndpoint,
      endpoints.statementEndpoint,
      endpoints.statementDetailEndpoint
    );
    if (result.error) return { error: result.error };
    const incomeJson = safeJson(result.income?.body || "");
    const incomeDetailJson = safeJson(result.incomeDetail?.body || "");
    const orderJson = safeJson(result.order?.body || "");
    const incomeOk = result.income?.ok && (incomeJson?.code ?? 0) === 0;
    const orderOk = result.order?.ok && (orderJson?.code ?? 0) === 0;
    const detailOk =
      result.incomeDetail?.ok && (incomeDetailJson?.code ?? 0) === 0;
    const detailMissing =
      !result.incomeDetail?.ok &&
      (result.incomeDetail?.statusText || "").includes("statement_detail_id");
    const awbResult = includeAwb
      ? await pageFetcherTikTokAwb(
          endpoints.orderEndpoint,
          endpoints.generateEndpoint,
          endpoints.filePrefix
        )
      : { ok: true, skipped: true };
    return {
      ok: incomeOk && orderOk && (detailOk || detailMissing),
      orderRawJson: orderJson,
      incomeRawJson: incomeJson,
      incomeDetailRawJson: detailOk ? incomeDetailJson : null,
      awb: awbResult,
      fetchMeta: {
        income: result.income,
        incomeDetail: result.incomeDetail,
        order: result.order
      }
    };
  }

  return { error: "Marketplace tidak dikenali." };
};

const runBulk = async () => {
  if (running) return;
  cancelRun = false;
  running = true;

  settingsCache = await loadSettings();
  const selectedMarketplace = String(marketplaceEl.value || "auto");
  const selectedLabel = getMarketplaceLabel(selectedMarketplace);
  const actionMode = String(actionEl?.value || "all");
  const includeAwb = actionMode !== "fetch_send";
  const orders = parseOrders(orderListEl.value);
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
  const buildDetailPayload = (payload) => JSON.stringify(payload, null, 2);

  let done = 0;
  for (const orderId of orders) {
    if (cancelRun) break;
    let marketplace = selectedMarketplace;
    let orderUrl = "";
    let tab = null;
    let stage = "init";
    const startedAt = Date.now();
    let tabUrlForLog = "";
    addLog(orderId, "warn", formatLogMessage(selectedLabel, "Menyiapkan..."));
    try {
      if (selectedMarketplace === "auto" || selectedMarketplace === "shopee") {
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
        } else if (selectedMarketplace === "shopee") {
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
        marketplace = "tiktok_shop";
        orderUrl = buildOrderUrl(DEFAULT_TEMPLATES.tiktok_shop, orderId);
      }
      stage = "open_order";
      const safeMarketplace =
        typeof marketplace === "string" ? marketplace : selectedMarketplace;
      const mpLabel = getMarketplaceLabel(safeMarketplace);
      updateLog(orderId, "warn", formatLogMessage(mpLabel, "Menyiapkan..."));

      tab = await chrome.tabs.create({ url: orderUrl, active: false });
      tabUrlForLog = await waitForAllowedUrl(tab.id, safeMarketplace, orderUrl);
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
            { includeAwb }
          ]
        }),
        120000,
        "Timeout proses di tab."
      );
      const result = execResultList?.[0]?.result;

      if (!result || result.error) {
        summary.error += 1;
        const endedAt = Date.now();
        const detailPayload = buildDetailPayload({
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
              error: result?.error || "Gagal ambil data"
            },
            export: { ok: false },
            awb: { ok: false, requested: includeAwb }
          },
          error: {
            category: classifyError(result?.error || ""),
            message: result?.error || "Gagal ambil data"
          }
        });
        updateLog(
          orderId,
          "error",
          formatLogMessage(mpLabel, result?.error || "Gagal ambil data."),
          detailPayload,
          `${mpLabel} | ${orderId} | ${result?.error || "Gagal ambil data."}`
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
      const awbStep = {
        ok: !result.awb?.error,
        requested: includeAwb,
        skipped: !includeAwb,
        downloaded: result.awb?.downloaded,
        fileName: result.awb?.fileName,
        step: result.awb?.step,
        error: result.awb?.error,
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

      if (exportResult.ok && result.ok) {
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
          bodySnippet: snippet(exportResult.body, 500)
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
                  bodySnippet: snippet(exportResult.body, 500)
                }
              };
        const detail = buildDetailPayload(detailPayload);
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
      const errorDetail = buildDetailPayload(errorPayload);
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

const clearForm = () => {
  orderListEl.value = "";
  resetLogs();
  setStatus("Siap.");
  setProgress(0, 0);
  resetSummary(0);
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

  startBtn.addEventListener("click", runBulk);
  stopBtn.addEventListener("click", stopBulk);
  clearBtn.addEventListener("click", clearForm);
};

document.addEventListener("DOMContentLoaded", init);
