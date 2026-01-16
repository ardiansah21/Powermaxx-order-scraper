const DEFAULT_INCOME_ENDPOINT =
  "https://seller.shopee.co.id/api/v4/accounting/pc/seller_income/income_detail/get_order_income_components";
const DEFAULT_ORDER_ENDPOINT =
  "https://seller.shopee.co.id/api/v3/order/get_one_order";
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

const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("saveBtn");
const defaultMarketplaceEl = document.getElementById("defaultMarketplace");
const shopeeBaseUrlEl = document.getElementById("shopeeBaseUrl");
const shopeeTokenEl = document.getElementById("shopeeToken");
const shopeeIncomeEndpointEl = document.getElementById("shopeeIncomeEndpoint");
const shopeeOrderEndpointEl = document.getElementById("shopeeOrderEndpoint");
const tiktokBaseUrlEl = document.getElementById("tiktokBaseUrl");
const tiktokTokenEl = document.getElementById("tiktokToken");

const setStatus = (message, tone = "info") => {
  statusEl.textContent = message;
  statusEl.classList.remove("ok", "error");
  if (tone === "ok") statusEl.classList.add("ok");
  if (tone === "error") statusEl.classList.add("error");
};

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

const fillForm = (settings) => {
  defaultMarketplaceEl.value = settings.defaultMarketplace || "shopee";
  shopeeBaseUrlEl.value = settings.marketplaces?.shopee?.baseUrl || "";
  shopeeTokenEl.value = settings.marketplaces?.shopee?.token || "";
  shopeeIncomeEndpointEl.value =
    settings.marketplaces?.shopee?.incomeEndpoint || DEFAULT_INCOME_ENDPOINT;
  shopeeOrderEndpointEl.value =
    settings.marketplaces?.shopee?.orderEndpoint || DEFAULT_ORDER_ENDPOINT;
  tiktokBaseUrlEl.value = settings.marketplaces?.tiktok?.baseUrl || "";
  tiktokTokenEl.value = settings.marketplaces?.tiktok?.token || "";
};

const collectForm = () => ({
  defaultMarketplace: defaultMarketplaceEl.value || "shopee",
  marketplaces: {
    shopee: {
      baseUrl: shopeeBaseUrlEl.value.trim(),
      token: shopeeTokenEl.value.trim(),
      incomeEndpoint: shopeeIncomeEndpointEl.value.trim() || DEFAULT_INCOME_ENDPOINT,
      orderEndpoint: shopeeOrderEndpointEl.value.trim() || DEFAULT_ORDER_ENDPOINT
    },
    tiktok: {
      baseUrl: tiktokBaseUrlEl.value.trim(),
      token: tiktokTokenEl.value.trim()
    }
  }
});

const init = async () => {
  const settings = await loadSettings();
  fillForm(settings);

  saveBtn.addEventListener("click", async () => {
    const next = collectForm();
    await saveSettings(next);
    setStatus("Pengaturan tersimpan.", "ok");
  });
};

document.addEventListener("DOMContentLoaded", init);
