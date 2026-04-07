const { notion, CORS, itemToProperties } = require("./_lib/notion");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  if (req.method !== "PATCH") {
    return res.status(405).set(CORS).json({ error: "Method not allowed" });
  }

  try {
    const { pageId, updates } = req.body;

    if (!pageId || !updates) {
      return res
        .status(400)
        .set(CORS)
        .json({ error: "Missing pageId or updates" });
    }

    const properties = itemToProperties(updates);

    const result = await notion.pages.update({
      page_id: pageId,
      properties,
    });

    res.writeHead(200, { ...CORS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, id: result.id }));
  } catch (err) {
    console.error("Update error:", err);
    res.writeHead(500, { ...CORS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
};
