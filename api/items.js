const { DB_IDS, CORS, pageToItem, fetchAllPages } = require("./_lib/notion");

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { list } = req.query;

  if (!list || !DB_IDS[list]) {
    return res
      .status(400)
      .set(CORS)
      .json({
        error: "Invalid list parameter",
        valid: Object.keys(DB_IDS),
      });
  }

  try {
    const pages = await fetchAllPages(DB_IDS[list]);
    const items = pages.map(pageToItem);
    res.writeHead(200, { ...CORS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, items, count: items.length }));
  } catch (err) {
    console.error("Fetch error:", err);
    res.writeHead(500, { ...CORS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
};
