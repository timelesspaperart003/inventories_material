const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Database IDs from environment variables
const DB_IDS = {
  材料: process.env.NOTION_DB_MATERIAL,
  代工_植物_動物: process.env.NOTION_DB_CRAFT,
  耗材: process.env.NOTION_DB_CONSUMABLE,
  棧板材料_自黏袋: process.env.NOTION_DB_PALLET,
};

// CORS headers
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Map Notion page to our item format
function pageToItem(page) {
  const props = page.properties;
  return {
    id: page.id,
    code: props["NAME"]?.title?.[0]?.plain_text || "",
    name: props["名稱"]?.rich_text?.[0]?.plain_text || "",
    category: props["種類"]?.select?.name || "",
    shortage: props["缺貨處理方式"]?.select?.name || "",
    note: props["備註"]?.rich_text?.[0]?.plain_text || "",
    qty: props["現有數量"]?.number ?? 0,
    minStock: props["最底庫存"]?.number ?? 0,
    checked: props["已點算"]?.checkbox ?? false,
  };
}

// Build Notion properties object for create/update
function itemToProperties(item) {
  const props = {};

  if (item.code !== undefined) {
    props["NAME"] = { title: [{ text: { content: item.code } }] };
  }
  if (item.name !== undefined) {
    props["名稱"] = { rich_text: [{ text: { content: item.name } }] };
  }
  if (item.category !== undefined) {
    props["種類"] = { select: { name: item.category } };
  }
  if (item.shortage !== undefined) {
    if (item.shortage === "") {
      props["缺貨處理方式"] = { select: null };
    } else {
      props["缺貨處理方式"] = { select: { name: item.shortage } };
    }
  }
  if (item.note !== undefined) {
    props["備註"] = { rich_text: [{ text: { content: item.note || "" } }] };
  }
  if (item.qty !== undefined) {
    props["現有數量"] = { number: item.qty };
  }
  if (item.minStock !== undefined) {
    props["最底庫存"] = { number: item.minStock };
  }
  if (item.checked !== undefined) {
    props["已點算"] = { checkbox: item.checked };
  }

  return props;
}

// Category filter: which 種類 values belong to each list
const CATEGORY_FILTERS = {
  材料: ["材料"],
  代工_植物_動物: ["代工", "植物", "動物"],
  耗材: ["耗材"],
  棧板材料_自黏袋: ["棧板材料"],
};

// Fetch all pages from a database (handles pagination + category filter)
async function fetchAllPages(databaseId, listKey) {
  const pages = [];
  let cursor = undefined;

  // Build filter if listKey is provided and has category mappings
  const categories = listKey ? CATEGORY_FILTERS[listKey] : null;
  let filter = undefined;

  if (categories && categories.length === 1) {
    filter = {
      property: "種類",
      select: { equals: categories[0] },
    };
  } else if (categories && categories.length > 1) {
    filter = {
      or: categories.map((cat) => ({
        property: "種類",
        select: { equals: cat },
      })),
    };
  }

  do {
    const query = {
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    };
    if (filter) query.filter = filter;

    const response = await notion.databases.query(query);
    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return pages;
}

// Rate-limit aware batch update
async function batchUpdate(updates, delayMs = 350) {
  const results = [];
  for (const update of updates) {
    try {
      const result = await notion.pages.update({
        page_id: update.id,
        properties: update.properties,
      });
      results.push({ id: update.id, success: true });
    } catch (err) {
      results.push({ id: update.id, success: false, error: err.message });
    }
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
  return results;
}

module.exports = {
  notion,
  DB_IDS,
  CORS,
  pageToItem,
  itemToProperties,
  fetchAllPages,
  batchUpdate,
};
