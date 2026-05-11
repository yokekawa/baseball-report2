module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body;
  console.log("受信テキスト:", text);

  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  console.log("APIキー存在:", !!apiKey);

  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    console.log("Gemini API呼び出し開始");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `あなたは少年野球の試合速報を記録するアシスタントです。
入力されたテキストを野球速報の簡潔な表記に整形してください。

【整形ルール】
- 得点は「★数字」で表す（例：「1点入った」→「★1」、「2点取った」→「★2」）
- 投手情報は簡潔に（例：「相手投手右投げで速い」→「相手投手 右投 速め」）
- 助詞・口語・敬語を除去して簡潔にする
- 選手名・固有名詞はそのまま残す
- 絵文字・記号は★以外使わない
- 句読点は不要
- 出力はテキストのみ、説明や補足は不要
- 元の意味を変えず最小限の変換にとどめる
- すでに簡潔な場合はそのまま返す`
            }]
          },
          contents: [{ parts: [{ text }] }],
          generationConfig: { maxOutputTokens: 200 },
        }),
      }
    );

    console.log("Gemini APIステータス:", response.status);
    const data = await response.json();
    console.log("Geminiレスポンス:", JSON.stringify(data));
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (result) {
      return res.status(200).json({ result });
    } else {
      return res.status(500).json({ error: "No result from Gemini", detail: JSON.stringify(data) });
    }
  } catch (e) {
    console.log("エラー:", e.message);
    return res.status(500).json({ error: "Gemini API error", detail: e.message });
  }
};
