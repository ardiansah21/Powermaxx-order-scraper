/* global chrome */
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

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitForDocumentReady = async (timeoutMs = 6000) => {
    if (document.readyState === "complete") return true;
    await Promise.race([
      new Promise((resolve) => {
        window.addEventListener("load", resolve, { once: true });
      }),
      sleep(timeoutMs)
    ]);
    return document.readyState === "complete";
  };

  const hasPerfEntry = (keyword) => {
    const entries = performance.getEntriesByType("resource") || [];
    return entries.some((entry) => String(entry?.name || "").includes(keyword));
  };

  const waitForPerfEntries = async (keywords, timeoutMs = 6000, intervalMs = 400) => {
    const start = Date.now();
    while (Date.now() - start <= timeoutMs) {
      const ok = keywords.every((keyword) => hasPerfEntry(keyword));
      if (ok) return true;
      await sleep(intervalMs);
    }
    return false;
  };

  const waitForTikTokReady = async (keywords) => {
    await Promise.race([waitForPerfEntries(keywords), waitForDocumentReady()]);
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
      await waitForTikTokReady([
        "/api/fulfillment/order/get",
        "/api/v1/pay/statement/order/list"
      ]);
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
      await waitForTikTokReady(["/api/fulfillment/order/get"]);
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

  const pageFetcherShopeeIncomeOnly = async (
    incomeBase,
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

      const componentsList = parseComponents("");
      const payload = {
        order_id: Number.isFinite(Number(orderId)) ? Number(orderId) : orderId,
        components: componentsList
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

  const pageFetcherShopeeOrderOnly = async (orderBase) => {
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

      const orderUrl = new URL(orderBase);
      ensureParams(orderUrl);
      orderUrl.searchParams.set("order_id", orderId);

      const orderResp = await fetch(orderUrl.toString(), {
        method: "GET",
        headers: { accept: "application/json, text/plain, */*" },
        credentials: "include"
      });
      const orderBody = await orderResp.text();
      const orderJson = safeJson(orderBody);

      return {
        order: {
          ok: orderResp.ok,
          status: orderResp.status,
          statusText: orderResp.statusText,
          appCode: orderJson?.code,
          appMessage: orderJson?.message,
          body: orderBody,
          finalUrl: orderUrl.toString()
        },
        orderId
      };
    } catch (e) {
      return { error: e.message };
    }
  };

  const pageFetcherTikTokIncomeOnly = async (statementBase, statementDetailBase) => {
    try {
      await waitForTikTokReady(["/api/v1/pay/statement/order/list"]);
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

  const pageFetcherTikTokOrderOnly = async (orderBase) => {
    try {
      await waitForTikTokReady(["/api/fulfillment/order/get"]);
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
      const orderUrl = new URL(perfOrderUrl || orderBase);

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

      return {
        order: {
          ok: orderResp.ok,
          status: orderResp.status,
          statusText: orderResp.statusText,
          appCode: orderJson?.code,
          appMessage: orderJson?.message,
          body: orderBody,
          finalUrl: orderUrl.toString()
        },
        orderId
      };
    } catch (e) {
      return { error: e.message };
    }
  };

  const actionMode = actionOptions?.mode || "all";
  const includeAwb = actionOptions?.includeAwb !== false;
  const incomeOnly = actionMode === "update_income";
  const orderOnly = actionMode === "update_order";

  if (marketplace === "shopee" && orderOnly) {
    const result = await pageFetcherShopeeOrderOnly(endpoints.orderEndpoint);
    if (result.error) return { error: result.error };
    const orderJson = safeJson(result.order?.body || "");
    const orderOk = result.order?.ok && (orderJson?.code ?? 0) === 0;
    return {
      ok: orderOk,
      orderRawJson: orderJson,
      incomeRawJson: null,
      incomeDetailRawJson: null,
      awb: { ok: true, skipped: true },
      fetchMeta: {
        order: result.order
      }
    };
  }

  if (marketplace === "tiktok_shop" && orderOnly) {
    const result = await pageFetcherTikTokOrderOnly(endpoints.orderEndpoint);
    if (result.error) return { error: result.error };
    const orderJson = safeJson(result.order?.body || "");
    const orderOk = result.order?.ok && (orderJson?.code ?? 0) === 0;
    return {
      ok: orderOk,
      orderRawJson: orderJson,
      incomeRawJson: null,
      incomeDetailRawJson: null,
      awb: { ok: true, skipped: true },
      fetchMeta: {
        order: result.order
      }
    };
  }

  if (marketplace === "shopee" && incomeOnly) {
    const result = await pageFetcherShopeeIncomeOnly(
      endpoints.incomeEndpoint,
      components
    );
    if (result.error) return { error: result.error };
    const incomeJson = safeJson(result.income?.body || "");
    const incomeOk = result.income?.ok;
    return {
      ok: incomeOk,
      orderRawJson: null,
      incomeRawJson: incomeJson,
      incomeDetailRawJson: null,
      awb: { ok: true, skipped: true },
      fetchMeta: {
        income: result.income
      }
    };
  }

  if (marketplace === "tiktok_shop" && incomeOnly) {
    const result = await pageFetcherTikTokIncomeOnly(
      endpoints.statementEndpoint,
      endpoints.statementDetailEndpoint
    );
    if (result.error) return { error: result.error };
    const incomeJson = safeJson(result.income?.body || "");
    const incomeDetailJson = safeJson(result.incomeDetail?.body || "");
    const incomeOk = result.income?.ok && (incomeJson?.code ?? 0) === 0;
    const detailOk =
      result.incomeDetail?.ok && (incomeDetailJson?.code ?? 0) === 0;
    const detailMissing =
      !result.incomeDetail?.ok &&
      (result.incomeDetail?.statusText || "").includes("statement_detail_id");
    return {
      ok: incomeOk && (detailOk || detailMissing),
      orderRawJson: null,
      incomeRawJson: incomeJson,
      incomeDetailRawJson: detailOk ? incomeDetailJson : null,
      awb: { ok: true, skipped: true },
      fetchMeta: {
        income: result.income,
        incomeDetail: result.incomeDetail
      }
    };
  }

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
