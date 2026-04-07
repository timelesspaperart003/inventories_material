const { notion, CORS } = require("./_lib/notion");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  // GET: retrieve all snapshots
  if (req.method === "GET") {
    const dbId = process.env.NOTION_DB_SNAPSHOTS;
    if (!dbId) {
      res.writeHead(200, { ...CORS, "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, error: "NOTION_DB_SNAPSHOTS not configured" }));
    }

    try {
      const pages = [];
      let cursor = undefined;
      do {
        const response = await notion.databases.query({
          database_id: dbId,
          start_cursor: cursor,
          page_size: 100,
          sorts: [{ property: "建立時間", direction: "descending" }],
        });
        pages.push(...response.results);
        cursor = response.has_more ? response.next_cursor : undefined;
      } while (cursor);

      const snapshots = pages.map((page) => {
        const props = page.properties;
        let data = [];
        try {
          const raw = props["資料"]?.rich_text?.map(t => t.plain_text).join("") || "[]";
          data = JSON.parse(raw);
        } catch (e) { data = []; }

        return {
          id: page.id,
          list: props["清單"]?.select?.name || "",
          date: props["建立時間"]?.date?.start || page.created_time,
          operator: props["盤點人"]?.rich_text?.[0]?.plain_text || "",
          totalItems: props["品項數"]?.number || 0,
          checkedItems: props["已點數"]?.number || 0,
          lowStockCount: props["低庫存數"]?.number || 0,
          data,
        };
      });

      res.writeHead(200, { ...CORS, "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, snapshots }));
    } catch (err) {
      console.error("Snapshot fetch error:", err);
      res.writeHead(500, { ...CORS, "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // POST: create new snapshot
  if (req.method !== "POST") {
    return res.status(405).set(CORS).json({ error: "Method not allowed" });
  }

  const dbId = process.env.NOTION_DB_SNAPSHOTS;
  if (!dbId) {
    res.writeHead(200, { ...CORS, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: false, error: "NOTION_DB_SNAPSHOTS not configured" }));
  }

  try {
    const { list, items, operator } = req.body;

    if (!list || !items) {
      return res.status(400).set(CORS).json({ error: "Missing list or items" });
    }

    const now = new Date().toISOString();
    const checked = items.filter((i) => i.checked).length;
    const lowStock = items.filter((i) => i.minStock > 0 && i.qty < i.minStock).length;

    // Only save checked items with minimal fields
    const checkedItems = items.filter(i => i.checked);
    const dataStr = JSON.stringify(checkedItems.map(i => ({
      code: i.code,
      name: i.name,
      qty: i.qty,
      minStock: i.minStock,
    })));

    // Split into 2000-char chunks for rich_text
    const chunks = [];
    for (let i = 0; i < dataStr.length; i += 2000) {
      chunks.push({ text: { content: dataStr.slice(i, i + 2000) } });
    }
    // Ensure at least one chunk
    if (chunks.length === 0) {
      chunks.push({ text: { content: "[]" } });
    }

    const result = await notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        "NAME": { title: [{ text: { content: `${list} — ${now.slice(0, 10)}` } }] },
        "清單": { select: { name: list } },
        "建立時間": { date: { start: now } },
        "盤點人": { rich_text: [{ text: { content: operator || "未指定" } }] },
        "品項數": { number: items.length },
        "已點數": { number: checked },
        "低庫存數": { number: lowStock },
        "資料": { rich_text: chunks },
      },
    });

    res.writeHead(201, { ...CORS, "Content-Type": "application/json" });
    res.end(JSON.stringify({
      success: true,
      id: result.id,
      date: now,
      totalItems: items.length,
      checkedItems: checked,
      lowStockCount: lowStock,
    }));
  } catch (err) {
    console.error("Snapshot save error:", err);
    res.writeHead(500, { ...CORS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
};
