const { DB_IDS, CORS, fetchAllPages, batchUpdate } = require("./_lib/notion");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  if (req.method !== "POST") {
    return res.status(405).set(CORS).json({ error: "Method not allowed" });
  }

  try {
    const { list } = req.body;

    if (!list || !DB_IDS[list]) {
      return res
        .status(400)
        .set(CORS)
        .json({ error: "Invalid list parameter" });
    }

    const pages = await fetchAllPages(DB_IDS[list]);

    const updates = pages.map((page) => ({
      id: page.id,
      properties: {
        "現有數量": { number: 0 },
        "已點算": { checkbox: false },
      },
    }));

    const results = await batchUpdate(updates);
    const failed = results.filter((r) => !r.success);

    res.writeHead(200, { ...CORS, "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        total: results.length,
        failed: failed.length,
        errors: failed,
      })
    );
  } catch (err) {
    console.error("Reset error:", err);
    res.writeHead(500, { ...CORS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: err.message }));
  }
};
