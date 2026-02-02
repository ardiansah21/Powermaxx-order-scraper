/* global chrome, importScripts, bulkTabRunner */
if (typeof importScripts === "function") {
  try {
    importScripts("shared/bulk-tab-runner.js");
  } catch (e) {
    // ignore: bridge single akan gagal jika runner tidak tersedia
  }
}
(() => {
  "use strict";

  const BULK_URL = chrome.runtime.getURL("src/bulk/bulk.html");
  const SETTINGS_KEY = "arvaSettings";
  const BRIDGE_SCRIPT_ID = "powermaxx-bridge";
  const BRIDGE_SCRIPT = "src/bridge/powermaxx-bridge.js";
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

  const openBulkPage = () => {
    chrome.tabs.create({ url: BULK_URL });
  };

  const getStorageArea = () => chrome.storage?.sync || chrome.storage?.local;

  const normalizeBaseUrl = (value) => (value || "").trim().replace(/\/+$/, "");

  const normalizeMarketplace = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    if (raw === "shopee") return "shopee";
    if (raw === "tiktok" || raw === "tiktok shop" || raw === "tiktok_shop") {
      return "tiktok_shop";
    }
    if (raw === "auto") return "auto";
    return "";
  };

  const normalizeIdType = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    if (raw === "mp_order_id" || raw === "order_id") return "order_id";
    if (raw === "order_sn") return "order_sn";
    return "";
  };

  const resolveActionMode = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "update_income") return "update_income";
    if (raw === "update_order") return "update_order";
    return "fetch_send";
  };

  const getMarketplaceLabel = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "shopee") return "Shopee";
    if (normalized === "tiktok_shop" || normalized === "tiktok" || normalized === "tiktok shop") {
      return "TikTok Shop";
    }
    if (normalized === "auto") return "Auto";
    return String(value || "").toUpperCase();
  };

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

  const clearAuthSession = async (baseUrl = "") => {
    const storage = getStorageArea();
    if (!storage) return;
    return new Promise((resolve) => {
      storage.get([SETTINGS_KEY], (result) => {
        const current = result?.[SETTINGS_KEY] || {};
        const next = {
          ...current,
          auth: {
            ...(current.auth || {}),
            baseUrl: baseUrl || current.auth?.baseUrl || "",
            token: "",
            profile: null
          }
        };
        storage.set({ [SETTINGS_KEY]: next }, resolve);
      });
    });
  };

  const snippet = (value, max = 400) => {
    const text = String(value || "");
    if (text.length <= max) return text;
    return `${text.slice(0, max)}...`;
  };

  const buildOrderUrl = (template, orderSn) => {
    if (!template.includes("{order_sn}")) {
      throw new Error("Template URL wajib berisi {order_sn}.");
    }
    return template.replace("{order_sn}", encodeURIComponent(orderSn));
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

  const normalizeSingleOrder = (value) => {
    if (!value) return null;
    const item = Array.isArray(value) ? value[0] : value;
    if (!item) return null;
    const rawId =
      item?.mp_order_id ??
      item?.order_id ??
      item?.order_sn ??
      item?.id ??
      item?.orderId ??
      item?.orderSn;
    const id = String(rawId || "").trim();
    if (!id) return null;
    const marketplace = normalizeMarketplace(item?.marketplace);
    let idType = normalizeIdType(item?.id_type || item?.idType);
    if (!idType) {
      if (item?.mp_order_id !== undefined || item?.order_id !== undefined) {
        idType = "order_id";
      } else if (item?.order_sn !== undefined) {
        idType = "order_sn";
      }
    }
    return {
      id,
      marketplace,
      idType
    };
  };

  const buildEndpoints = (settings, marketplace) => {
    const mpSettings = settings?.marketplaces?.[marketplace] || {};
    const shopeeAwb = mpSettings.awb || {};
    const tiktokAwb = mpSettings.awb || {};
    return {
      endpoints: {
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
      },
      awbOptions: {
        regionId: shopeeAwb.regionId || DEFAULT_AWB_REGION_ID,
        asyncSdVersion: shopeeAwb.asyncSdVersion || DEFAULT_AWB_ASYNC_VERSION,
        fileType: shopeeAwb.fileType || DEFAULT_AWB_FILE_TYPE,
        fileName: shopeeAwb.fileName || DEFAULT_AWB_FILE_NAME,
        fileContents: shopeeAwb.fileContents || DEFAULT_AWB_FILE_CONTENTS
      }
    };
  };

  const runSingleBridgeJob = async (message) => {
    if (typeof bulkTabRunner !== "function" || !chrome?.scripting) {
      return { ok: false, error: "Runner tidak tersedia." };
    }

    const order = normalizeSingleOrder(message?.orders);
    if (!order?.id) {
      return { ok: false, error: "Order tidak ditemukan." };
    }

    const marketplace = normalizeMarketplace(order.marketplace);
    if (!marketplace || marketplace === "auto") {
      return { ok: false, error: "Marketplace wajib diisi." };
    }

    if (marketplace === "shopee" && order.idType !== "order_id") {
      return { ok: false, error: "Shopee membutuhkan mp_order_id." };
    }

    const settings = await loadSettings();
    const token = settings?.auth?.token || "";
    const baseUrl = normalizeBaseUrl(settings?.auth?.baseUrl || "");
    if (!token) {
      return { ok: false, error: "Token belum ada. Login dulu di popup." };
    }
    if (!baseUrl) {
      return { ok: false, error: "Base URL belum diatur." };
    }

    const actionMode = resolveActionMode(message?.action);
    const { endpoints, awbOptions } = buildEndpoints(settings, marketplace);

    let orderUrl = "";
    if (marketplace === "shopee") {
      orderUrl = DEFAULT_TEMPLATES.shopee.replace(
        "{order_id}",
        encodeURIComponent(String(order.id))
      );
    } else {
      orderUrl = buildOrderUrl(DEFAULT_TEMPLATES.tiktok_shop, order.id);
    }

    let tab = null;
    try {
      tab = await chrome.tabs.create({ url: orderUrl, active: false });
      await waitForAllowedUrl(tab.id, marketplace, orderUrl);

      const execResultList = await withTimeout(
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: bulkTabRunner,
          args: [
            marketplace,
            endpoints,
            DEFAULT_COMPONENTS,
            awbOptions,
            { includeAwb: false, mode: actionMode }
          ]
        }),
        120000,
        "Timeout proses di tab."
      );

      const result = execResultList?.[0]?.result;
      if (!result || result.error) {
        return {
          ok: false,
          error: result?.error || "Gagal ambil data",
          detail: result?.detail || null
        };
      }
      if (!result.ok) {
        return { ok: false, error: "Data error", detail: result };
      }

      const exportPayload = buildExportPayload(marketplace, result);
      const exportResult = await sendExport(baseUrl, token, exportPayload);

      if (exportResult.unauthenticated) {
        await clearAuthSession(baseUrl);
        return {
          ok: false,
          error: "Token tidak valid atau kadaluarsa. Login ulang di popup.",
          detail: exportResult
        };
      }

      if (exportResult.ok && result.ok) {
        return { ok: true };
      }

      const msg = exportResult.ok ? "Data error" : `Export ${exportResult.status}`;
      return {
        ok: false,
        error: msg,
        detail: exportResult.ok ? result : exportResult
      };
    } catch (err) {
      return { ok: false, error: err?.message || "Gagal menjalankan proses." };
    } finally {
      if (tab?.id) {
        try {
          await chrome.tabs.remove(tab.id);
        } catch (e) {
          // ignore
        }
      }
    }
  };

  const buildMatchPattern = (baseUrl) => {
    const clean = normalizeBaseUrl(baseUrl);
    if (!clean) return "";
    try {
      const url = new URL(clean);
      return `${url.origin}/*`;
    } catch (e) {
      return "";
    }
  };

  const uniq = (items) => Array.from(new Set(items.filter(Boolean)));

  const containsPermission = (origin) =>
    new Promise((resolve) => {
      if (!chrome.permissions) return resolve(false);
      chrome.permissions.contains({ origins: [origin] }, (granted) => {
        resolve(Boolean(granted));
      });
    });

  const registerBridgeScripts = async (matches) => {
    if (!chrome.scripting) return;
    try {
      await chrome.scripting.unregisterContentScripts({ ids: [BRIDGE_SCRIPT_ID] });
    } catch (e) {
      // ignore
    }
    if (!matches.length) return;
    await chrome.scripting.registerContentScripts([
      {
        id: BRIDGE_SCRIPT_ID,
        js: [BRIDGE_SCRIPT],
        matches,
        runAt: "document_start"
      }
    ]);
  };

  const ensureBridgeForBaseUrls = async (baseUrls) => {
    const patterns = uniq(baseUrls.map(buildMatchPattern));
    if (!patterns.length) return [];
    const granted = [];
    for (const pattern of patterns) {
      const has = await containsPermission(pattern);
      if (has) granted.push(pattern);
    }
    await registerBridgeScripts(granted);
    return granted;
  };

  const syncBridgeFromSettings = () => {
    const storage = getStorageArea();
    if (!storage) return;
    storage.get([SETTINGS_KEY], (result) => {
      const settings = result?.[SETTINGS_KEY] || {};
      const urls = [
        settings?.auth?.baseUrl,
        settings?.marketplaces?.shopee?.baseUrl,
        settings?.marketplaces?.tiktok_shop?.baseUrl
      ];
      ensureBridgeForBaseUrls(urls);
    });
  };

  chrome.runtime.onInstalled.addListener(syncBridgeFromSettings);
  chrome.runtime.onStartup.addListener(syncBridgeFromSettings);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (!changes?.[SETTINGS_KEY]) return;
    syncBridgeFromSettings();
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) {
      return;
    }

    if (message.type === "POWERMAXX_BRIDGE_REGISTER") {
      const baseUrls = Array.isArray(message.baseUrls)
        ? message.baseUrls
        : [message.baseUrl];
      ensureBridgeForBaseUrls(baseUrls).then((matches) => {
        sendResponse({ ok: true, matches });
      });
      return true;
    }

    if (message.type === "POWERMAXX_SINGLE") {
      runSingleBridgeJob(message).then((result) => {
        sendResponse({
          ok: Boolean(result?.ok),
          error: result?.error || "",
          detail: result?.detail || null
        });
      });
      return true;
    }

    if (message.type !== "POWERMAXX_BULK") {
      return;
    }

    const payload = {
      action: message.action || "update_both",
      mode: message.mode || "bulk",
      orders: Array.isArray(message.orders) ? message.orders : [],
      orderSnList: Array.isArray(message.orderSnList)
        ? message.orderSnList
        : [],
      sourceUrl: message.sourceUrl || sender?.url || "",
      createdAt: Date.now()
    };

    chrome.storage.local.set({ bulkBridgePayload: payload }, () => {
      openBulkPage();
      sendResponse({ ok: true, count: payload.orders.length || payload.orderSnList.length });
    });

    return true;
  });
})();
