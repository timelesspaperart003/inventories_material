const { notion, DB_IDS, CORS, itemToProperties, pageToItem } = require("./_lib/notion");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  if (req.method !== "POST") {
    return res.status(405).set(CORS).json({ error: "Method not allowed" });
  }

  try {
    const { list, item } = req.body;

    if (!list || !DB_IDS[list] || !item) {
      return res
        .status(400)
        .set(CORS)
        .json({ error: "Missing list or item data" });
    }

    const properties = itemToProperties(item);

    const result = await notion.pages.create({
      parent: { database_id: DB_IDS[list] },
      properties,
    });

    const created = pageToItem(result);

    res.writeHead(201, { ...CORS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, item: created }));
  } catch (err) {
    console.error("Create error:", err);
    res.writeHead(500, { ...CORS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
};
