import React, { useState, useEffect } from "react";

// ===== 共通データ =====
const DEFAULT_PLAYERS = [
  "青田","泉","磯村","小野","金子","川除","菊地","紺木","佐藤",
  "髙田","高橋","武田（一）","武田（心）","田中（樹）","田中（翔）","徳留","野路",
  "橋本","廣澤","舟久保","本多","益田","増田","増野","渡部"
];
const POS_LIST = ["投","捕","一","二","三","遊","左","中","右"];

// ===== 型 =====
type PlayRecord = {
  line: string;
  deltaOuts: number;
  advancedOrder: boolean;
};

type InningRow = {
  away: string | number;
  home: string | number;
  awayPitchers: { name: string; pitchThis: string; pitchTotal: string }[];
  homePitchers: { name: string; pitchThis: string; pitchTotal: string }[];
};

const makeInning = (): InningRow => ({
  away: "",
  home: "",
  awayPitchers: [{ name: "", pitchThis: "", pitchTotal: "" }],
  homePitchers: [{ name: "", pitchThis: "", pitchTotal: "" }],
});

const renderPitchers = (list: {name:string; pitchThis:string; pitchTotal:string}[], isOpponent: boolean) =>
  list
    .map((p) => {
      if (p.name || p.pitchThis || p.pitchTotal) {
        const t = p.pitchThis || "";
        const T = p.pitchTotal || "";
        const slash = t && T ? "/" : "";
        const label = isOpponent ? `相手投手 ${p.name}` : p.name;
        return `${label}　投球数　${t}${slash}${T}球\n`;
      }
      return "";
    })
    .join("");

// ===== コンポーネント =====
function PitcherInputs({ label, pitchers, setPitchers, playerList, buttonClass }: any) {
  return (
    <div className="mt-1 ml-4">
      <span>{label}</span>
      {pitchers.map((p: any, j: number) => (
        <div key={j} className="flex gap-2 mb-1 items-center">
          <select
            value={p.name}
            onChange={(e) => {
              const copy = [...pitchers];
              copy[j].name = e.target.value;
              setPitchers(copy);
            }}
            className="p-1 border rounded"
          >
            <option value="">投手</option>
            {playerList.map((n: string) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="回の球数"
            value={p.pitchThis}
            onChange={(e) => {
              const copy = [...pitchers];
              copy[j].pitchThis = e.target.value;
              setPitchers(copy);
            }}
            className="w-20 p-1 border rounded"
          />
          <input
            type="number"
            placeholder="累計球数"
            value={p.pitchTotal}
            onChange={(e) => {
              const copy = [...pitchers];
              copy[j].pitchTotal = e.target.value;
              setPitchers(copy);
            }}
            className="w-20 p-1 border rounded"
          />
        </div>
      ))}
      <button
        onClick={() => setPitchers([...pitchers, { name: "", pitchThis: "", pitchTotal: "" }])}
        className={`mt-1 px-2 py-1 rounded ${buttonClass}`}
      >
        ＋投手追加
      </button>
    </div>
  );
}

// 修正ポイントまとめ
// ① 重複表示防止: レポート生成内の subs.forEach(...) による records 追加を削除
// ② 途中交代対応: SubForm に currentInning/currentHalf を渡し、handleAdd で利用
// ③ 打順反映: lineup を交代時に更新
// ④ 代打対応: type="代打" を追加

// battingOrderState 未定義エラー修正済み SubForm
function SubForm({ playerList, posList, lineup, subs, setSubs, onAdd, currentInning, currentHalf, setLineup, battingOrderState, setBattingOrderState }: any) {
  const [type, setType] = useState("交代");
  const [out, setOut] = useState("");
  const [inn, setInn] = useState("");
  const [pos, setPos] = useState("");
  const [oldPos, setOldPos] = useState("");
  const [newPos, setNewPos] = useState("");
  const [inning, setInning] = useState(currentInning || 1);
  const [half, setHalf] = useState(currentHalf || "表");

  const currentOnField = battingOrderState.map((l: any) => l.name).filter(Boolean);
  const canIn = type === "交代" || type === "代打"
    ? playerList.filter((p: string) => !currentOnField.includes(p) || p === inn)
    : currentOnField;

  function handleSubUndo() {
    if (!subs.length) return;
    const copy = [...subs];
    copy.pop();
    setSubs(copy);
  }

  function handleAdd() {
    if (type === "交代" || type === "代打") {
      if (!out || !inn || !pos) return;
      const sub = { type, out, in: inn, pos, inning, half };
      setSubs((prev: any) => [...prev, sub]);
      const updated = battingOrderState.map((l: any) => l.name === out ? { ...l, name: inn, pos } : l);
      setBattingOrderState(updated);
      onAdd(sub);
    } else if (type === "守備変更") {
      if (!out || !oldPos || !newPos) return;
      const sub = { type, out, oldPos, newPos, inning, half };
      setSubs((prev: any) => [...prev, sub]);
      const updated = battingOrderState.map((l: any) => l.name === out ? { ...l, pos: newPos } : l);
      setBattingOrderState(updated);
      onAdd(sub);
    }

    setOut(""); setInn(""); setPos(""); setOldPos(""); setNewPos("");
  }

  return (
    <div className="mt-4 p-2 border rounded">
      <h3 className="font-semibold mb-2">交代・守備変更・代打</h3>
      <div className="flex flex-wrap gap-2 mb-2">
        <select value={type} onChange={(e) => setType(e.target.value)} className="p-1 border rounded">
          <option>交代</option>
          <option>守備変更</option>
          <option>代打</option>
        </select>
        {(type === "交代" || type === "代打") ? (
          <>
            <select value={out} onChange={(e) => setOut(e.target.value)} className="p-1 border rounded">
              <option value="">退く選手</option>
              {currentOnField.map((n: string) => <option key={n}>{n}</option>)}
            </select>
            <select value={inn} onChange={(e) => setInn(e.target.value)} className="p-1 border rounded">
              <option value="">入る選手</option>
              {canIn.map((n: string) => <option key={n}>{n}</option>)}
            </select>
            <select value={pos} onChange={(e) => setPos(e.target.value)} className="p-1 border rounded">
              <option value="">守備</option>
              {posList.map((p: string) => <option key={p}>{p}</option>)}
            </select>
          </>
        ) : (
          <>
            <select value={out} onChange={(e) => setOut(e.target.value)} className="p-1 border rounded">
              <option value="">選手</option>
              {currentOnField.map((n: string) => <option key={n}>{n}</option>)}
            </select>
            <select value={oldPos} onChange={(e) => setOldPos(e.target.value)} className="p-1 border rounded">
              <option value="">変更前守備</option>
              {posList.map((p: string) => <option key={p}>{p}</option>)}
            </select>
            <select value={newPos} onChange={(e) => setNewPos(e.target.value)} className="p-1 border rounded">
              <option value="">変更後守備</option>
              {posList.map((p: string) => <option key={p}>{p}</option>)}
            </select>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input type="number" min={1} value={inning} onChange={(e) => setInning(parseInt(e.target.value || "1", 10))} className="w-16 p-1 border rounded" />
        <select value={half} onChange={(e) => setHalf(e.target.value)} className="p-1 border rounded">
          <option>表</option>
          <option>裏</option>
        </select>
        <button onClick={handleAdd} className="px-3 py-1 bg-blue-600 text-white rounded">追加</button>
        <button onClick={handleSubUndo} className="px-3 py-1 bg-red-500 text-white rounded">取り消し</button>
      </div>
    </div>
  );
}

// 打席入力フォーム
function AtBatForm({
  lineup,
  allyOrder,
  setAllyOrder,
  enemyOrder,
  setEnemyOrder,
  homeBatting,
  onAppend,
  currentInning,
  setCurrentInning,
  currentHalf,
  setCurrentHalf,
  currentOuts,
  setCurrentOuts,
  onUndo,
}: any) {
  const [result, setResult] = useState("");
  const [freeText, setFreeText] = useState("");
  const [bases, setBases] = useState("なし");
  const [selectedOuts, setSelectedOuts] = useState(currentOuts);
  const [extraPlay, setExtraPlay] = useState("");
  const [selectedAllyOrder, setSelectedAllyOrder] = useState<number>(allyOrder);
  const [selectedEnemyOrder, setSelectedEnemyOrder] = useState<number>(enemyOrder);
// 追加（ここから）
const [direction, setDirection] = useState("");
const [outcome, setOutcome] = useState("");
// 追加（ここまで）
  const battingNowIsAlly = (homeBatting && currentHalf === "裏") || (!homeBatting && currentHalf === "表");

  const options: Record<string, string[]> = {
    三振: ["空振り三振", "見逃し三振"],
    内野ゴロ: ["ピッチャーゴロ", "ファーストゴロ", "セカンドゴロ", "サードゴロ", "ショートゴロ"],
    内野フライ:["ピッチャーフライ","キャッチャーフライ","ファーストフライ","セカンドフライ","サードフライ",
"ショートフライ"],
    ファールフライ:["ファーストファールフライ","セカンドファールフライ","サードファールフライ","キャッチャーファールフライ","レフトファールフライ","ライトファールフライ"],
    外野ゴロ: ["ライトゴロ", "センターゴロ", "レフトゴロ"],
    外野フライ: ["レフトフライ", "センターフライ", "ライトフライ"],
    犠牲フライ:["ライト犠牲フライ","センター犠牲フライ","レフト犠牲フライ"],
    ヒット: ["レフト前ヒット", "センター前ヒット", "ライト前ヒット"],
    内野安打:["ショート内野安打","サード内野安打","セカンド内野安打","ファースト内野安打","ピッチャー内野安打","キャッチャー内野安打"],
    長打: ["レフトオーバー2ベースヒット", "センターオーバー2ベースヒット", "ライトオーバー2ベースヒット", "スリーベースヒット", "ランニング3ラン"],
    四死球: ["四球", "死球", "敬遠"],
    エラー: ["ショートエラー","サードエラー","セカンドエラー","ファーストエラー","ピッチャーエラー","キャッチャーエラー","レフトエラー","センターエラー","ライトエラー"],
    バント小技: ["送りバント", "セーフティバント", "スクイズ",],
    その他: ["フィルダースチョイス", "打撃妨害", "キャッチャーインターフェア"],
  };

  const baseTiles = ["なし", "1塁", "2塁", "3塁", "1、2塁", "1、3塁", "2、3塁", "満塁"];
  const extraOptions = ["", "盗塁成功", "盗塁失敗", "ワイルドピッチ", "パスボール", "送球ミス", "ボーク"];

  useEffect(() => { setSelectedOuts(currentOuts); }, [currentInning, currentHalf, currentOuts]);
  useEffect(() => { setSelectedAllyOrder(allyOrder); }, [allyOrder, currentHalf, currentInning]);
  useEffect(() => { setSelectedEnemyOrder(enemyOrder); }, [enemyOrder, currentHalf, currentInning]);

  function handleAppend() {
    const useOrder = battingNowIsAlly ? selectedAllyOrder : selectedEnemyOrder;
    const name = battingNowIsAlly ? (lineup[(useOrder - 1) % 9]?.name || "打者") : "";

const text = extraPlay ? extraPlay : ((direction || "") + (outcome || "")) + (freeText ? ` ${freeText}` : "");
    const outsToUse = Number(selectedOuts) || 0;

    let line = "";
    if (extraPlay) {
      // 走塁プレー: 味方なら全角4スペース、相手なら全角2スペース
      const indent = battingNowIsAlly ? "　　　　" : "　　";
      line = `${indent}${text}　${outsToUse}out`;
    } else {
      const prefix = battingNowIsAlly ? `${useOrder}.${name}` : `${useOrder}.`;
      line = `${prefix}${prefix ? "　" : ""}${text}　${outsToUse}out`;
    }

    if (outsToUse === 3) {
      line += "チェンジ";
    } else {
      line += bases === "なし" ? "" : ` ${bases}`;
    }

    const idx = Math.max(1, Math.min(currentInning, 20)) - 1;
    const deltaOuts = Math.max(0, outsToUse - currentOuts);
    const advancedOrder = !extraPlay; // 走塁プレーは false（打順進めない）
    onAppend(idx, currentHalf, { line, deltaOuts, advancedOrder });

    // 打順を進める（走塁のみは進めない）
    if (!extraPlay) {
      const next = (useOrder % 9) + 1;
      if (battingNowIsAlly) {
        setAllyOrder(next);
        setSelectedAllyOrder(next);
      } else {
        setEnemyOrder(next);
        setSelectedEnemyOrder(next);
      }
    }

    // アウト確定処理
    if (outsToUse === 3) {
      if (currentHalf === "表") {
        setCurrentHalf("裏");
      } else {
        setCurrentHalf("表");
        setCurrentInning(currentInning + 1);
      }
      setCurrentOuts(0);
      setSelectedOuts(0);
    } else {
      setCurrentOuts(outsToUse);
    }

    // クリア
setResult("");
setFreeText("");
setBases("なし");
setExtraPlay("");
setDirection("");   // 追加
setOutcome("");     // 追加

  }

  return (
    <div className="rounded-lg border p-3 bg-slate-50">
      <div className="mb-2 font-bold">
        現在：{currentInning}回{currentHalf} |
        {battingNowIsAlly
          ? ` 味方 ${selectedAllyOrder}番 ${lineup[(selectedAllyOrder - 1) % 9]?.name || "打者"}`
          : ` 相手 ${selectedEnemyOrder}番打者`}
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm">
        <label className="text-gray-600">打順を選択</label>
        {battingNowIsAlly ? (
          <select
            value={selectedAllyOrder}
            onChange={(e) => setSelectedAllyOrder(parseInt(e.target.value, 10))}
            className="p-1 border rounded"
          >
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        ) : (
          <select
            value={selectedEnemyOrder}
            onChange={(e) => setSelectedEnemyOrder(parseInt(e.target.value, 10))}
            className="p-1 border rounded"
          >
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        )}
        {battingNowIsAlly && (
          <span className="text-gray-500">（{lineup[(selectedAllyOrder - 1) % 9]?.name || "打者"}）</span>
        )}
      </div>

<label className="block text-sm mb-1">打球方向</label>
<select
  value={direction}
  onChange={(e) => setDirection(e.target.value)}
  className="w-full p-2 border rounded mb-2"
  disabled={!!extraPlay}
>
  <option value="">（選択してください）</option>
  <optgroup label="内野方向">
    <option value="ピッチャー">ピッチャー</option>
    <option value="キャッチャー">キャッチャー</option>
    <option value="ファースト">ファースト</option>
    <option value="セカンド">セカンド</option>
    <option value="サード">サード</option>
    <option value="ショート">ショート</option>
  </optgroup>
  <optgroup label="外野方向">
    <option value="レフト">レフト</option>
    <option value="センター">センター</option>
    <option value="ライト">ライト</option>
    <option value="左中間">左中間</option>
    <option value="右中間">右中間</option>
  </optgroup>
  <optgroup label="ライン・ファールゾーン">
    <option value="レフト線">レフト線</option>
    <option value="ライト線">ライト線</option>
    <option value="ファーストファール">ファーストファール</option>
    <option value="サードファール">サードファール</option>
  </optgroup>
</select>

<label className="block text-sm mb-1">打撃結果</label>
<select
  value={outcome}
  onChange={(e) => setOutcome(e.target.value)}
  className="w-full p-2 border rounded mb-3"
  disabled={!!extraPlay}
>
  <option value="">（選択してください）</option>
  <optgroup label="安打・長打">
    <option value="ヒット">ヒット</option>
    <option value="2ベースヒット">2ベースヒット</option>
    <option value="3ベースヒット">3ベースヒット</option>
    <option value="ランニングホームラン">ランニングホームラン</option>
    <option value="ホームラン">ホームラン</option>
  </optgroup>
  <optgroup label="凡打">
    <option value="フライ">フライ</option>
    <option value="ゴロ">ゴロ</option>
    <option value="ライナー">ライナー</option>
  </optgroup>
  <optgroup label="進塁打・小技">
    <option value="犠牲フライ">犠牲フライ</option>
    <option value="犠牲バント">犠牲バント</option>
    <option value="セーフティバント">セーフティバント</option>
    <option value="送りバント">送りバント</option>
  </optgroup>
  <optgroup label="四死球・三振">
    <option value="空振り三振">空振り三振</option>
    <option value="見逃し三振">見逃し三振</option>
    <option value="四球">四球</option>
    <option value="死球">死球</option>
    <option value="敬遠">敬遠</option>
  </optgroup>
  <optgroup label="その他">
    <option value="エラー">エラー</option>
    <option value="打撃妨害">打撃妨害</option>
    <option value="ボーク">ボーク</option>
    <option value="フィルダースチョイス">フィルダースチョイス</option>
  </optgroup>
</select>


      <input
        value={freeText}
        onChange={(e) => setFreeText(e.target.value)}
        placeholder="自由追記（例：★1、送球間に2塁へ 等）"
        className="w-full p-2 border rounded mb-3"
        disabled={!!extraPlay}
      />

      <label className="block text-sm mb-1">走塁プレー</label>
      <select
        value={extraPlay}
        onChange={(e) => setExtraPlay(e.target.value)}
        className="w-full p-2 border rounded mb-3"
      >
        {extraOptions.map((opt) => (
          <option key={opt} value={opt}>{opt || "（なし）"}</option>
        ))}
      </select>

      <div className="mb-2 text-sm">
        アウト数（打席後）:
        {[0, 1, 2, 3].map((o) => (
          <button
            key={o}
            onClick={() => setSelectedOuts(o)}
            className={`px-3 py-1 border rounded ml-2 ${selectedOuts === o ? "bg-black text-white" : ""}`}
          >
            {o}out
          </button>
        ))}
        <span className="ml-3 text-gray-500">現在のアウト: {currentOuts}</span>
      </div>

      <div className="mb-3 text-sm">
        走者状況:
        {baseTiles.map((b) => (
          <button
            key={b}
            onClick={() => setBases(b)}
            className={`px-2 py-1 border rounded m-1 ${bases === b ? "bg-black text-white" : ""}`}
          >
            {b}
          </button>
        ))}
      </div>

      <button onClick={handleAppend} className="w-full px-3 py-2 bg-blue-600 text-white rounded">
        ＋ このプレイを {currentInning}回{currentHalf} に追加
      </button>
      <button onClick={onUndo} className="w-full px-3 py-2 bg-red-600 text-white rounded mt-2">
        1プレイ戻す
      </button>
    </div>
  );
}

// ===== メインアプリ =====
export default function BaseballReportApp() {
  const playerList = DEFAULT_PLAYERS;

  const [gameInfo, setGameInfo] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    if (saved) return JSON.parse(saved).gameInfo || {};
    return { title: '25練習試合', away: '相手', home: '八王子', date: '2025/5/4(日)', place: '八王子リトルシニアグラウンド', weather: '晴', startHour: '10', startMin: '00', endHour: '12', endMin: '00', homeBatting: true };
  });

  const [innings, setInnings] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).innings || Array.from({ length: 7 }, makeInning) : Array.from({ length: 7 }, makeInning);
  });

const [lineup, setLineup] = useState(Array.from({ length: 9 }, (_, i) => ({ order: i + 1, name: '', pos: '' })));
const [battingOrderState, setBattingOrderState] = useState([...lineup]); // 打席用状態

  const [subs, setSubs] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).subs || [] : [];
  });

  const [records, setRecords] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).records || Array.from({ length: 7 }, () => ({ top: [], bottom: [] })) : Array.from({ length: 7 }, () => ({ top: [], bottom: [] }));
  });

  const [reportText, setReportText] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).reportText || '' : '';
  });

  const [allyOrder, setAllyOrder] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).allyOrder || 1 : 1;
  });

  const [enemyOrder, setEnemyOrder] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).enemyOrder || 1 : 1;
  });

  const [currentInning, setCurrentInning] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).currentInning || 1 : 1;
  });

  const [currentHalf, setCurrentHalf] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).currentHalf || '表' : '表';
  });

  const [currentOuts, setCurrentOuts] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).currentOuts || 0 : 0;
  });
;

// レポート生成（自動；手書き編集は textarea に直接）
useEffect(() => {
  const totalAway = innings.reduce((a: number, b: any) => a + Number(b.away || 0), 0);
  const totalHome = innings.reduce((a: number, b: any) => a + Number(b.home || 0), 0);

  let out = `${gameInfo.title}　${gameInfo.home}vs${gameInfo.away}\n`;
  out += `◆日付　${gameInfo.date}\n`;
  out += `◆場所　${gameInfo.place}\n`;
  out += `◆天候　${gameInfo.weather}\n`;
  out += `◆試合開始時刻 ${gameInfo.startHour}時${gameInfo.startMin}分開始\n`;
  out += `◆試合終了時刻 ${gameInfo.endHour}時${gameInfo.endMin}分終了\n`;
  out += ` ※${gameInfo.home}　${gameInfo.homeBatting ? "後攻" : "先攻"}\n\n`;

  out += ` 　  　　　/  1  2  3  4  5  6  7  /  計\n`;
  if (gameInfo.homeBatting) {
    out += ` 【${gameInfo.away}】 / ${innings.map((i: any) => i.away || "").join(" ")} / ${totalAway}\n`;
    out += ` 【${gameInfo.home}】 / ${innings.map((i: any) => i.home || "").join(" ")} / ${totalHome}\n\n`;
  } else {
    out += ` 【${gameInfo.home}】 / ${innings.map((i: any) => i.home || "").join(" ")} / ${totalHome}\n`;
    out += ` 【${gameInfo.away}】 / ${innings.map((i: any) => i.away || "").join(" ")} / ${totalAway}\n\n`;
  }

  out += `【先発メンバー】\n`;
  lineup.forEach((p: any) => {
    if (!p.name) return;
    let line = `${p.order}.${p.name}${p.pos ? `(${p.pos})` : ""}`;

    // 同じ選手または後に交代で関係する選手を抽出
    const relatedSubs = subs.filter((s: any) => s.out === p.name || s.prev === p.name || s.original === p.name || s.in === p.name);

    // 出場順に右方向へ連結
    relatedSubs.forEach((s: any) => {
      if (s.type === "守備変更") {
        line += `→${s.out}(${s.oldPos})→${s.out}(${s.newPos})${s.inning}回${s.half}`;
      } else {
        line += `→${s.in}(${s.pos || ''})`;
      }
    });

    out += line + "\n";
  });
  out += `\n`;

  records.forEach((innRec: any, i: number) => {
    const n = i + 1;
    if (innRec.top.length) {
      out += `◆${n}回表\n`;
      innRec.top.forEach((r: any) => (out += r.line + "\n"));
      const runsTop = gameInfo.homeBatting ? innings[i].away : innings[i].home;
      if (runsTop !== "") {
        const labelTop = gameInfo.homeBatting ? "失点" : "得点";
        out += `★この回${runsTop}${labelTop}\n`;
      }
      out += renderPitchers(innings[i].awayPitchers || [], false);
      out += `\n`;
    }
    if (innRec.bottom.length) {
      out += `◆${n}回裏\n`;
      innRec.bottom.forEach((r: any) => (out += r.line + "\n"));
      const runsBottom = gameInfo.homeBatting ? innings[i].home : innings[i].away;
      if (runsBottom !== "") {
        const labelBottom = gameInfo.homeBatting ? "得点" : "失点";
        out += `★この回${runsBottom}${labelBottom}\n`;
      }
      out += renderPitchers(innings[i].homePitchers || [], true);
      out += `\n`;
    }
  });

  setReportText(out);
}, [gameInfo, innings, lineup, subs, records]);

  // 最後の入力を取り消す（差分で戻す）
function handleUndo() {
  const idx = Math.max(1, Math.min(currentInning, 20)) - 1;
  const copy = [...records];
  const bucket = currentHalf === "表" ? copy[idx].top : copy[idx].bottom;

  // 現在のイニングが空でも、前のイニングの裏から戻せるように調整
  if (!bucket.length) {
    if (currentHalf === "裏" && idx >= 0) {
      const prevTop = copy[idx].top;
      if (prevTop.length) {
        const last = prevTop.pop() as PlayRecord;
        setRecords(copy);
        setCurrentHalf("表");
        setCurrentInning(idx + 1);
        if (last.deltaOuts > 0) setCurrentOuts(3 - last.deltaOuts);
        return;
      }
    } else if (currentHalf === "表" && idx > 0) {
      const prevBottom = copy[idx - 1].bottom;
      if (prevBottom.length) {
        const last = prevBottom.pop() as PlayRecord;
        setRecords(copy);
        setCurrentHalf("裏");
        setCurrentInning(idx);
        if (last.deltaOuts > 0) setCurrentOuts(3 - last.deltaOuts);
        return;
      }
    }
    return; // どちらにも戻せない場合
  }

  const last = bucket.pop() as PlayRecord;
  setRecords(copy);

  // 打順を戻す
  if (last.advancedOrder) {
    if (currentHalf === "表") {
      setEnemyOrder((prev:number) => (prev === 1 ? 9 : prev - 1));
    } else {
      setAllyOrder((prev:number) => (prev === 1 ? 9 : prev - 1));
    }
  }

  // アウトカウントを戻す
  if (last.deltaOuts > 0) {
    setCurrentOuts((prev:number) => Math.max(0, prev - last.deltaOuts));
  }
}
  
// 入力データを自動保存
useEffect(() => {
  localStorage.setItem('baseballReportData', JSON.stringify({
    gameInfo, innings, lineup, subs, records,
    allyOrder, enemyOrder, currentInning, currentHalf, currentOuts,
    reportText
  }));
}, [gameInfo, innings, lineup, subs, records, allyOrder, enemyOrder, currentInning, currentHalf, currentOuts, reportText]);
// 初回ロード時に復元
useEffect(() => {
  const saved = localStorage.getItem('baseballReportData');
  if (saved) {
    const data = JSON.parse(saved);
    setGameInfo(data.gameInfo || gameInfo);
    setInnings(data.innings || innings);
    setLineup(data.lineup || lineup);
    setSubs(data.subs || []);
    setRecords(data.records || records);
    setAllyOrder(data.allyOrder || 1);
    setEnemyOrder(data.enemyOrder || 1);
    setCurrentInning(data.currentInning || 1);
    setCurrentHalf(data.currentHalf || '表');
    setCurrentOuts(data.currentOuts || 0);
    setReportText(data.reportText || "");
  }
}, []);

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左ペイン：入力フォーム */}
        <div className="bg-white p-4 rounded-xl shadow overflow-y-auto h-[80vh]">
          <h1 className="text-xl font-bold mb-3">試合情報入力</h1>

          {/* 基本試合情報入力 */}
          <h2 className="text-lg font-semibold mb-2">基本情報</h2>
          {Object.entries({
            title: "試合名",
            home: "ホームチーム",
            away: "アウェイチーム",
            date: "日付",
            place: "場所",
            weather: "天候",
          }).map(([key, label]) => (
            <div key={key} className="mb-2">
              <label className="block text-sm text-gray-600">{label}</label>
              <input
                value={(gameInfo as any)[key]}
                onChange={(e) => setGameInfo({ ...gameInfo, [key]: e.target.value })}
                className="w-full p-1 border rounded"
              />
            </div>
          ))}

          {/* 時刻（横並び） */}
          <div className="mb-2 flex gap-2 items-center">
            <label className="text-sm text-gray-600 w-24">開始時間</label>
            <input type="number" value={gameInfo.startHour} onChange={(e) => setGameInfo({ ...gameInfo, startHour: e.target.value })} className="w-16 p-1 border rounded" />
            時
            <input type="number" value={gameInfo.startMin} onChange={(e) => setGameInfo({ ...gameInfo, startMin: e.target.value })} className="w-16 p-1 border rounded" />
            分
          </div>
          <div className="mb-2 flex gap-2 items-center">
            <label className="text-sm text-gray-600 w-24">終了時間</label>
            <input type="number" value={gameInfo.endHour} onChange={(e) => setGameInfo({ ...gameInfo, endHour: e.target.value })} className="w-16 p-1 border rounded" />
            時
            <input type="number" value={gameInfo.endMin} onChange={(e) => setGameInfo({ ...gameInfo, endMin: e.target.value })} className="w-16 p-1 border rounded" />
            分
          </div>

          {/* 先攻/後攻 */}
          <div className="mb-2">
            <label className="block text-sm text-gray-600">先攻/後攻</label>
            <select
              value={gameInfo.homeBatting ? "後攻" : "先攻"}
              onChange={(e) => setGameInfo({ ...gameInfo, homeBatting: e.target.value === "後攻" })}
              className="p-1 border rounded"
            >
              <option value="先攻">先攻</option>
              <option value="後攻">後攻</option>
            </select>
          </div>

          {/* 先発メンバー入力（守備重複防止） */}
          <h2 className="text-lg font-semibold mb-2">先発メンバー入力</h2>
          {lineup.map((p:any, idx:number) => {
            const usedNames = lineup.map((l:any) => l.name).filter(Boolean);
            const usedPos = lineup.map((l:any) => l.pos).filter(Boolean);
            return (
              <div key={idx} className="flex gap-2 mb-2 items-center">
                <span>{idx + 1}番</span>
                <select
                  value={p.name}
                  onChange={(e) => {
                    const copy = [...lineup];
                    copy[idx].name = e.target.value;
                    setLineup(copy);
                  }}
                  className="p-1 border rounded flex-1"
                >
                  <option value="">選手</option>
                  {playerList
                    .filter((n) => !usedNames.includes(n) || n === p.name)
                    .map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                </select>
                <select
                  value={p.pos}
                  onChange={(e) => {
                    const copy = [...lineup];
                    copy[idx].pos = e.target.value;
                    setLineup(copy);
                  }}
                  className="p-1 border rounded w-20"
                >
                  <option value="">守備</option>
                  {POS_LIST.filter((pos) => !usedPos.includes(pos) || pos === p.pos).map((pos) => (
                    <option key={pos}>{pos}</option>
                  ))}
                </select>
              </div>
            );
          })}

          {/* スコアボード & 投手入力 */}
          <h2 className="text-lg font-semibold mb-2">スコアボード & 投球数</h2>
{innings.map((inn:any, idx:number) => (
  <div key={idx} className="border p-2 mb-3 rounded">
    <div className="mb-1 font-bold">{idx + 1}回</div>

    {gameInfo.homeBatting ? (
      <>
        {/* 先攻（相手）の攻撃 */}
        <div className="mb-2">
          <span className="font-semibold">相手の攻撃</span>
          <div className="flex gap-2 items-center mt-1">
            <span>得点</span>
            <input
              type="number"
              value={inn.away as any}
              onChange={(e) => {
                const copy = [...innings];
                copy[idx].away = e.target.value as any;
                setInnings(copy);
              }}
              className="w-16 p-1 border rounded"
            />
          </div>
          <PitcherInputs
            label="味方投手"
            pitchers={inn.awayPitchers}
            setPitchers={(p: any) => {
              const copy = [...innings];
              copy[idx].awayPitchers = p;
              setInnings(copy);
            }}
            playerList={playerList}
            buttonClass="bg-blue-100"
          />
        </div>

        {/* 後攻（ホーム／味方）の攻撃 */}
        <div className="mb-2">
          <span className="font-semibold">味方の攻撃</span>
          <div className="flex gap-2 items-center mt-1">
            <span>得点</span>
            <input
              type="number"
              value={inn.home as any}
              onChange={(e) => {
                const copy = [...innings];
                copy[idx].home = e.target.value as any;
                setInnings(copy);
              }}
              className="w-16 p-1 border rounded"
            />
          </div>
          <PitcherInputs
            label="相手投手"
            pitchers={inn.homePitchers}
            setPitchers={(p: any) => {
              const copy = [...innings];
              copy[idx].homePitchers = p;
              setInnings(copy);
            }}
            playerList={playerList}
            buttonClass="bg-green-100"
          />
        </div>
      </>
    ) : (
      <>
        {/* 先攻（ホーム／味方）の攻撃 */}
        <div className="mb-2">
          <span className="font-semibold">味方の攻撃</span>
          <div className="flex gap-2 items-center mt-1">
            <span>得点</span>
            <input
              type="number"
              value={inn.home as any}
              onChange={(e) => {
                const copy = [...innings];
                copy[idx].home = e.target.value as any;
                setInnings(copy);
              }}
              className="w-16 p-1 border rounded"
            />
          </div>
          <PitcherInputs
            label="相手投手"
            pitchers={inn.homePitchers}
            setPitchers={(p: any) => {
              const copy = [...innings];
              copy[idx].homePitchers = p;
              setInnings(copy);
            }}
            playerList={playerList}
            buttonClass="bg-green-100"
          />
        </div>

        {/* 後攻（相手）の攻撃 */}
        <div className="mb-2">
          <span className="font-semibold">相手の攻撃</span>
          <div className="flex gap-2 items-center mt-1">
            <span>得点</span>
            <input
              type="number"
              value={inn.away as any}
              onChange={(e) => {
                const copy = [...innings];
                copy[idx].away = e.target.value as any;
                setInnings(copy);
              }}
              className="w-16 p-1 border rounded"
            />
          </div>
          <PitcherInputs
            label="味方投手"
            pitchers={inn.awayPitchers}
            setPitchers={(p: any) => {
              const copy = [...innings];
              copy[idx].awayPitchers = p;
              setInnings(copy);
            }}
            playerList={playerList}
            buttonClass="bg-blue-100"
          />
        </div>
      </>
    )}
  </div>
          ))}

{/* 交代フォーム */}
<SubForm
  playerList={playerList}
  posList={POS_LIST}
  lineup={lineup}
  subs={subs}
  setSubs={setSubs}
  setLineup={setLineup}
  currentInning={currentInning}
  currentHalf={currentHalf}
  battingOrderState={battingOrderState}          // ★追加
  setBattingOrderState={setBattingOrderState}    // ★追加
  onAdd={(s:any) => {
    const idx = s.inning - 1;
    const rec: PlayRecord = { line: `${s.type}：${s.out}→${s.in}(${s.pos})`, deltaOuts: 0, advancedOrder: false };
    const copy = [...records];
    if (s.half === '表') copy[idx].top.push(rec); else copy[idx].bottom.push(rec);
    setRecords(copy);
  }}
/>



{/* 交代一覧 */}
<div className="mt-4 border p-2 rounded">
  <h3 className="font-semibold mb-2">交代一覧</h3>
  {subs.length === 0 && <div className="text-gray-500 text-sm">（なし）</div>}
  {subs.map((s:any, idx:number) => (
    <div key={idx} className="flex justify-between items-center mb-1 text-sm">
      <span>
        {s.inning}回{s.half} {s.type}:{s.out}{s.pos ? `(${s.pos})` : ''} → {s.in}{s.pos ? `(${s.pos})` : ''}
      </span>
      <button
        onClick={() => {
          const updated = subs.filter((_:any, i:number) => i !== idx);
          setSubs(updated);
        }}
        className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
      >削除</button>
    </div>
  ))}
</div>


          {/* 打席入力フォーム */}
          <AtBatForm
            lineup={lineup}
            allyOrder={allyOrder}
            setAllyOrder={setAllyOrder}
            enemyOrder={enemyOrder}
            setEnemyOrder={setEnemyOrder}
            homeBatting={gameInfo.homeBatting}
            onAppend={(i: number, h: "表" | "裏", rec: PlayRecord) => {
              const copy = [...records];
              (h === "表" ? copy[i].top : copy[i].bottom).push(rec);
setRecords(copy);
const saved = JSON.parse(localStorage.getItem('baseballReportData') || '{}');
localStorage.setItem('baseballReportData', JSON.stringify({
  ...saved,
  records: copy
}));



              
            }}
            currentInning={currentInning}
            setCurrentInning={setCurrentInning}
            currentHalf={currentHalf}
            setCurrentHalf={setCurrentHalf}
            currentOuts={currentOuts}
            setCurrentOuts={setCurrentOuts}
            onUndo={handleUndo}
          />
        </div>

        {/* 右ペイン：レポート出力 */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h1 className="text-xl font-bold mb-3">レポート出力</h1>
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            className="whitespace-pre-wrap bg-gray-50 p-3 rounded h-[600px] overflow-auto border w-full"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(reportText);
              alert("コピーしました");
            }}
            className="mt-3 px-4 py-2 bg-green-600 text-white rounded"
          >
            📋 コピー
          </button>

<button
  onClick={() => {
    if (window.confirm('打席記録をすべて削除します。よろしいですか？')) {
      if (window.confirm('本当によろしいですか？')) {
        const clearedRecords = Array.from({ length: 7 }, () => ({ top: [], bottom: [] }));
        setRecords(clearedRecords);
        const saved = JSON.parse(localStorage.getItem('baseballReportData') || '{}');
        localStorage.setItem('baseballReportData', JSON.stringify({
          ...saved,
          records: clearedRecords
        }));
        alert('打席記録をすべて削除しました。');
      }
    }
  }}
  className="mt-3 ml-2 px-4 py-2 bg-red-600 text-white rounded"
>
  🗑 打席記録削除
</button>

          
        </div>
      </div>
    </div>
  );
}
