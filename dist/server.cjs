var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "25mb" }));
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.post("/api/auth/login", (req, res) => {
  const { emailOrUsername } = req.body;
  const query = String(emailOrUsername || "").trim().toLowerCase();
  if (query === "garrydavies1963@gmail.com") {
    return res.json({
      success: true,
      user: {
        id: "master-admin-001",
        username: "Garry Davies (Master Admin)",
        email: "garrydavies1963@gmail.com",
        role: "admin",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
        coins: 2500,
        xp: 12500,
        level: 25,
        title: "Quiz Master Administrator",
        currentStreak: 14,
        longestStreak: 30,
        lastLoginDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        createdAt: "2025-01-01"
      }
    });
  }
  if (query === "admin") {
    return res.status(401).json({
      success: false,
      message: "Master Administrator login requires Google Account authentication for garrydavies1963@gmail.com."
    });
  }
  res.json({
    success: true,
    user: {
      id: `player-${Date.now()}`,
      username: query || "PlayerOne",
      email: `${query || "player"}@100picsquiz.com`,
      role: "player",
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(query || "player")}`,
      coins: 150,
      xp: 420,
      level: 4,
      title: "Puzzle Detective",
      currentStreak: 3,
      longestStreak: 5,
      lastLoginDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
});
app.post("/api/auth/validate-admin", (req, res) => {
  const { email } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (normalizedEmail === "garrydavies1963@gmail.com") {
    return res.json({
      authorized: true,
      email: "garrydavies1963@gmail.com",
      role: "admin"
    });
  }
  return res.status(403).json({
    authorized: false,
    message: "Access Denied: Only garrydavies1963@gmail.com is authorized as Master Administrator."
  });
});
app.post("/api/auth/register", (req, res) => {
  const { username, email } = req.body;
  res.json({
    success: true,
    user: {
      id: `player-${Date.now()}`,
      username: username || "NewPlayer",
      email: email || "player@100picsquiz.com",
      role: "player",
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username || "player")}`,
      coins: 100,
      xp: 0,
      level: 1,
      title: "Rookie Detective",
      currentStreak: 1,
      longestStreak: 1,
      lastLoginDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
});
app.post("/api/admin/ai-generate", async (req, res) => {
  try {
    const { topic, questionCount } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: "GEMINI_API_KEY environment variable is not configured."
      });
    }
    const ai = new import_genai.GoogleGenAI({ apiKey });
    const prompt = `You are a quiz pack generator for a 100 PICS styled picture guessing game.
Create a quiz pack on the topic: "${topic || "General Knowledge"}".
Return a strict JSON object with:
- "title": short snappy pack title
- "description": 1 sentence description
- "category": category name (e.g., "Logos & Brands", "Movies & TV", "Wild Animals", "Landmarks", "Retro Video Games", "General Knowledge")
- "difficulty": "Easy" | "Medium" | "Hard" | "Expert"
- "questions": array of exactly ${questionCount || 6} questions. Each question must have:
  - "correctAnswer": uppercase single word or short 2-word answer (e.g. "EIFFEL TOWER", "PIKACHU", "JAPAN")
  - "alternativeAcceptedAnswers": array of alternative spellings/names
  - "hint": 1 sentence clue
  - "triviaFact": 1 interesting trivia sentence revealed after correct answer
  - "suggestedImageQuery": Unsplash photo query term to find a photo (e.g. "eiffel tower paris", "pikachu plush", "japan flag")

Respond ONLY with valid JSON, no markdown codeblocks or surrounding commentary.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    const responseText = response.text || "{}";
    const parsedData = JSON.parse(responseText);
    res.json({
      success: true,
      data: parsedData
    });
  } catch (err) {
    console.error("AI Generation Error:", err);
    res.status(500).json({
      success: false,
      error: err?.message || "Failed to generate AI quiz pack."
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`100 PICS Quiz Master Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
