/* global chrome */
(() => {
  "use strict";

  const SOURCE = "powermaxx";
  const RESPONSE_SOURCE = "powermaxx_extension";
  const ALLOWED_ACTIONS = new Set([
    "update_order",
    "update_income",
    "update_both",
  ]);

  const normalizeList = (value) => {
    if (Array.isArray(value)) {
      return value.map(String).map((item) => item.trim()).filter(Boolean);
    }

    if (typeof value === "string") {
      return value
        .split(/[\n,;\t ]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  };

  const postResponse = (payload) => {
    window.postMessage(
      {
        source: RESPONSE_SOURCE,
        ...payload,
      },
      "*"
    );
  };

  const handleMessage = (event) => {
    if (event.source !== window || !event.data) {
      return;
    }

    const { source, action, order_sn, order_sn_list } = event.data;
    if (source !== SOURCE) {
      return;
    }

    if (!ALLOWED_ACTIONS.has(action)) {
      postResponse({ ok: false, error: "Aksi tidak dikenali." });
      return;
    }

    const orderSnList = normalizeList(order_sn_list || order_sn);
    if (!orderSnList.length) {
      postResponse({ ok: false, error: "Order SN tidak ditemukan." });
      return;
    }

    chrome.runtime.sendMessage(
      {
        type: "POWERMAXX_BULK",
        action,
        orderSnList,
        sourceUrl: window.location.href,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          postResponse({
            ok: false,
            error: chrome.runtime.lastError.message,
          });
          return;
        }
        postResponse({
          ok: Boolean(response?.ok),
          count: orderSnList.length,
        });
      }
    );
  };

  window.addEventListener("message", handleMessage);
})();
