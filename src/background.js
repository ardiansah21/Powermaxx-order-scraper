/* global chrome */
(() => {
  "use strict";

  const BULK_URL = chrome.runtime.getURL("src/bulk/bulk.html");
  const SETTINGS_KEY = "arvaSettings";
  const BRIDGE_SCRIPT_ID = "powermaxx-bridge";
  const BRIDGE_SCRIPT = "src/bridge/powermaxx-bridge.js";

  const openBulkPage = () => {
    chrome.tabs.create({ url: BULK_URL });
  };

  const getStorageArea = () => chrome.storage?.sync || chrome.storage?.local;

  const normalizeBaseUrl = (value) => (value || "").trim().replace(/\/+$/, "");

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

    if (message.type !== "POWERMAXX_BULK") {
      return;
    }

    const payload = {
      action: message.action || "update_both",
      orderSnList: Array.isArray(message.orderSnList)
        ? message.orderSnList
        : [],
      sourceUrl: message.sourceUrl || sender?.url || "",
      createdAt: Date.now()
    };

    chrome.storage.local.set({ bulkBridgePayload: payload }, () => {
      openBulkPage();
      sendResponse({ ok: true });
    });

    return true;
  });
})();
