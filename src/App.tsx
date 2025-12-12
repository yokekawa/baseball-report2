import React, { useState, useEffect } from "react";
 // 投手配列を安全に更新する共通関数
 function updateInningPitchers(prevInnings: any[], idx: number, side: "awayPitchers" | "homePitchers", p: any) {
   return prevInnings.map((row, i) => {
     if (i !== idx) return row;
     const base = row[side];
     const cand = (typeof p === "function") ? p(base) : p;
     return {
       ...row,
       [side]: Array.isArray(cand) ? cand : [],
     };
   });
 }

// ===== 共通データ =====
const DEFAULT_PLAYERS = [
  "青田","泉","磯村","小野","金子","川除","菊地","紺木","佐藤",
  "髙田","高橋","武田一","武田心","田中樹","田中翔","徳留","野路",
  "橋本","廣澤","舟久保","本多","益田","増田","増野","渡部"
];
const POS_LIST = ["投","捕","一","二","三","遊","左","中","右"];

// ===== 型 =====
type PlayRecord = {
  line: string;
  deltaOuts: number;
  advancedOrder: boolean;
  batterName: string;
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
  if (!p.pitchThis && !p.pitchTotal) return "";
  const t = p.pitchThis || "";
  const T = p.pitchTotal || "";
  const slash = t && T ? "/" : "";
  const label = isOpponent ? `相手投手` : p.name;
  return `${label}　投球数　${t}${slash}${T}球\n`;
})
    .join("");

// ===== コンポーネント =====
function PitcherInputs({ label, pitchers, setPitchers, playerList, buttonClass, isOpponent }: any) {
pitchers = Array.isArray(pitchers) ? pitchers : [];
function updatePitcher(index: number, key: string, value: string) {
   setPitchers((prev: any) => {
     const safe = Array.isArray(prev) ? prev : [];
     const next = [...safe];
     next[index] = { ...next[index], [key]: value };
     return next;
   });
 }
return (
    <div className="ml-3 text-sm">
      <div className="font-medium">{label}</div>

{pitchers.map((p: any, j: number) => (
  <React.Fragment key={j}>
    <div className="mb-1">
      {!isOpponent && (
        <select
          value={p.name}
          onChange={(e) => updatePitcher(j, "name", e.target.value)}
          className="border rounded px-1"
        >
          <option value="">投手</option>
          {playerList.map((n: string) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-1 mt-1">
        <input
          type="number"
          value={p.pitchThis}
          placeholder="球"
          onChange={(e) => updatePitcher(j, "pitchThis", e.target.value)}
          className="w-8 border rounded px-1"
        />
        <span>/</span>
        <input
          type="number"
          value={p.pitchTotal}
          placeholder="計"
          onChange={(e) => updatePitcher(j, "pitchTotal", e.target.value)}
          className="w-8 border rounded px-1"
        />
      </div>
    </div>
  </React.Fragment>
))}

<button
        onClick={() =>
   setPitchers((prev: any[]) => {
     const safe = Array.isArray(prev) ? prev : [];
     return [...safe, { name: "", pitchThis: "", pitchTotal: "" }];
   })
 }
        className={`px-1 py-0.5 text-xs rounded ${buttonClass}`}
      >
        ＋投手
      </button>
    </div>
  );
}

// SubForm
function SubForm({ playerList, posList, lineup, subs, setSubs, onAdd, currentInning, currentHalf, currentBatters }: any) {
  const [type, setType] = useState("交代");
  const [out, setOut] = useState("");
  const [inn, setInn] = useState("");
  const [pos, setPos] = useState("");
  const [oldPos, setOldPos] = useState("");
  const [newPos, setNewPos] = useState("");
  const [inning, setInning] = useState(currentInning || 1);
  const [half, setHalf] = useState(currentHalf || "表");

const FielderNow = (() => {
  const active = currentBatters().map((l: any) => l.name).filter(Boolean);
  const base = lineup.filter((l: any) => l && l.name).map((l: any) => l.name);
  let current = [...base, ...active];

  subs.forEach((s: any) => {
    if (s.type === '交代' || s.type === '代打') {
      current = current.filter((n) => n !== s.out);
      current.push(s.in);
    }
  });

  return Array.from(new Set(current));
})();

const benchPlayers = playerList.filter((p: string) => !FielderNow.includes(p));

// 「退く選手」、「入る選手」を表示
const canIn = benchPlayers;

  function handleAdd() {
    if (type === "交代") {
      if (!out || !inn || !pos) return;
      const sub = { type, out, in: inn, pos, inning, half };
      setSubs((prev: any) => [...prev, sub]);
      onAdd(sub);
    } else if (type === "代打") {
      if (!out || !inn) return;
      const sub = { type, out, in: inn, inning, half };
      setSubs((prev: any) => [...prev, sub]);
      onAdd(sub);
    } else if (type === "守備変更") {
      if (!out || !oldPos || !newPos) return;
      const sub = { type, out, oldPos, newPos, inning, half };
      setSubs((prev: any) => [...prev, sub]);
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
        {(type === "交代")? (
          <>
            <select value={out} onChange={(e) => setOut(e.target.value)} className="p-1 border rounded">
              <option value="">退く選手</option>
              {FielderNow.map((n: string) => <option key={n}>{n}</option>)}
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
      ) : type === "代打" ? (
  <>
    <select value={out} onChange={(e) => setOut(e.target.value)} className="p-1 border rounded">
      <option value="">退く選手</option>
      {FielderNow.map((n: string) => <option key={n}>{n}</option>)}
    </select>
    <select value={inn} onChange={(e) => setInn(e.target.value)} className="p-1 border rounded">
      <option value="">入る選手</option>
      {canIn.map((n: string) => <option key={n}>{n}</option>)}
    </select>
  </>
        ) : (
          <>
            <select value={out} onChange={(e) => setOut(e.target.value)} className="p-1 border rounded">
              <option value="">選手</option>
              {FielderNow.map((n: string) => <option key={n}>{n}</option>)}
            </select>
<select value={oldPos} onChange={(e) => setOldPos(e.target.value)}
  className="p-1 border rounded">
  <option value="">変更前守備</option>
  {[...posList, "代打"].map((p: string) => <option key={p}>{p}</option>)}
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
      </div>
    </div>
  );
}

// 打席入力フォーム
function AtBatForm({
  lineup,
  currentBatters,
  allyOrder,
  setAllyOrder,
  eOrder,
  seteOrder,
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
  const [freeText, setFreeText] = useState("");
  const [bases, setBases] = useState("なし");
  const [selectedOuts, setSelectedOuts] = useState(currentOuts);
  const [extraPlay, setExtraPlay] = useState("");
  const [direction, setDirection] = useState("");
  const [outcome, setOutcome] = useState("");
  const battingNowIsAlly = (homeBatting && currentHalf === "裏") || (!homeBatting && currentHalf === "表");
  const baseTiles = ["なし", "1塁", "2塁", "3塁", "1、2塁", "1、3塁", "2、3塁", "満塁"];
  const extraOptions = ["", "盗塁成功", "盗塁失敗", "ワイルドピッチ", "パスボール", "送球ミス", "ボーク"];
  const [fA, setfA] = useState(false);
  const [fU, setfU] = useState(false);
  useEffect(() => { setSelectedOuts(currentOuts); }, [currentInning, currentHalf, currentOuts]);

 function flash(fn: () => void, setFlash: any) {
   setFlash(true);      // 光る！
   fn();                // 実行
   setTimeout(() => setFlash(false), 150);  // 0.15秒後に戻る
 }


  function handleAppend() {
      const name = battingNowIsAlly ? (currentBatters()[(allyOrder - 1) % 9]?.name || lineup[(allyOrder - 1) % 9]?.name || "打者") : "";

    const text = extraPlay ? extraPlay : ((direction || "") + (outcome || "")) + (freeText ? ` ${freeText}` : "");
    const outsToUse = Number(selectedOuts) || 0;

    let line = "";
    line = `${text}　${outsToUse}死`;

    if (outsToUse === 3) {
      line = line.replace(/3死$/, "");
      line += "チェンジ";
    } else {
      line += bases === "なし" ? "" : ` ${bases}`;
    }

    
    const idx = Math.max(1, Math.min(currentInning, 20)) - 1;
    const deltaOuts = Math.max(0, outsToUse - currentOuts);
    const advancedOrder = !extraPlay; 
    onAppend(idx, currentHalf, { line, deltaOuts, advancedOrder, batterName: battingNowIsAlly ? `${allyOrder}${name}` : `${eOrder}.`});

    // 打順を進める（走塁のみは進めない）
    if (!extraPlay) {
      const currentOrder = battingNowIsAlly ? allyOrder : eOrder;
      const next = (currentOrder % 9) + 1;
if (battingNowIsAlly) {
        setAllyOrder(next);
      } else {
        seteOrder(next);
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
      setBases("なし");

    } else {
      setCurrentOuts(outsToUse);

    }

    // クリア
setFreeText("");
setExtraPlay("");
setDirection("");
setOutcome("");

  }

  const [ft, setFt] = useState("");
  function addNote() {
    if (!ft.trim()) return;
    const idx = Math.max(1, Math.min(currentInning, 20)) - 1;
    const rec = { line: `${ft.trim()}`, deltaOuts: 0, advancedOrder: false, batterName: "" };
    onAppend(idx, currentHalf, rec);
    setFt("");
  }

  return (
    <div className="rounded-lg border p-3 bg-slate-50">
      <div className="flex gap-2 mb-2">
        <input
          value={ft}
          onChange={(e) => setFt(e.target.value)}
          placeholder="自由記載（例：相手投手右投げ遅め）"
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={addNote}
          className="px-2 py-1 bg-green-600 text-white rounded"
        >
          追加
        </button>
      </div>
      
      <div className="mb-2 font-bold">
        現在：{currentInning}回{currentHalf} | {battingNowIsAlly ? (
    <>
      八王子 {allyOrder}番 {currentBatters()[(allyOrder - 1) % 9]?.name || lineup[(allyOrder - 1) % 9]?.name || "打者"}
    </>
  ) : (
    <>
      相手 {eOrder}番打者
    </>
  )}
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm">
        <label className="text-gray-600">打順を選択</label>

        {battingNowIsAlly ? (
          <select
            value={allyOrder}
            onChange={(e) => setAllyOrder(parseInt(e.target.value, 10))}
            className="p-1 border rounded"
          >
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        ) : (
          <select
            value={eOrder}
            onChange={(e) => seteOrder(parseInt(e.target.value, 10))}
            className="p-1 border rounded"
          >
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        )}
        {battingNowIsAlly && (
          <span className="text-gray-500">（{currentBatters()[(allyOrder - 1) % 9]?.name || lineup[(allyOrder - 1) % 9]?.name || "打者"}）</span>
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
    <option value="レフト前">レフト前</option>
    <option value="レフト線">レフト線</option>
    <option value="レフトオーバー">レフトオーバー</option>
    <option value="センター">センター</option>
    <option value="センター前">センター前</option>
    <option value="センターオーバー">センターオーバー</option>
    <option value="ライト">ライト</option>
    <option value="ライト前">ライト前</option>
    <option value="ライト線">ライト線</option>
    <option value="ライトオーバー">ライトオーバー</option>
    <option value="左中間">左中間</option>
    <option value="右中間">右中間</option>
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
    <option value="内野安打">内野安打</option>
    <option value="2ベースヒット">2ベースヒット</option>
    <option value="3ベースヒット">3ベースヒット</option>
    <option value="ランニングホームラン">ランニングホームラン</option>
    <option value="ホームラン">ホームラン</option>
  </optgroup>
  <optgroup label="凡打">
    <option value="フライ">フライ</option>
    <option value="ファールフライ">ファールフライ</option>
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
<div className="flex flex-col gap-2 mb-3">
  <select
    value={extraPlay.split(' ')[0] || ''}
    onChange={(e) => setExtraPlay((prev) => `${e.target.value} ${prev.split(' ').slice(1).join(' ')}`.trim())}
    className="w-full p-2 border rounded"
  >
    {extraOptions.map((opt) => (
      <option key={opt} value={opt}>{opt || '（なし）'}</option>
    ))}
  </select>
  <input
    type="text"
    value={extraPlay.split(' ').slice(1).join(' ')}
    onChange={(e) => setExtraPlay((prev) => `${prev.split(' ')[0]} ${e.target.value}`.trim())}
    placeholder="自由追記（例：キャッチャー悪送球など）"
    className="w-full p-2 border rounded"
  />
</div>

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

      <button onClick={() => flash(handleAppend, setfA)}
       className={`w-full px-3 py-2 rounded text-white ${fA ? "bg-yellow-400" : "bg-blue-600"}`}>
        ＋ このプレイを {currentInning}回{currentHalf} に追加
      </button>
      <button onClick={() => flash(onUndo, setfU)}
       className={`w-full px-3 py-2 rounded text-white mt-2 ${fU ? "bg-yellow-400" : "bg-red-600"}`}>
        1プレイ戻す
      </button>
      
    </div>
  );
}

// ===== メインアプリ =====
export default function BaseballReportApp() {
  const playerList = DEFAULT_PLAYERS;
  // subs の履歴から最新の出場状態を再構築する関数
  function rebuildBattingOrderState(lineup: any, subs: any) {
    let state = lineup.map((p: any) => ({ ...p }));
    subs.forEach((s: any) => {
      if (s.type === "交代" || s.type === "代打") {
        state = state.map((l: any) =>
          l.name === s.out ? { ...l, name: s.in, pos: s.pos ?? l.pos } : l
        );
      } else if (s.type === "守備変更") {
        state = state.map((l: any) =>
          l.name === s.out ? { ...l, pos: s.newPos } : l
        );
      }
    });
    return state;
  }

  const [gameInfo, setGameInfo] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    if (saved) return JSON.parse(saved).gameInfo || {};
    return { title: '25練習試合', away: '相手', home: '八王子', date: '2025/5/4(日)', place: '八王子リトルシニアグラウンド', weather: '晴', startHour: '10', startMin: '00', endHour: '12', endMin: '00', homeBatting: true };
  });

  const [innings, setInnings] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).innings || Array.from({ length: 7 }, makeInning) : Array.from({ length: 7 }, makeInning);
  });


const [lineup, setLineup] = useState(() => {
  const saved = localStorage.getItem('baseballReportData');
  if (saved) {
    const parsed = JSON.parse(saved);
    // 保存されたlineupが存在すればそれを使う
    return parsed.lineup ?? Array.from({ length: 9 }, (_, i) => ({ order: i + 1, name: '', pos: '' }));
  }
  return Array.from({ length: 9 }, (_, i) => ({ order: i + 1, name: '', pos: '' }));
});
  
  const [subs, setSubs] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).subs || [] : [];
  });
  
// subs の変更時に出場状態を再構築
 function currentBatters() {
   return rebuildBattingOrderState(lineup, subs);
 }
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
  if (saved) {
    const parsed = JSON.parse(saved);
    // localStorage に保存がある場合はそれを使用
    return parsed.allyOrder ?? 1;
  }
  return 1;
});

  const [eOrder, seteOrder] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).eOrder || 1 : 1;
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

function formatPlays(list: PlayRecord[], isAllyBatting: boolean) {
  let out = "";
  let a = 0; // 0＝新打席（打順＋選手名）、1＝同打席（インデントのみ）

  list.forEach((r) => {
    const isAtBat = r.advancedOrder;
    const play = r.line;
    let indent = "";

    if (isAllyBatting) {
      // 味方攻撃：打者名＋打順でインデントを揃える（従来の挙動）
      const firstIndent = r.batterName ? r.batterName + "　" : "";
      const contIndent = firstIndent ? "　".repeat(firstIndent.length - 1) : "";
      indent = a === 0 ? firstIndent : contIndent;
    } else {
      // 相手攻撃：1行目は打順のみ、継続行は常に半角3スペース
      indent = a === 0 ? (r.batterName || "").trim() : "   ";
    }

    out += `${indent}${play}\n`;

    if (!isAtBat && r.batterName === "") {
      a = 0; 
    } else {
      a = isAtBat ? 0 : 1;
    }
  });
  return out;
}


// レポート生成
function generateReport(gameInfo: any, innings: any, lineup: any, subs: any, records: any) {
  const totalAway = innings.reduce((a: number, b: any) => a + Number(b.away || 0), 0);
  const totalHome = innings.reduce((a: number, b: any) => a + Number(b.home || 0), 0);

  let out = `${gameInfo.title}　${gameInfo.home}vs${gameInfo.away}\n`;
  out += `◆日付　${gameInfo.date}\n`;
  out += `◆場所　${gameInfo.place}\n`;
  out += `◆天候　${gameInfo.weather}\n`;
  out += `◆試合開始時刻 ${gameInfo.startHour}時${gameInfo.startMin}分開始\n`;
  out += `◆試合終了時刻 ${gameInfo.endHour}時${gameInfo.endMin}分終了\n`;
  out += ` ※${gameInfo.home}　${gameInfo.homeBatting ? "後攻" : "先攻"}\n\n`;

  out += ` 　  　　　/1234567/計\n`;
  if (gameInfo.homeBatting) {
    out += ` 【${gameInfo.away}】/${innings.map((i: any) => i.away || "").join("")}/${totalAway}\n`;
    out += ` 【${gameInfo.home}】/${innings.map((i: any) => i.home || "").join("")}/${totalHome}\n\n`;
  } else {
    out += ` 【${gameInfo.home}】/${innings.map((i: any) => i.home || "").join("")}/${totalHome}\n`;
    out += ` 【${gameInfo.away}】/${innings.map((i: any) => i.away || "").join("")}/${totalAway}\n\n`;
  }

out += `【先発メンバー】\n`;

lineup.forEach((p: any) => {
  if (!p.name) return;

  // 先発行の基本
  let line = `${p.order}.${p.name}${p.pos ? `(${p.pos})` : ""}`;

  // 現在の出場選手を追跡（交代チェーンに対応）
  let NameNow = p.name;

  // subs は時系列順なのでそのまま走査でOK
  subs.forEach((s: any) => {
    if (s.type === "交代" && s.out === NameNow) {
      // → 交代： 例）→3回裏 武田一(三)
      line += `→${s.inning}回${s.half} ${s.in}(${s.pos})`;
      NameNow = s.in;
    } else if (s.type === "代打" && s.out === NameNow) {
      // → 代打： 例）→3回表 野路(代打)
      line += `→${s.inning}回${s.half} ${s.in}(代打)`;
      NameNow = s.in; // 代打後の選手がそのまま残る前提
    } else if (s.type === "守備変更" && s.out === NameNow) {
      // → 守備変更：例）(三)→(一)
      line += `→${s.inning}回${s.half}(${s.newPos})`;
    }
  });

  out += line + "\n";
});

out += `\n`;

const starter = lineup.find((p: any) => p.pos === "投");
out += `※八王子先発　${starter?.name || "（未入力）"}\n\n`;

  records.forEach((innRec: any, i: number) => {

    const n = i + 1;
    const weAreHome = gameInfo.homeBatting;
    const homeTeamPitchers = innings[i].homePitchers;
    const awayTeamPitchers = innings[i].awayPitchers;
    if (innRec.top.length) {     
out += `●${n}回表\n`;
out += formatPlays(innRec.top, !weAreHome);

const runsTop = gameInfo.homeBatting ? innings[i].away : innings[i].home;
if (runsTop !== "") {
  const labelTop = gameInfo.homeBatting ? "失点" : "得点";
  out += `この回${runsTop}${labelTop}\n`;
}

const pitchersTop = weAreHome ? awayTeamPitchers : homeTeamPitchers;
const topIsOpponent = (!weAreHome); 
out += renderPitchers(pitchersTop, topIsOpponent);

out += `\n`;
    }
    if (innRec.bottom.length) {
out += `●${n}回裏\n`;
out += formatPlays(innRec.bottom, weAreHome);

const runsBottom = gameInfo.homeBatting ? innings[i].home : innings[i].away;
if (runsBottom !== "") {
  const labelBottom = gameInfo.homeBatting ? "得点" : "失点";
  out += `この回${runsBottom}${labelBottom}\n`;
}
const pitchersBottom = weAreHome ? homeTeamPitchers : awayTeamPitchers;
const bottomIsOpponent = (weAreHome);
out += renderPitchers(pitchersBottom, bottomIsOpponent);
out += `\n`;
    }
  });


   return out;
 }
/* eslint-disable react-hooks/exhaustive-deps */
useEffect(() => {
  setReportText(generateReport(gameInfo, innings, lineup, subs, records));
}, 
[
  gameInfo, innings, lineup, subs, records
]);
/* eslint-disable react-hooks/exhaustive-deps */

 // ====== 最後の入力を取り消す（差分で戻す） ======
 function handleUndo() {  const idx = Math.max(1, Math.min(currentInning, 20)) - 1;
  const copy = [...records];
  const bucket = currentHalf === "表" ? copy[idx].top : copy[idx].bottom;

  // 現在のイニングが空でも、前のイニングの裏から戻せるように調整
  if (!bucket.length) {
    let last: PlayRecord | null = null;
    let poppedHalf: "表" | "裏" | null = null;
    if (currentHalf === "裏" && idx >= 0) {
      const prevTop = copy[idx].top;
      if (prevTop.length) {
        last = prevTop.pop() as PlayRecord;
        poppedHalf = "表";
        setRecords(copy);
        setCurrentHalf("表");
        setCurrentInning(idx + 1);
      }
    } else if (currentHalf === "表" && idx > 0) {
      const prevBottom = copy[idx - 1].bottom;
      if (prevBottom.length) {
        last = prevBottom.pop() as PlayRecord;
        poppedHalf = "裏";
        setRecords(copy);
        setCurrentHalf("裏");
        setCurrentInning(idx);
      }
    }

    if (last) {
      if (last.deltaOuts > 0) setCurrentOuts(3 - last.deltaOuts);
      if (last.advancedOrder && poppedHalf) {
        // poppedHalf（実際に取り消した半イニング）で味方が打っていたかを判定
        const allyWasBatting =
          (gameInfo.homeBatting && poppedHalf === "裏") ||
          (!gameInfo.homeBatting && poppedHalf === "表");
        if (allyWasBatting) {
          setAllyOrder((prev: number) => (prev === 1 ? 9 : prev - 1));
        } else {
          seteOrder((prev: number) => (prev === 1 ? 9 : prev - 1));
        }
      }
    }
    return;
  }


  const last = bucket.pop() as PlayRecord;
  setRecords(copy);

  // 打順を戻す（homeBattingに応じて先攻／後攻を考慮）
  if (last.advancedOrder) {
    const battingNowIsAlly =
      (gameInfo.homeBatting && currentHalf === "裏") ||
      (!gameInfo.homeBatting && currentHalf === "表");

    if (battingNowIsAlly) {
      setAllyOrder((prev: number) => (prev === 1 ? 9 : prev - 1));
    } else {
      seteOrder((prev: number) => (prev === 1 ? 9 : prev - 1));
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
    allyOrder, eOrder, currentInning, currentHalf, currentOuts,
    reportText
  }));
}, [gameInfo, innings, lineup, subs, records, allyOrder, eOrder, currentInning, currentHalf, currentOuts, reportText]);
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
    seteOrder(data.eOrder || 1);
    setCurrentInning(data.currentInning || 1);
    setCurrentHalf(data.currentHalf || '表');
    setCurrentOuts(data.currentOuts || 0);
    setReportText(data.reportText || "");
  }
}, []);

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:[&>*:first-child]:order-2 md:[&>*:last-child]:order-1">
        {/* 左ペイン：入力フォーム */}
        <div className="bg-white p-4 rounded-xl shadow overflow-y-auto h-[90vh] landscape:h-screen landscape:max-h-screen">
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
<div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-2">
{innings.map((inn:any, idx:number) => {
  return (
   <div key={idx} className="border p-2 rounded inline-block align-top">
    <div className="mb-1 font-bold">{idx + 1}回</div>

{[
      gameInfo.homeBatting
        ? { label: "相手の攻撃", team: "away", pitcherSide: "awayPitchers", isOpponent: true,  buttonClass: "bg-green-100" }
        : { label: "八王子の攻撃", team: "home", pitcherSide: "homePitchers", isOpponent: false, buttonClass: "bg-blue-100" },

      gameInfo.homeBatting
        ? { label: "八王子の攻撃", team: "home", pitcherSide: "homePitchers", isOpponent: false, buttonClass: "bg-blue-100" }
        : { label: "相手の攻撃", team: "away", pitcherSide: "awayPitchers", isOpponent: true,  buttonClass: "bg-green-100" }
    ].map((atk, i) => (
  <div key={i} className="mb-2">
        <span className="font-semibold">{atk.label}</span>

        <div className="flex gap-2 items-center mt-1">
          <span>得点</span>
          <input
            type="number"
            value={inn[atk.team]}
            onChange={(e) => {
              const copy = [...innings];
              copy[idx][atk.team] = e.target.value;
              setInnings(copy);
            }}
            className="w-10 p-1 border rounded text-xs"
          />
        </div>

        <PitcherInputs
          label={atk.isOpponent ? "相手投手" : "八王子投手"}
          pitchers={inn[atk.pitcherSide]}
          setPitchers={(p:any) =>
            setInnings((prev:any) =>
              updateInningPitchers(prev, idx, atk.pitcherSide as "awayPitchers" | "homePitchers", p)
            )
          }
          playerList={playerList}
          buttonClass={atk.buttonClass}
          isOpponent={atk.isOpponent}
        />
      </div>
    ))}
  </div>
  );
})}
</div>

{/* 交代フォーム */}
<SubForm
  playerList={playerList}
  posList={POS_LIST}
  lineup={lineup}
  subs={subs}
  setSubs={setSubs}
  currentInning={currentInning}
  currentHalf={currentHalf}
  currentBatters={currentBatters}
  onAdd={(s:any) => {
    const idx = s.inning - 1;
const rec: PlayRecord =
  s.type === "守備変更"
    ? { line: `${s.type}：${s.out}(${s.oldPos})→(${s.newPos})`,
        deltaOuts: 0, advancedOrder: false, batterName: "" }
    : s.type === "代打"
     ? { line: `${s.out}→${s.in}(代打)`, deltaOuts: 0, advancedOrder: false, batterName: "" }
    : { line: `${s.type}：${s.out}→${s.in}(${s.pos})`, deltaOuts: 0, advancedOrder: false, batterName: "" };

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
         {s.inning}回{s.half} {s.type}:{s.out}
 {s.type === '守備変更'
   ? `(${s.oldPos})→(${s.newPos})`
   : s.type === '代打'
     ? `→${s.in}`
     : `(${s.pos})→${s.in}(${s.pos})`}
      </span>
<button
  onClick={() => {
    const updated = subs.filter((_: any, i: number) => i !== idx);
setSubs(updated);
    // 打席結果からも該当の交代行を削除
    const copy = [...records];
    copy.forEach((inn: any) => {
      inn.top = inn.top.filter(
        (r: any) => !r.line.includes(s.out) && !r.line.includes(s.in)
      );
      inn.bottom = inn.bottom.filter(
        (r: any) => !r.line.includes(s.out) && !r.line.includes(s.in)
      );
    });
    setRecords(copy);

    // localStorage も更新
    const saved = JSON.parse(localStorage.getItem("baseballReportData") || "{}");
    localStorage.setItem(
      "baseballReportData",
      JSON.stringify({ ...saved, subs: updated, records: copy })
    );
  }}
  className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
>削除</button>

    </div>
  ))}
</div>

{/* 打席入力フォーム */}
<AtBatForm
lineup={lineup}
currentBatters={currentBatters}
allyOrder={allyOrder}
setAllyOrder={setAllyOrder}
eOrder={eOrder}
seteOrder={seteOrder}
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

{/* 右ペイン：レポート出力 */}
  <div className="bg-white p-4 rounded-xl shadow">
  <h1 className="text-xl font-bold mb-3">レポート出力</h1>
  <textarea
  value={reportText}
  onChange={(e) => setReportText(e.target.value)}
  className="whitespace-pre-wrap bg-gray-50 p-3 rounded h-[600px] landscape:h-screen landscape:max-h-screen overflow-auto border w-full"
 />
        </div>
      </div>
    </div>
  );
}
        </div>
      </div>
    </div>
  );
}
