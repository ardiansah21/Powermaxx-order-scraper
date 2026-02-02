/* global chrome */
(() => {
  "use strict";

  const SOURCE = "powermaxx";
  const RESPONSE_SOURCE = "powermaxx_extension";
  const ALLOWED_ACTIONS = new Set([
    "update_order",
    "update_income",
    "update_both"
  ]);
  const ALLOWED_MODES = new Set(["single", "bulk"]);

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

  const normalizeOrderItem = (item, fallbackMarketplace, fallbackIdType) => {
    if (item === null || item === undefined) return null;
    if (typeof item === "string" || typeof item === "number") {
      const id = String(item).trim();
      if (!id) return null;
      return {
        id,
        marketplace: normalizeMarketplace(fallbackMarketplace),
        id_type: normalizeIdType(fallbackIdType)
      };
    }

    const rawId =
      item?.mp_order_id ??
      item?.order_id ??
      item?.order_sn ??
      item?.id ??
      item?.orderId ??
      item?.orderSn;
    const id = String(rawId || "").trim();
    if (!id) return null;
    const marketplace =
      normalizeMarketplace(item?.marketplace) || normalizeMarketplace(fallbackMarketplace);
    let idType = normalizeIdType(item?.id_type || item?.idType || fallbackIdType);
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
      id_type: idType
    };
  };

  const normalizeOrders = (payload) => {
    const fallbackMarketplace = payload?.marketplace;
    const fallbackIdType = payload?.id_type;
    if (Array.isArray(payload?.orders)) {
      return payload.orders
        .map((item) => normalizeOrderItem(item, fallbackMarketplace, fallbackIdType))
        .filter(Boolean);
    }
    const list = normalizeList(payload?.order_sn_list || payload?.order_sn);
    return list
      .map((item) => normalizeOrderItem(item, fallbackMarketplace, fallbackIdType))
      .filter(Boolean);
  };

  const normalizeMode = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    return ALLOWED_MODES.has(raw) ? raw : "";
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

    const { source, action } = event.data;
    if (source !== SOURCE) {
      return;
    }

    if (!ALLOWED_ACTIONS.has(action)) {
      postResponse({ ok: false, error: "Aksi tidak dikenali." });
      return;
    }

    const orders = normalizeOrders(event.data);
    if (!orders.length) {
      postResponse({ ok: false, error: "Order tidak ditemukan." });
      return;
    }

    const rawMode = String(event.data?.mode || "").trim().toLowerCase();
    const normalizedMode = normalizeMode(rawMode);
    if (rawMode && !normalizedMode) {
      postResponse({ ok: false, error: "Mode tidak dikenali." });
      return;
    }
    const mode = normalizedMode || "bulk";
    if (mode === "single" && orders.length !== 1) {
      postResponse({ ok: false, error: "Mode single hanya untuk 1 order." });
      return;
    }

    const messageType = mode === "single" ? "POWERMAXX_SINGLE" : "POWERMAXX_BULK";

    chrome.runtime.sendMessage(
      {
        type: messageType,
        action,
        mode,
        orders,
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
          error: response?.error || "",
          count: response?.count ?? orders.length,
          mode,
        });
      }
    );
  };

  window.addEventListener("message", handleMessage);
})();
