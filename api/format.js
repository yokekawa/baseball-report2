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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
- ★の直後に塁（一塁・二塁など）が続く場合は塁を漢数字で表記する（例：「★1 1塁」→「★1 一塁」）
- 投手情報は簡潔に（例：「相手投手右投げで速い」→「相手投手 右投 速め」）
- 助詞・口語・敬語を除去して簡潔にする
- 選手名・固有名詞はそのまま残す
- 絵文字・記号は★以外使わない
- 句読点は不要
- 出力はテキストのみ、説明や補足は不要
- 元の意味を変えず最小限の変換にとどめる
- すでに簡潔な場合はそのまま返す

【野球用語の解釈】
- 「間に（カンに）」は野球実況で「その隙に」「その間に」の意味。送球や守備のミスの隙にランナーが進塁・生還する場面で使う。例：「悪送球の間に生還」→そのまま保持
- 「生還」はホームインのこと
- 「ランダウン」「挟殺」は塁間でランナーが挟まれるプレー
- 「タッチアウト」はタッグアウトのこと
- 塁は原則数字表記（1塁・2塁・3塁）だが、★得点表記の直後に来る場合のみ漢数字（一塁・二塁・三塁）に変換する

【音声認識の誤変換修正】
音声入力では野球用語が誤認識されることがあります。文脈から野球用語として適切な表現に修正してください。

よくある誤変換の例：
- 「ランダムプレー」→「ランダウンプレー」
- 「ランダム」→「ランダウン」
- 「挟殺プレー」「ランダウン」「ランダウンプレー」はすべて同じ意味
- 「フィルダーズチョイス」「フィールダーズチョイス」→「フィルダースチョイス」
- 「スクイズバント」→「スクイズ」
- 「サクリファイス」→「犠牲バント」または「犠牲フライ」（文脈で判断）
- 「ゲッツー」「ゲッタツー」「ゲットツー」→「ゲッツー」
- 「ダブルプレー」→「ゲッツー」
- 「エラー」「エアー」→「エラー」
- 「デッドボール」→「死球」
- 「フォアボール」→「四球」
- 「バッテリーエラー」→「パスボール」または「ワイルドピッチ」（文脈で判断）
- 「ボーンヘッド」→「走塁ミス」
- 「オーバーラン」→「オーバーラン」
- 「タッチアップ」「タッチアウト」は文脈で区別（フライ後の進塁→「タッチアップ」、タッグでアウト→「タッチアウト」）
- 「けん制」「牽制」「ケンセイ」→「牽制」
- 「ピックオフ」→「牽制アウト」
- 「バスター」→「バスターエンドラン」または「バスター」
- 「エンドラン」「エンドラーン」→「エンドラン」
- 「ヒットエンドラン」→「ヒットエンドラン」

上記以外でも、野球の文脈として不自然な語句があれば、近い野球用語に修正してください。`
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
