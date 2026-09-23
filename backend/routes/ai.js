// =============================================================
// PROJECTFORGE — AI ASSISTANT ROUTES (Gemini)
// Keeps the Gemini API key server-side. The frontend calls this
// endpoint instead of hitting Google's API directly.
// =============================================================

const express = require("express");
const rateLimit = require("express-rate-limit");
const { verifyToken } = require("../middleware/verifyToken");

const router = express.Router();

const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 15 }); // 15 req/min/IP

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

// POST /api/ai/plan-project  { description }
// Turns a rough project description into a suggested task breakdown.
router.post("/plan-project", verifyToken, aiLimiter, async (req, res, next) => {
  try {
    const { description } = req.body;
    if (!description || description.trim().length < 5) {
      return res.status(400).json({ error: "Please provide a project description." });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: "AI assistant isn't configured on this server yet." });
    }

    const prompt = `You are a project planning assistant inside a project management tool called ProjectForge.
Given the project description below, propose 6-10 concrete tasks to get started.
Respond ONLY with strict JSON in this shape, no markdown fences, no commentary:
{"tasks":[{"title":"...", "priority":"low|medium|high", "description":"..."}]}

Project description: """${description}"""`;

    const response = await fetch(GEMINI_URL(process.env.GEMINI_API_KEY), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", errText);
      return res.status(502).json({ error: "AI assistant is temporarily unavailable." });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const cleaned = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({ error: "AI response couldn't be parsed. Try rephrasing." });
    }

    res.json(parsed);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
