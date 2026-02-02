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

const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("saveBtn");
const defaultMarketplaceEl = document.getElementById("defaultMarketplace");
const baseUrlEl = document.getElementById("baseUrl");
const shopeeIncomeEndpointEl = document.getElementById("shopeeIncomeEndpoint");
const shopeeOrderEndpointEl = document.getElementById("shopeeOrderEndpoint");
const shopeeAwbPackageEndpointEl = document.getElementById("shopeeAwbPackageEndpoint");
const shopeeAwbCreateJobEndpointEl = document.getElementById("shopeeAwbCreateJobEndpoint");
const shopeeAwbDownloadJobEndpointEl = document.getElementById("shopeeAwbDownloadJobEndpoint");
const shopeeAwbRegionIdEl = document.getElementById("shopeeAwbRegionId");
const shopeeAwbAsyncVersionEl = document.getElementById("shopeeAwbAsyncVersion");
const shopeeAwbFileTypeEl = document.getElementById("shopeeAwbFileType");
const shopeeAwbFileNameEl = document.getElementById("shopeeAwbFileName");
const shopeeAwbFileContentsEl = document.getElementById("shopeeAwbFileContents");
const tiktokOrderEndpointEl = document.getElementById("tiktokOrderEndpoint");
const tiktokStatementEndpointEl = document.getElementById("tiktokStatementEndpoint");
const tiktokStatementDetailEndpointEl = document.getElementById("tiktokStatementDetailEndpoint");
const tiktokAwbGenerateEndpointEl = document.getElementById("tiktokAwbGenerateEndpoint");
const tiktokAwbFilePrefixEl = document.getElementById("tiktokAwbFilePrefix");

const setStatus = (message, tone = "info") => {
  statusEl.textContent = message;
  statusEl.classList.remove("ok", "error");
  if (tone === "ok") statusEl.classList.add("ok");
  if (tone === "error") statusEl.classList.add("error");
};

const getStorageArea = () => chrome.storage?.sync || chrome.storage?.local;

const normalizeBaseUrl = (value) => (value || "").trim().replace(/\/+$/, "");

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

let settingsCache = DEFAULT_SETTINGS;

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
      const merged = {
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
      };
      settingsCache = merged;
      resolve(merged);
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

const fillForm = (settings) => {
  defaultMarketplaceEl.value = settings.defaultMarketplace || "shopee";
  const resolvedBaseUrl =
    settings.auth?.baseUrl ||
    settings.marketplaces?.shopee?.baseUrl ||
    settings.marketplaces?.tiktok_shop?.baseUrl ||
    DEFAULT_AUTH_BASE_URL;
  baseUrlEl.value = resolvedBaseUrl || "";
  shopeeIncomeEndpointEl.value =
    settings.marketplaces?.shopee?.incomeEndpoint || DEFAULT_INCOME_ENDPOINT;
  shopeeOrderEndpointEl.value =
    settings.marketplaces?.shopee?.orderEndpoint || DEFAULT_ORDER_ENDPOINT;
  const awbSettings = settings.marketplaces?.shopee?.awb || {};
  shopeeAwbPackageEndpointEl.value =
    awbSettings.getPackageEndpoint || DEFAULT_AWB_PACKAGE_ENDPOINT;
  shopeeAwbCreateJobEndpointEl.value =
    awbSettings.createJobEndpoint || DEFAULT_AWB_CREATE_JOB_ENDPOINT;
  shopeeAwbDownloadJobEndpointEl.value =
    awbSettings.downloadJobEndpoint || DEFAULT_AWB_DOWNLOAD_JOB_ENDPOINT;
  shopeeAwbRegionIdEl.value = awbSettings.regionId || DEFAULT_AWB_REGION_ID;
  shopeeAwbAsyncVersionEl.value =
    awbSettings.asyncSdVersion || DEFAULT_AWB_ASYNC_VERSION;
  shopeeAwbFileTypeEl.value = awbSettings.fileType || DEFAULT_AWB_FILE_TYPE;
  shopeeAwbFileNameEl.value = awbSettings.fileName || DEFAULT_AWB_FILE_NAME;
  shopeeAwbFileContentsEl.value =
    awbSettings.fileContents || DEFAULT_AWB_FILE_CONTENTS;
  tiktokOrderEndpointEl.value =
    settings.marketplaces?.tiktok_shop?.orderEndpoint || DEFAULT_TIKTOK_ORDER_ENDPOINT;
  tiktokStatementEndpointEl.value =
    settings.marketplaces?.tiktok_shop?.statementEndpoint || DEFAULT_TIKTOK_STATEMENT_ENDPOINT;
  tiktokStatementDetailEndpointEl.value =
    settings.marketplaces?.tiktok_shop?.statementDetailEndpoint || DEFAULT_TIKTOK_STATEMENT_DETAIL_ENDPOINT;
  const tiktokAwbSettings = settings.marketplaces?.tiktok_shop?.awb || {};
  tiktokAwbGenerateEndpointEl.value =
    tiktokAwbSettings.generateEndpoint || DEFAULT_TIKTOK_AWB_GENERATE_ENDPOINT;
  tiktokAwbFilePrefixEl.value = tiktokAwbSettings.filePrefix || DEFAULT_TIKTOK_AWB_FILE_PREFIX;
};

const collectForm = () => {
  const baseUrl =
    baseUrlEl.value.trim() || settingsCache.auth?.baseUrl || DEFAULT_AUTH_BASE_URL;
  return {
    defaultMarketplace: defaultMarketplaceEl.value || "shopee",
    auth: {
      ...settingsCache.auth,
      baseUrl
    },
    marketplaces: {
      shopee: {
        baseUrl,
        incomeEndpoint: shopeeIncomeEndpointEl.value.trim() || DEFAULT_INCOME_ENDPOINT,
        orderEndpoint: shopeeOrderEndpointEl.value.trim() || DEFAULT_ORDER_ENDPOINT,
        awb: {
          getPackageEndpoint:
            shopeeAwbPackageEndpointEl.value.trim() || DEFAULT_AWB_PACKAGE_ENDPOINT,
          createJobEndpoint:
            shopeeAwbCreateJobEndpointEl.value.trim() || DEFAULT_AWB_CREATE_JOB_ENDPOINT,
          downloadJobEndpoint:
            shopeeAwbDownloadJobEndpointEl.value.trim() || DEFAULT_AWB_DOWNLOAD_JOB_ENDPOINT,
          regionId: shopeeAwbRegionIdEl.value.trim() || DEFAULT_AWB_REGION_ID,
          asyncSdVersion:
            shopeeAwbAsyncVersionEl.value.trim() || DEFAULT_AWB_ASYNC_VERSION,
          fileType: shopeeAwbFileTypeEl.value.trim() || DEFAULT_AWB_FILE_TYPE,
          fileName: shopeeAwbFileNameEl.value.trim() || DEFAULT_AWB_FILE_NAME,
          fileContents:
            shopeeAwbFileContentsEl.value.trim() || DEFAULT_AWB_FILE_CONTENTS
        }
      },
      tiktok_shop: {
        baseUrl,
        orderEndpoint:
          tiktokOrderEndpointEl.value.trim() || DEFAULT_TIKTOK_ORDER_ENDPOINT,
        statementEndpoint:
          tiktokStatementEndpointEl.value.trim() || DEFAULT_TIKTOK_STATEMENT_ENDPOINT,
        statementDetailEndpoint:
          tiktokStatementDetailEndpointEl.value.trim() ||
          DEFAULT_TIKTOK_STATEMENT_DETAIL_ENDPOINT,
        awb: {
          generateEndpoint:
            tiktokAwbGenerateEndpointEl.value.trim() || DEFAULT_TIKTOK_AWB_GENERATE_ENDPOINT,
          filePrefix:
            tiktokAwbFilePrefixEl.value.trim() || DEFAULT_TIKTOK_AWB_FILE_PREFIX
        }
      }
    }
  };
};


const init = async () => {
  const settings = await loadSettings();
  fillForm(settings);

  saveBtn.addEventListener("click", async () => {
    const next = collectForm();
    const merged = {
      ...settingsCache,
      ...next,
      marketplaces: {
        shopee: {
          ...settingsCache.marketplaces?.shopee,
          ...next.marketplaces.shopee,
          awb: {
            ...settingsCache.marketplaces?.shopee?.awb,
            ...next.marketplaces.shopee.awb
          }
        },
        tiktok_shop: {
          ...settingsCache.marketplaces?.tiktok_shop,
          ...next.marketplaces.tiktok_shop,
          awb: {
            ...settingsCache.marketplaces?.tiktok_shop?.awb,
            ...next.marketplaces.tiktok_shop.awb
          }
        }
      }
    };
    settingsCache = merged;
    await saveSettings(merged);
    const baseUrl = normalizeBaseUrl(merged.auth?.baseUrl || "");
    if (baseUrl) {
      const granted = await ensurePowermaxxPermission(baseUrl);
      if (granted) {
        await registerPowermaxxBridge(baseUrl);
        setStatus("Pengaturan tersimpan.", "ok");
      } else {
        setStatus("Pengaturan tersimpan. Izin host belum diberikan.", "error");
      }
    } else {
      setStatus("Pengaturan tersimpan.", "ok");
    }
  });
};

document.addEventListener("DOMContentLoaded", init);
