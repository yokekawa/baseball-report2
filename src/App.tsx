import React, { useState, useEffect, useRef } from "react";

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
  "青田","泉","磯村","王","小野","金子","川除","菊地","紺木","佐藤",
  "髙田","高橋","武田一","武田心","田中樹","田中翔","徳留","野路",
  "橋本","廣澤","舟久保","本多","益田","増田","増野","渡部"
];
// 打順に入る選手の守備位置リスト（投手は別枠のため除外、DH追加）
const POS_LIST = ["投","捕","一","二","三","遊","左","中","右","DH"];
// 打順メンバー用（DH制時は投手を打順から外すため "投" を除外して使う）
const FIELDER_POS_LIST = ["捕","一","二","三","遊","左","中","右","DH"];

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

type LineupEntry = {
  order: number;
  name: string;
  pos: string;
};

// 投手（別枠管理）
type PitcherEntry = {
  name: string;
};

// DHキャンセル情報
type DHCancel = {
  inning: number;
  half: string;
  pitcherName: string; // 投手（打席に入る選手）
  dhName: string;      // 抹消されるDH選手
  dhOrder: number;     // DHが持っていた打順番号
};

type GameInfo = {
  title: string;
  away: string;
  home: string;
  date: string;
  place: string;
  weather: string;
  startHour: string;
  startMin: string;
  endHour: string;
  endMin: string;
  homeBatting: boolean;
  allyDH: boolean;
  enemyDH: boolean;
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
            {isOpponent && (
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

// ===== SubForm =====
function SubForm({
  playerList, posList, lineup, subs, setSubs, onAdd,
  currentInning, currentHalf, currentBatters,
  allyDH, enemyDH, dhCancelAlly, dhCancelEnemy,
  onDHCancel, homeBatting, allyPitcher,
}: any) {
  const [type, setType] = useState("交代");
  const [out, setOut] = useState("");
  const [inn, setInn] = useState("");
  const [pos, setPos] = useState("");
  const [oldPos, setOldPos] = useState("");
  const [newPos, setNewPos] = useState("");
  const [inning, setInning] = useState(currentInning || 1);
  const [half, setHalf] = useState(currentHalf || "表");

  // DH解除用
  const [dhSide, setDhSide] = useState<"ally"|"enemy">("ally");
  // DH解除パターン選択
  // pat1: 投手がDHの打順を引き継ぐ（最シンプル）
  // pat2: DHが守備につく（投手はそのまま、DHの打順を引き継ぐ）
  // pat3: DHが守備につく＋同時に投手交代
  // pat4: DHへの代打がそのまま守備につく
  const [dhPattern, setDhPattern] = useState<"pat1"|"pat2"|"pat3"|"pat4">("pat1");
  // pat2/pat3 用：DHが就く守備位置・退く選手
  const [dhNewPos, setDhNewPos] = useState("");
  const [dhFielderOut, setDhFielderOut] = useState("");
  // pat3 用：新投手
  const [newPitcher, setNewPitcher] = useState("");
  // pat4 用：代打選手・就く守備位置・退く選手（代打なので退く選手=DH本人）
  const [dhPinchHitter, setDhPinchHitter] = useState("");
  const [dhPinchPos, setDhPinchPos] = useState("");
  const [dhPinchFielderOut, setDhPinchFielderOut] = useState("");

  useEffect(() => { setInning(currentInning || 1); }, [currentInning]);
  useEffect(() => { setHalf(currentHalf || "表"); }, [currentHalf]);

  // DH解除パターン変更時に関連フィールドをリセット
  useEffect(() => {
    setDhNewPos(""); setDhFielderOut(""); setNewPitcher("");
    setDhPinchHitter(""); setDhPinchPos(""); setDhPinchFielderOut("");
  }, [dhPattern, dhSide]);

  const FielderNow = (() => {
    const active = currentBatters().map((l: any) => l.name).filter(Boolean);
    const base = lineup.filter((l: any) => l && l.name).map((l: any) => l.name);
    let current = [...base, ...active];
    subs.forEach((s: any) => {
      if (s.type === '交代' || s.type === '代打' || s.type === '代走') {
        current = current.filter((n: string) => n !== s.out);
        current.push(s.in);
      }
    });
    return Array.from(new Set(current)) as string[];
  })();

  const benchPlayers = playerList.filter((p: string) => !FielderNow.includes(p));

  // DH解除可能か
  const canCancelAllyDH = allyDH && !dhCancelAlly;
  const canCancelEnemyDH = enemyDH && !dhCancelEnemy;

  // 現在の投手名（交代を考慮）
  const currentPitcherName = (() => {
    let name = allyPitcher?.name || "";
    subs.forEach((s: any) => {
      if (s.type === "交代" && s.out === name) name = s.in;
    });
    return name;
  })();

  // 現在のDH選手
  const allyDHPlayer = currentBatters().find((p: any) => p.pos === "DH");

  // DH解除の説明文を生成
  function getDHPatternSummary() {
    if (!allyDHPlayer) return null;
    const dhName = allyDHPlayer.name;
    const dhOrder = allyDHPlayer.order;
    switch (dhPattern) {
      case "pat1":
        return `投手 ${currentPitcherName || "（未設定）"} が ${dhOrder}番打者（${dhName}）の打順を引き継ぎます。${dhName} は退きます。`;
      case "pat2":
        return `${dhName} が ${dhNewPos || "（守備位置未選択）"} として守備につきます。${dhFielderOut ? `${dhFielderOut} が退きます。` : ""}投手はそのまま（打順には入りません）。`;
      case "pat3":
        return `${dhName} が ${dhNewPos || "（守備位置未選択）"} として守備につきます。${dhFielderOut ? `${dhFielderOut} が退きます。` : ""}同時に投手を ${newPitcher || "（未選択）"} に交代します。`;
      case "pat4":
        return `${dhName} に代打 ${dhPinchHitter || "（未選択）"} を送り、そのまま ${dhPinchPos || "（守備位置未選択）"} として守備につきます。${dhPinchFielderOut ? `${dhPinchFielderOut} が退きます。` : ""}`;
    }
  }

  function handleAdd() {
    if (type === "DH解除") {
      const isCancelAlly = dhSide === "ally";

      if (isCancelAlly) {
        if (!allyDHPlayer) { alert("DH選手が見つかりません"); return; }

        // パターン別バリデーション
        if (dhPattern === "pat1" && !currentPitcherName) { alert("投手が設定されていません"); return; }
        if (dhPattern === "pat2" && !dhNewPos) { alert("DHが就く守備位置を選択してください"); return; }
        if (dhPattern === "pat2" && !dhFielderOut) { alert("退く選手を選択してください"); return; }
        if (dhPattern === "pat3" && !dhNewPos) { alert("守備位置を選択してください"); return; }
        if (dhPattern === "pat3" && !dhFielderOut) { alert("退く選手を選択してください"); return; }
        if (dhPattern === "pat3" && !newPitcher) { alert("新しい投手を選択してください"); return; }
        if (dhPattern === "pat4" && !dhPinchHitter) { alert("代打選手を選択してください"); return; }
        if (dhPattern === "pat4" && !dhPinchPos) { alert("守備位置を選択してください"); return; }
        if (dhPattern === "pat4" && !dhPinchFielderOut) { alert("退く選手を選択してください"); return; }

        // DHの情報
        const dhName = allyDHPlayer.name;
        const dhOrder = allyDHPlayer.order;

        // パターン別に cancelInfo と追加交代レコードを構築
        let cancelInfo: DHCancel;
        const extraSubs: any[] = []; // DH解除に伴う追加交代

        if (dhPattern === "pat1") {
          // 投手がDHの打順を引き継ぐ
          cancelInfo = { inning, half, pitcherName: currentPitcherName, dhName, dhOrder };

        } else if (dhPattern === "pat2") {
          // DHが守備につく。投手は打順外のまま。
          // 「誰がDHの打順を引き継ぐか」→DHが守備につく＝DHがそのポジションの打順を引き継ぐ
          // rebuildBattingOrderState では pitcherName が空の場合は投手差し込みをスキップ
          cancelInfo = { inning, half, pitcherName: "", dhName, dhOrder };
          // DHの守備変更記録
          extraSubs.push({ type: "守備変更", out: dhName, oldPos: "DH", newPos: dhNewPos, inning, half });
          // 既存守備選手を退かせる（任意）
          if (dhFielderOut) {
            extraSubs.push({ type: "交代", out: dhFielderOut, in: dhName, pos: dhNewPos, inning, half });
          }

        } else if (dhPattern === "pat3") {
          // DHが守備につく＋投手交代
          cancelInfo = { inning, half, pitcherName: newPitcher, dhName, dhOrder };
          // DHの守備変更
          extraSubs.push({ type: "守備変更", out: dhName, oldPos: "DH", newPos: dhNewPos, inning, half });
          if (dhFielderOut) {
            extraSubs.push({ type: "交代", out: dhFielderOut, in: dhName, pos: dhNewPos, inning, half });
          }
          // 投手交代
          extraSubs.push({ type: "交代", out: currentPitcherName, in: newPitcher, pos: "投", inning, half });

        } else {
          // pat4: DHへの代打がそのまま守備につく
          cancelInfo = { inning, half, pitcherName: "", dhName, dhOrder };
          // 代打→守備
          extraSubs.push({ type: "代打", out: dhName, in: dhPinchHitter, inning, half });
          extraSubs.push({ type: "守備変更", out: dhPinchHitter, oldPos: "代打", newPos: dhPinchPos, inning, half });
          if (dhPinchFielderOut) {
            extraSubs.push({ type: "交代", out: dhPinchFielderOut, in: dhPinchHitter, pos: dhPinchPos, inning, half });
          }
        }

        // extraSubs を subs に追加し onAdd で記録にも反映
        if (extraSubs.length > 0) {
          setSubs((prev: any) => [...prev, ...extraSubs]);
          extraSubs.forEach((s: any) => onAdd(s));
        }

        onDHCancel("ally", cancelInfo, inning, half);

      } else {
        // 相手チームDH解除
        onDHCancel("enemy", { inning, half, pitcherName: "", dhName: "", dhOrder: 0 }, inning, half);
      }
      // フィールドリセット
      setDhNewPos(""); setDhFielderOut(""); setNewPitcher("");
      setDhPinchHitter(""); setDhPinchPos(""); setDhPinchFielderOut("");
      return;
    }

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
    } else if (type === "代走") {
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

  // DH解除：守備位置選択肢（DHが就ける位置＝投手以外の野手ポジション）
  const fielderPosList = ["捕","一","二","三","遊","左","中","右"];

  return (
    <div className="mt-4 p-2 border rounded">
      <h3 className="font-semibold mb-2">交代・守備変更・代打・代走・DH解除</h3>
      <div className="flex flex-wrap gap-2 mb-2">
        <select value={type} onChange={(e) => setType(e.target.value)} className="p-1 border rounded">
          <option>交代</option>
          <option>守備変更</option>
          <option>代打</option>
          <option>代走</option>
          {(canCancelAllyDH || canCancelEnemyDH) && <option>DH解除</option>}
        </select>

        {type === "代走" ? (
          <>
            <select value={out} onChange={(e) => setOut(e.target.value)} className="p-1 border rounded">
              <option value="">退く選手（走者）</option>
              {FielderNow.map((n: string) => <option key={n}>{n}</option>)}
            </select>
            <select value={inn} onChange={(e) => setInn(e.target.value)} className="p-1 border rounded">
              <option value="">入る選手（代走）</option>
              {benchPlayers.map((n: string) => <option key={n}>{n}</option>)}
            </select>
          </>
        ) : type === "DH解除" ? (
          <div className="flex flex-col gap-2 w-full">

            {/* 自チーム／相手チーム切替 */}
            {canCancelAllyDH && canCancelEnemyDH && (
              <div className="flex gap-2">
                <button onClick={() => setDhSide("ally")}
                  className={`px-3 py-1 rounded border text-sm ${dhSide === "ally" ? "bg-blue-600 text-white" : ""}`}>
                  自チームDH解除
                </button>
                <button onClick={() => setDhSide("enemy")}
                  className={`px-3 py-1 rounded border text-sm ${dhSide === "enemy" ? "bg-green-600 text-white" : ""}`}>
                  相手チームDH解除
                </button>
              </div>
            )}

            {dhSide === "ally" && allyDHPlayer ? (
              <>
                {/* パターン選択 */}
                <div className="text-sm font-medium text-gray-700">解除パターンを選択</div>
                <div className="flex flex-col gap-1">
                  {[
                    { val: "pat1", label: `①投手（${currentPitcherName || "未設定"}）がDHの打順を引き継ぐ` },
                    { val: "pat2", label: `②DHの${allyDHPlayer.name}が守備につく（投手はそのまま）` },
                    { val: "pat3", label: `③DHの${allyDHPlayer.name}が守備につく＋同時に投手交代` },
                    { val: "pat4", label: `④DHの${allyDHPlayer.name}に代打を送り、そのまま守備につく` },
                  ].map(({ val, label }) => (
                    <label key={val} className="flex items-start gap-2 text-sm cursor-pointer">
                      <input type="radio" name="dhPattern" value={val}
                        checked={dhPattern === val}
                        onChange={() => setDhPattern(val as any)}
                        className="mt-0.5"
                      />
                      {label}
                    </label>
                  ))}
                </div>

                {/* パターン別の追加入力 */}
                {dhPattern === "pat2" && (
                  <div className="flex flex-col gap-2 pl-2 border-l-2 border-yellow-300">
                    <div className="flex gap-2 items-center text-sm">
                      <span className="w-32">{allyDHPlayer.name}の守備位置</span>
                      <select value={dhNewPos} onChange={(e) => setDhNewPos(e.target.value)} className="p-1 border rounded">
                        <option value="">選択</option>
                        {fielderPosList.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 items-center text-sm">
                      <span className="w-32 text-red-600 font-medium">退く選手（必須）</span>
                      <select value={dhFielderOut} onChange={(e) => setDhFielderOut(e.target.value)} className={`p-1 border rounded ${!dhFielderOut ? "border-red-400" : ""}`}>
                        <option value="">選択してください</option>
                        {FielderNow.filter((n: string) => n !== allyDHPlayer.name).map((n: string) => <option key={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {dhPattern === "pat3" && (
                  <div className="flex flex-col gap-2 pl-2 border-l-2 border-yellow-300">
                    <div className="flex gap-2 items-center text-sm">
                      <span className="w-32">{allyDHPlayer.name}の守備位置</span>
                      <select value={dhNewPos} onChange={(e) => setDhNewPos(e.target.value)} className="p-1 border rounded">
                        <option value="">選択</option>
                        {fielderPosList.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 items-center text-sm">
                      <span className="w-32 text-red-600 font-medium">退く選手（必須）</span>
                      <select value={dhFielderOut} onChange={(e) => setDhFielderOut(e.target.value)} className={`p-1 border rounded ${!dhFielderOut ? "border-red-400" : ""}`}>
                        <option value="">選択してください</option>
                        {FielderNow.filter((n: string) => n !== allyDHPlayer.name).map((n: string) => <option key={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 items-center text-sm">
                      <span className="w-32">新しい投手</span>
                      <select value={newPitcher} onChange={(e) => setNewPitcher(e.target.value)} className="p-1 border rounded">
                        <option value="">選択</option>
                        {benchPlayers.map((n: string) => <option key={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {dhPattern === "pat4" && (
                  <div className="flex flex-col gap-2 pl-2 border-l-2 border-yellow-300">
                    <div className="flex gap-2 items-center text-sm">
                      <span className="w-32">代打選手</span>
                      <select value={dhPinchHitter} onChange={(e) => setDhPinchHitter(e.target.value)} className="p-1 border rounded">
                        <option value="">選択</option>
                        {benchPlayers.map((n: string) => <option key={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 items-center text-sm">
                      <span className="w-32">就く守備位置</span>
                      <select value={dhPinchPos} onChange={(e) => setDhPinchPos(e.target.value)} className="p-1 border rounded">
                        <option value="">選択</option>
                        {fielderPosList.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 items-center text-sm">
                      <span className="w-32 text-red-600 font-medium">退く選手（必須）</span>
                      <select value={dhPinchFielderOut} onChange={(e) => setDhPinchFielderOut(e.target.value)} className={`p-1 border rounded ${!dhPinchFielderOut ? "border-red-400" : ""}`}>
                        <option value="">選択してください</option>
                        {FielderNow.filter((n: string) => n !== allyDHPlayer.name).map((n: string) => <option key={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* 確認サマリー */}
                <div className="text-sm text-gray-600 p-2 bg-yellow-50 rounded border">
                  {getDHPatternSummary()}
                </div>
              </>
            ) : dhSide === "ally" && !allyDHPlayer ? (
              <div className="text-sm text-red-600 p-2 bg-red-50 rounded border">
                DH選手が見つかりません。先発メンバーにDHが設定されているか確認してください。
              </div>
            ) : (
              <div className="text-sm text-gray-600 p-2 bg-yellow-50 rounded border">
                相手チームのDH制を解除します。
              </div>
            )}
          </div>
        ) : type === "交代" ? (
          <>
            <select value={out} onChange={(e) => setOut(e.target.value)} className="p-1 border rounded">
              <option value="">退く選手</option>
              {FielderNow.map((n: string) => <option key={n}>{n}</option>)}
            </select>
            <select value={inn} onChange={(e) => setInn(e.target.value)} className="p-1 border rounded">
              <option value="">入る選手</option>
              {benchPlayers.map((n: string) => <option key={n}>{n}</option>)}
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
              {benchPlayers.map((n: string) => <option key={n}>{n}</option>)}
            </select>
          </>
        ) : (
          <>
            <select value={out} onChange={(e) => setOut(e.target.value)} className="p-1 border rounded">
              <option value="">選手</option>
              {FielderNow.map((n: string) => <option key={n}>{n}</option>)}
            </select>
            <select value={oldPos} onChange={(e) => setOldPos(e.target.value)} className="p-1 border rounded">
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
        <select
          value={inning}
          onChange={(e) => setInning(parseInt(e.target.value, 10))}
          className="w-20 p-1 border rounded"
        >
          <optgroup label="通常">
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}回</option>
            ))}
          </optgroup>
          <optgroup label="延長">
            {Array.from({ length: 11 }, (_, i) => i + 10).map((n) => (
              <option key={n} value={n}>{n}回</option>
            ))}
          </optgroup>
        </select>
        <select value={half} onChange={(e) => setHalf(e.target.value)} className="p-1 border rounded">
          <option>表</option>
          <option>裏</option>
        </select>
        <button
          onClick={handleAdd}
          disabled={(() => {
            if (type !== "DH解除" || dhSide !== "ally" || !allyDHPlayer) return false;
            if (dhPattern === "pat1") return !currentPitcherName;
            if (dhPattern === "pat2") return !dhNewPos || !dhFielderOut;
            if (dhPattern === "pat3") return !dhNewPos || !dhFielderOut || !newPitcher;
            if (dhPattern === "pat4") return !dhPinchHitter || !dhPinchPos || !dhPinchFielderOut;
            return false;
          })()}
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >追加</button>
      </div>
    </div>
  );
}

// ===== AtBatForm =====
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
  onThreeOut,
  allyDH,
  dhCancelAlly,
}: any) {
  const [freeText, setFreeText] = useState("");
  const [bases, setBases] = useState("なし");
  const [selectedOuts, setSelectedOuts] = useState(currentOuts);
  const [extraPlay, setExtraPlay] = useState("");
  const [direction, setDirection] = useState("");
  const [outcome, setOutcome] = useState("");
  const battingNowIsAlly = (homeBatting && currentHalf === "裏") || (!homeBatting && currentHalf === "表");

  // DH制でも打順は常に9人
  const allyMaxOrder = 9;

  const baseTiles = ["なし", "1塁", "2塁", "3塁", "1、2塁", "1、3塁", "2、3塁", "満塁"];
  const extraOptions = ["", "盗塁成功", "盗塁失敗", "ワイルドピッチ", "パスボール", "送球ミス", "ボーク"];
  const [fA, setfA] = useState(false);
  const [fU, setfU] = useState(false);

  useEffect(() => { setSelectedOuts(currentOuts); }, [currentInning, currentHalf, currentOuts]);

  function flash(fn: () => void, setFlash: any) {
    setFlash(true);
    fn();
    setTimeout(() => setFlash(false), 150);
  }

  function handleAppend() {
    const batters = currentBatters();
    const name = battingNowIsAlly
      ? (batters[(allyOrder - 1) % allyMaxOrder]?.name || lineup[(allyOrder - 1) % allyMaxOrder]?.name || "打者")
      : "";
    const text = extraPlay ? extraPlay : ((direction || "") + (outcome || "")) + (freeText ? ` ${freeText}` : "");
    const outsToUse = Number(selectedOuts) || 0;

    let line = `${text}　${outsToUse}死`;
    if (outsToUse === 3) {
      line = line.replace(/3死$/, "");
      line += "チェンジ";
    } else {
      line += bases === "なし" ? "" : ` ${bases}`;
    }

    const idx = Math.max(1, Math.min(currentInning, 20)) - 1;
    const deltaOuts = Math.max(0, outsToUse - currentOuts);
    const advancedOrder = !extraPlay;
    onAppend(idx, currentHalf, {
      line,
      deltaOuts,
      advancedOrder,
      batterName: battingNowIsAlly ? `${allyOrder}.${name}` : `${eOrder}.`
    });

    if (!extraPlay) {
      if (battingNowIsAlly) {
        setAllyOrder((prev: number) => (prev % allyMaxOrder) + 1);
      } else {
        seteOrder((prev: number) => (prev % 9) + 1);
      }
    }

    if (outsToUse === 3) {
      onThreeOut?.();
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

  // 現在の打者名表示
  const batters = currentBatters();
  const currentBatterName = battingNowIsAlly
    ? (batters[(allyOrder - 1) % allyMaxOrder]?.name || lineup[(allyOrder - 1) % allyMaxOrder]?.name || "打者")
    : "";

  return (
    <div className="rounded-lg border p-3 bg-slate-50">
      <div className="flex gap-2 mb-2">
        <input
          value={ft}
          onChange={(e) => setFt(e.target.value)}
          placeholder="自由記載（例：相手投手右投げ遅め）"
          className="flex-1 p-2 border rounded"
        />
        <button onClick={addNote} className="px-2 py-1 bg-green-600 text-white rounded">
          追加
        </button>
      </div>

      <div className="mb-2 font-bold">
        現在：{currentInning}回{currentHalf} | {battingNowIsAlly ? (
          <>八王子 {allyOrder}番 {currentBatterName}</>
        ) : (
          <>相手 {eOrder}番打者</>
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
            {Array.from({ length: allyMaxOrder }, (_, i) => i + 1).map((n) => (
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
          <span className="text-gray-500">（{currentBatterName}）</span>
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
          <option value="送りバント">送りバント</option>
          <option value="スクイズ">スクイズ</option>
          <option value="セーフティスクイズ">セーフティスクイズ</option>
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

      <button
        onClick={() => flash(handleAppend, setfA)}
        className={`w-full px-3 py-2 rounded text-white ${fA ? "bg-yellow-400" : "bg-blue-600"}`}
      >
        ＋ このプレイを {currentInning}回{currentHalf} に追加
      </button>
      <button
        onClick={() => flash(onUndo, setfU)}
        className={`w-full px-3 py-2 rounded text-white mt-2 ${fU ? "bg-yellow-400" : "bg-red-600"}`}
      >
        1プレイ戻す
      </button>
    </div>
  );
}

// ===== メインコンポーネント =====
export default function BaseballReportApp() {
  const scoreboardRef = useRef<HTMLDivElement | null>(null);
  const scrollToScoreboard = () => {
    setTimeout(() => {
      scoreboardRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  };

  const [players, setPlayers] = useState<string[]>(() => {
    const saved = localStorage.getItem('baseballReportData');
    if (saved) return JSON.parse(saved).players || DEFAULT_PLAYERS;
    return DEFAULT_PLAYERS;
  });
  const [playersText, setPlayersText] = useState(() => players.join("\n"));
  const [showPlayersEditor, setShowPlayersEditor] = useState(false);
  const playerList = players;

  // ===== DH解除情報 =====
  const [dhCancelAlly, setDhCancelAlly] = useState<DHCancel | null>(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).dhCancelAlly || null : null;
  });
  const [dhCancelEnemy, setDhCancelEnemy] = useState<DHCancel | null>(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).dhCancelEnemy || null : null;
  });

  // DH解除を反映した「現在の打順」を返す（lineup 自体は変えない）
  // - DH制中（dhCancel=null）：lineupの9人がそのまま打順（DHを含む、投手なし）
  // - DH解除後（dhCancel あり）：lineupからDH選手を除き、投手をそのorderで差し込んで9人に
  // - 非DH制：lineupの9人をそのまま返す
  function rebuildBattingOrderState(
    lineup: LineupEntry[],
    subs: any[],
    dhCancel: DHCancel | null,
    pitcherEntry: PitcherEntry,
    isAllyDH: boolean
  ): LineupEntry[] {
    let state = lineup.map((p) => ({ ...p }));

    // 交代・代打・代走・守備変更を反映
    subs.forEach((s: any) => {
      if (s.type === "交代" || s.type === "代打" || s.type === "代走") {
        state = state.map((l) =>
          l.name === s.out ? { ...l, name: s.in, pos: s.pos ?? l.pos } : l
        );
      } else if (s.type === "守備変更") {
        state = state.map((l) =>
          l.name === s.out ? { ...l, pos: s.newPos } : l
        );
      }
    });

    if (isAllyDH && dhCancel) {
      // DH解除：DHを打順から除く
      state = state.filter((l) => l.name !== dhCancel.dhName);

      // pitcherName が設定されている場合のみ投手をDHのorderで差し込む（pat1/pat3）
      // pat2/pat4 では pitcherName が空 → DHが守備についているため投手は差し込まない
      if (dhCancel.pitcherName) {
        const currentPitcherName = (() => {
          let name = dhCancel.pitcherName;
          subs.forEach((s: any) => {
            if (s.type === "交代" && s.out === name) name = s.in;
          });
          return name;
        })();
        if (currentPitcherName) {
          state.push({ order: dhCancel.dhOrder, name: currentPitcherName, pos: "投" });
        }
      }
      state.sort((a, b) => a.order - b.order);
    }

    return state;
  }

  const [gameInfo, setGameInfo] = useState<GameInfo>(() => {
    const saved = localStorage.getItem('baseballReportData');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        title: '25練習試合', away: '相手', home: '八王子',
        date: '2025/5/4(日)', place: '八王子リトルシニアグラウンド',
        weather: '晴', startHour: '10', startMin: '00',
        endHour: '12', endMin: '00', homeBatting: true,
        allyDH: false, enemyDH: false,
        ...parsed.gameInfo
      };
    }
    return {
      title: '25練習試合', away: '相手', home: '八王子',
      date: '2025/5/4(日)', place: '八王子リトルシニアグラウンド',
      weather: '晴', startHour: '10', startMin: '00',
      endHour: '12', endMin: '00', homeBatting: true,
      allyDH: false, enemyDH: false,
    };
  });

  const [innings, setInnings] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).innings || Array.from({ length: 7 }, makeInning) : Array.from({ length: 7 }, makeInning);
  });

  // lineup: 常に9行（DH制でも投手は別枠）
  const [lineup, setLineup] = useState<LineupEntry[]>(() => {
    const saved = localStorage.getItem('baseballReportData');
    if (saved) {
      const parsed = JSON.parse(saved);
      // 旧データが10行の場合はDH行（pos=DH固定の10番目）を除いて9行に正規化
      const lu: LineupEntry[] = parsed.lineup ?? Array.from({ length: 9 }, (_, i) => ({ order: i + 1, name: '', pos: '' }));
      return lu.filter((_: LineupEntry, i: number) => i < 9);
    }
    return Array.from({ length: 9 }, (_, i) => ({ order: i + 1, name: '', pos: '' }));
  });

  // 投手（別枠、打順に入らない）
  const [allyPitcher, setAllyPitcher] = useState<PitcherEntry>(() => {
    const saved = localStorage.getItem('baseballReportData');
    if (saved) {
      const parsed = JSON.parse(saved);
      // 旧データ互換：lineup内にpos=投がいれば移行
      if (parsed.allyPitcher) return parsed.allyPitcher;
      const pitcherInLineup = (parsed.lineup || []).find((l: LineupEntry) => l.pos === "投");
      if (pitcherInLineup) return { name: pitcherInLineup.name };
    }
    return { name: '' };
  });

  const [subs, setSubs] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).subs || [] : [];
  });

  function currentBatters() {
    return rebuildBattingOrderState(lineup, subs, dhCancelAlly, allyPitcher, gameInfo.allyDH);
  }

  const [records, setRecords] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).records || Array.from({ length: 7 }, () => ({ top: [], bottom: [] })) : Array.from({ length: 7 }, () => ({ top: [], bottom: [] }));
  });

  const [reportText, setReportText] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).reportText || '' : '';
  });

  // DH制でも打順は常に9人
  const allyMaxOrder = 9;

  const [allyOrder, setAllyOrder] = useState(() => {
    const saved = localStorage.getItem('baseballReportData');
    return saved ? JSON.parse(saved).allyOrder ?? 1 : 1;
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

  // DH設定が変わっても lineup は9行のまま変えない（投手は別枠）

  // DH解除ハンドラ
  function handleDHCancel(side: "ally" | "enemy", cancelInfo: DHCancel, inning: number, half: string) {
    if (side === "ally") {
      setDhCancelAlly(cancelInfo);
      // lineup は変更しない（スタメン表示はそのまま維持し、レポートに変更内容を追記）
      const idx = inning - 1;
      const rec: PlayRecord = {
        line: `DH解除：${cancelInfo.pitcherName}が${cancelInfo.dhOrder}番打者（${cancelInfo.dhName}）の打順を引き継ぎ`,
        deltaOuts: 0,
        advancedOrder: false,
        batterName: ""
      };
      setRecords((prev: any) => {
        const copy = [...prev];
        if (half === '表') copy[idx].top.push(rec);
        else copy[idx].bottom.push(rec);
        return copy;
      });
    } else {
      setDhCancelEnemy({ inning, half, pitcherName: "", dhName: "", dhOrder: 0 });
      const idx = inning - 1;
      const rec: PlayRecord = {
        line: `相手チームDH解除`,
        deltaOuts: 0,
        advancedOrder: false,
        batterName: ""
      };
      setRecords((prev: any) => {
        const copy = [...prev];
        if (half === '表') copy[idx].top.push(rec);
        else copy[idx].bottom.push(rec);
        return copy;
      });
    }
  }

  function formatPlays(list: PlayRecord[], isAllyBatting: boolean) {
    let out = "";
    let a = 0;
    list.forEach((r) => {
      const isAtBat = r.advancedOrder;
      const play = r.line;
      let indent = "";
      if (isAllyBatting) {
        const firstIndent = r.batterName ? r.batterName + "　" : "";
        const contIndent = firstIndent ? "　".repeat(firstIndent.length - 1) : "";
        indent = a === 0 ? firstIndent : contIndent;
      } else {
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

  function generateReport(
    gInfo: GameInfo,
    inn: any[],
    lu: LineupEntry[],
    sb: any[],
    rec: any[],
    dhCancelA: DHCancel | null,
    dhCancelE: DHCancel | null,
    pitcherEntry: PitcherEntry
  ) {
    const totalAway = inn.reduce((a: number, b: any) => a + Number(b.away || 0), 0);
    const totalHome = inn.reduce((a: number, b: any) => a + Number(b.home || 0), 0);

    let out = `${gInfo.title}　${gInfo.home}vs${gInfo.away}\n`;
    out += `◆日付　${gInfo.date}\n`;
    out += `◆場所　${gInfo.place}\n`;
    out += `◆天候　${gInfo.weather}\n`;
    out += `◆試合開始時刻 ${gInfo.startHour}時${gInfo.startMin}分開始\n`;
    out += `◆試合終了時刻 ${gInfo.endHour}時${gInfo.endMin}分終了\n`;
    out += ` ※${gInfo.home}　${gInfo.homeBatting ? "後攻" : "先攻"}`;
    // DH表記
    const dhNotes: string[] = [];
    if (gInfo.allyDH) dhNotes.push(`${gInfo.home}DH制`);
    if (gInfo.enemyDH) dhNotes.push(`${gInfo.away}DH制`);
    if (dhNotes.length) out += `　（${dhNotes.join("・")}）`;
    out += `\n\n`;

    out += ` 　  　　　/1234567/計\n`;
    if (gInfo.homeBatting) {
      out += ` 【${gInfo.away}】/${inn.map((i: any) => i.away || "").join("")}/${totalAway}\n`;
      out += ` 【${gInfo.home}】/${inn.map((i: any) => i.home || "").join("")}/${totalHome}\n\n`;
    } else {
      out += ` 【${gInfo.home}】/${inn.map((i: any) => i.home || "").join("")}/${totalHome}\n`;
      out += ` 【${gInfo.away}】/${inn.map((i: any) => i.away || "").join("")}/${totalAway}\n\n`;
    }

    out += `【先発メンバー】\n`;

    // 非DH制：lineup の9人（投手含む）をそのまま表示
    // DH制：lineup の9人（DHを含む野手＋DH、投手なし）を表示し、投手を別行で追加
    lu.forEach((p) => {
      if (!p.name) return;
      let line = `${p.order}.${p.name}${p.pos ? `(${p.pos})` : ""}`;
      let NameNow = p.name;
      sb.forEach((s: any) => {
        if (s.type === "交代" && s.out === NameNow) {
          line += `→${s.inning}回${s.half} ${s.in}(${s.pos})`;
          NameNow = s.in;
        } else if (s.type === "代打" && s.out === NameNow) {
          line += `→${s.inning}回${s.half} ${s.in}(代打)`;
          NameNow = s.in;
        } else if (s.type === "代走" && s.out === NameNow) {
          line += `→${s.inning}回${s.half} ${s.in}(代走)`;
          NameNow = s.in;
        } else if (s.type === "守備変更" && s.out === NameNow) {
          line += `→${s.inning}回${s.half}(${s.newPos})`;
        }
      });
      // DH解除の記録（DHだった選手）
      if (dhCancelA && p.pos === "DH" && p.name === dhCancelA.dhName) {
        if (dhCancelA.pitcherName) {
          // pat1/pat3：投手が打順引継
          line += `→${dhCancelA.inning}回${dhCancelA.half} DH解除（${dhCancelA.pitcherName}が${dhCancelA.dhOrder}番打順引継）`;
        } else {
          // pat2/pat4：DHが守備につく
          line += `→${dhCancelA.inning}回${dhCancelA.half} DH解除（守備につく）`;
        }
      }
      out += line + "\n";
    });

    // DH制時：投手を別枠で追加表示
    if (gInfo.allyDH && pitcherEntry.name) {
      let pitcherLine = `P.${pitcherEntry.name}(投)`;
      let pitcherNameNow = pitcherEntry.name;
      sb.forEach((s: any) => {
        if (s.type === "交代" && s.out === pitcherNameNow) {
          pitcherLine += `→${s.inning}回${s.half} ${s.in}(${s.pos})`;
          pitcherNameNow = s.in;
        }
      });
      if (dhCancelA && pitcherEntry.name === dhCancelA.pitcherName && dhCancelA.pitcherName) {
        pitcherLine += `→${dhCancelA.inning}回${dhCancelA.half} ${dhCancelA.dhOrder}番打者兼任`;
      }
      out += pitcherLine + "\n";
    }

    out += `\n`;
    // DH制時は pitcherEntry から、非DH制時は lineup から投手を探す
    const starterName = gInfo.allyDH
      ? (pitcherEntry.name || "（未入力）")
      : (lu.find((p) => p.pos === "投")?.name || "（未入力）");
    out += `※八王子先発　${starterName}\n\n`;

    rec.forEach((innRec: any, i: number) => {
      const n = i + 1;
      const weAreHome = gInfo.homeBatting;
      const homeTeamPitchers = inn[i].homePitchers;
      const awayTeamPitchers = inn[i].awayPitchers;
      if (innRec.top.length) {
        out += `●${n}回表\n`;
        out += formatPlays(innRec.top, !weAreHome);
        const runsTop = gInfo.homeBatting ? inn[i].away : inn[i].home;
        if (runsTop !== "") {
          out += `この回${runsTop}${gInfo.homeBatting ? "失点" : "得点"}\n`;
        }
        const pitchersTop = weAreHome ? awayTeamPitchers : homeTeamPitchers;
        out += renderPitchers(pitchersTop, !weAreHome);
        out += `\n`;
      }
      if (innRec.bottom.length) {
        out += `●${n}回裏\n`;
        out += formatPlays(innRec.bottom, weAreHome);
        const runsBottom = gInfo.homeBatting ? inn[i].home : inn[i].away;
        if (runsBottom !== "") {
          out += `この回${runsBottom}${gInfo.homeBatting ? "得点" : "失点"}\n`;
        }
        const pitchersBottom = weAreHome ? homeTeamPitchers : awayTeamPitchers;
        out += renderPitchers(pitchersBottom, weAreHome);
        out += `\n`;
      }
    });

    return out;
  }

  useEffect(() => {
    setReportText(generateReport(gameInfo, innings, lineup, subs, records, dhCancelAlly, dhCancelEnemy, allyPitcher));
  }, [gameInfo, innings, lineup, subs, records, dhCancelAlly, dhCancelEnemy, allyPitcher]);

  function handleUndo() {
    const idx = Math.max(1, Math.min(currentInning, 20)) - 1;
    const copy = [...records];
    const bucket = currentHalf === "表" ? copy[idx].top : copy[idx].bottom;

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
          const allyWasBatting =
            (gameInfo.homeBatting && poppedHalf === "裏") ||
            (!gameInfo.homeBatting && poppedHalf === "表");
          if (allyWasBatting) {
            setAllyOrder((prev: number) => (prev === 1 ? allyMaxOrder : prev - 1));
          } else {
            seteOrder((prev: number) => (prev === 1 ? 9 : prev - 1));
          }
        }
      }
      return;
    }

    const last = bucket.pop() as PlayRecord;
    setRecords(copy);

    if (last.advancedOrder) {
      const battingNowIsAlly =
        (gameInfo.homeBatting && currentHalf === "裏") ||
        (!gameInfo.homeBatting && currentHalf === "表");
      if (battingNowIsAlly) {
        setAllyOrder((prev: number) => (prev === 1 ? allyMaxOrder : prev - 1));
      } else {
        seteOrder((prev: number) => (prev === 1 ? 9 : prev - 1));
      }
    }
    if (last.deltaOuts > 0) {
      setCurrentOuts((prev: number) => Math.max(0, prev - last.deltaOuts));
    }
  }

  // localStorage 保存
  useEffect(() => {
    localStorage.setItem('baseballReportData', JSON.stringify({
      gameInfo, innings, lineup, subs, records, players,
      allyOrder, eOrder, currentInning, currentHalf, currentOuts,
      reportText, dhCancelAlly, dhCancelEnemy, allyPitcher
    }));
  }, [gameInfo, innings, lineup, subs, records, players, allyOrder, eOrder, currentInning, currentHalf, currentOuts, reportText, dhCancelAlly, dhCancelEnemy]);

  // 初回ロード
  useEffect(() => {
    const saved = localStorage.getItem('baseballReportData');
    if (saved) {
      const data = JSON.parse(saved);
      setGameInfo({ ...gameInfo, ...data.gameInfo });
      setInnings(data.innings || innings);
      setLineup((data.lineup || lineup).filter((_: LineupEntry, i: number) => i < 9));
      setSubs(data.subs || []);
      setRecords(data.records || records);
      setPlayers(data.players || DEFAULT_PLAYERS);
      setAllyOrder(data.allyOrder || 1);
      seteOrder(data.eOrder || 1);
      setCurrentInning(data.currentInning || 1);
      setCurrentHalf(data.currentHalf || '表');
      setCurrentOuts(data.currentOuts || 0);
      setReportText(data.reportText || "");
      setDhCancelAlly(data.dhCancelAlly || null);
      setDhCancelEnemy(data.dhCancelEnemy || null);
      if (data.allyPitcher) setAllyPitcher(data.allyPitcher);
      else {
        // 旧データ互換：lineup内にpos=投がいれば移行
        const p = (data.lineup || []).find((l: LineupEntry) => l.pos === "投");
        if (p) setAllyPitcher({ name: p.name });
      }
    }
  }, []);

  useEffect(() => {
    setPlayersText(players.join("\n"));
  }, [players]);

  // lineup は常に9行

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="max-w-6xl mx-auto grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-6 items-stretch landscape:[&>*:first-child]:order-2 landscape:[&>*:last-child]:order-1 md:[&>*:first-child]:order-2 md:[&>*:last-child]:order-1">
        <div className="bg-white p-4 rounded-xl shadow overflow-y-auto landscape:h-screen landscape:max-h-screen">
          <h1 className="text-xl font-bold mb-3">試合情報入力</h1>

          <h2 className="text-lg font-semibold mb-2">基本情報</h2>
          {Object.entries({
            title: "試合名",
            home: "自チーム",
            away: "相手チーム",
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

          {/* ===== DH設定 ===== */}
          <div className="mb-3 border rounded p-3 bg-yellow-50">
            <div className="font-semibold text-sm mb-2">DH（指名打者）設定</div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={gameInfo.allyDH}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setGameInfo({ ...gameInfo, allyDH: val });
                    if (!val) {
                      // DH解除フラグもリセット
                      setDhCancelAlly(null);
                    }
                  }}
                />
                {gameInfo.home}（自チーム）DHあり
                {gameInfo.allyDH && dhCancelAlly && (
                  <span className="ml-2 text-xs text-red-600 font-medium">
                    ※{dhCancelAlly.inning}回{dhCancelAlly.half}に解除済み
                  </span>
                )}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={gameInfo.enemyDH}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setGameInfo({ ...gameInfo, enemyDH: val });
                    if (!val) {
                      setDhCancelEnemy(null);
                    }
                  }}
                />
                {gameInfo.away}（相手チーム）DHあり
                {gameInfo.enemyDH && dhCancelEnemy && (
                  <span className="ml-2 text-xs text-red-600 font-medium">
                    ※{dhCancelEnemy.inning}回{dhCancelEnemy.half}に解除済み
                  </span>
                )}
              </label>
            </div>
          </div>

          <div className="mb-3 border rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold text-sm">選手名リスト（1行=1人）</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPlayersEditor(v => !v)}
                  className="px-2 py-0.5 text-xs bg-blue-100 rounded"
                >
                  {showPlayersEditor ? "閉じる" : "編集"}
                </button>
                <button
                  onClick={() => setPlayers(DEFAULT_PLAYERS)}
                  className="px-2 py-0.5 text-xs bg-gray-200 rounded"
                >25メンバーに戻す</button>
              </div>
            </div>
            {showPlayersEditor && (
              <textarea
                value={playersText}
                onChange={(e) => setPlayersText(e.target.value)}
                onBlur={() => setPlayers(playersText.split(/\r?\n/).map(s => s.trim()).filter(Boolean))}
                className="w-full border rounded p-2 text-sm h-28"
              />
            )}
          </div>

          <h2 className="text-lg font-semibold mb-2">
            先発メンバー入力
            {gameInfo.allyDH && !dhCancelAlly && (
              <span className="ml-2 text-sm text-yellow-600 font-medium">（DH制）</span>
            )}
          </h2>

          {/* DH制時：投手を別枠で表示（打順の外） */}
          {gameInfo.allyDH && (
            <div className="flex gap-2 mb-3 items-center bg-blue-50 px-2 py-1 rounded border border-blue-200">
              <span className="text-sm font-medium text-blue-700 w-12">P（投手）</span>
              <select
                value={allyPitcher.name}
                onChange={(e) => setAllyPitcher({ name: e.target.value })}
                className="p-1 border rounded flex-1"
              >
                <option value="">選手</option>
                {playerList
                  .filter((n: string) =>
                    !lineup.map((l: LineupEntry) => l.name).includes(n) || n === allyPitcher.name
                  )
                  .map((n: string) => <option key={n}>{n}</option>)}
              </select>
              <span className="text-xs text-blue-600 w-20 text-center">投（打順外）</span>
            </div>
          )}

          {/* 打順1〜9（常に9行） */}
          {Array.from({ length: 9 }, (_, idx) => {
            const p = lineup[idx] || { order: idx + 1, name: '', pos: '' };
            // DH制時は投手を除いた選手のみ使用済みとする
            const usedNames = [
              ...lineup.map((l: LineupEntry) => l.name),
              ...(gameInfo.allyDH ? [allyPitcher.name] : [])
            ].filter(Boolean);
            const usedPos = lineup.map((l: LineupEntry) => l.pos).filter(Boolean);
            // DH制時の守備位置リスト：「投」を除外（投手は別枠）
            const availablePos = gameInfo.allyDH ? FIELDER_POS_LIST : POS_LIST;
            return (
              <div key={idx} className="flex gap-2 mb-2 items-center">
                <span className="w-8 text-sm">{idx + 1}番</span>
                <select
                  value={p.name}
                  onChange={(e) => {
                    const copy = [...lineup];
                    if (!copy[idx]) copy[idx] = { order: idx + 1, name: '', pos: '' };
                    copy[idx].name = e.target.value;
                    setLineup(copy);
                  }}
                  className="p-1 border rounded flex-1"
                >
                  <option value="">選手</option>
                  {playerList
                    .filter((n: string) => !usedNames.includes(n) || n === p.name)
                    .map((n: string) => <option key={n}>{n}</option>)}
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
                  {availablePos
                    .filter((pos) => !usedPos.includes(pos) || pos === p.pos)
                    .map((pos) => <option key={pos}>{pos}</option>)}
                </select>
              </div>
            );
          })}

          <h2 ref={scoreboardRef} className="text-lg font-semibold mb-2">スコアボード & 投球数</h2>
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-2">
            {innings.map((inn: any, idx: number) => {
              return (
                <div key={idx} className="border p-2 rounded inline-block align-top">
                  <div className="mb-1 font-bold">{idx + 1}回</div>
                  {[
                    gameInfo.homeBatting
                      ? { label: "相手の攻撃", team: "away", pitcherSide: "awayPitchers", isOpponent: true, buttonClass: "bg-green-100" }
                      : { label: "八王子の攻撃", team: "home", pitcherSide: "homePitchers", isOpponent: false, buttonClass: "bg-blue-100" },
                    gameInfo.homeBatting
                      ? { label: "八王子の攻撃", team: "home", pitcherSide: "homePitchers", isOpponent: false, buttonClass: "bg-blue-100" }
                      : { label: "相手の攻撃", team: "away", pitcherSide: "awayPitchers", isOpponent: true, buttonClass: "bg-green-100" }
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
                        label={atk.isOpponent ? "八王子投手" : "相手投手"}
                        pitchers={inn[atk.pitcherSide]}
                        setPitchers={(p: any) =>
                          setInnings((prev: any) =>
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

          <SubForm
            playerList={playerList}
            posList={POS_LIST}
            lineup={lineup}
            subs={subs}
            setSubs={setSubs}
            currentInning={currentInning}
            currentHalf={currentHalf}
            currentBatters={currentBatters}
            allyDH={gameInfo.allyDH}
            enemyDH={gameInfo.enemyDH}
            dhCancelAlly={dhCancelAlly}
            dhCancelEnemy={dhCancelEnemy}
            onDHCancel={handleDHCancel}
            homeBatting={gameInfo.homeBatting}
            allyPitcher={allyPitcher}
            onAdd={(s: any) => {
              const idx = s.inning - 1;
              const rec: PlayRecord =
                s.type === "守備変更"
                  ? { line: `${s.type}：${s.out}(${s.oldPos})→(${s.newPos})`, deltaOuts: 0, advancedOrder: false, batterName: "" }
                  : s.type === "代打"
                    ? { line: `${s.out}→${s.in}(代打)`, deltaOuts: 0, advancedOrder: false, batterName: "" }
                    : s.type === "代走"
                      ? { line: `${s.out}→${s.in}(代走)`, deltaOuts: 0, advancedOrder: false, batterName: "" }
                      : { line: `${s.type}：${s.out}→${s.in}(${s.pos})`, deltaOuts: 0, advancedOrder: false, batterName: "" };
              const copy = [...records];
              if (s.half === '表') copy[idx].top.push(rec); else copy[idx].bottom.push(rec);
              setRecords(copy);
            }}
          />

          <div className="mt-4 border p-2 rounded">
            <h3 className="font-semibold mb-2">交代一覧</h3>
            {subs.length === 0 && <div className="text-gray-500 text-sm">（なし）</div>}
            {subs.map((s: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center mb-1 text-sm">
                <span>
                  {s.inning}回{s.half} {s.type}:{s.out}
                  {s.type === '守備変更'
                    ? `(${s.oldPos})→(${s.newPos})`
                    : s.type === '代打'
                      ? `→${s.in}`
                      : s.type === '代走'
                        ? `→${s.in}`
                        : `(${s.pos})→${s.in}(${s.pos})`}
                </span>
                <button
                  onClick={() => {
                    const updated = subs.filter((_: any, i: number) => i !== idx);
                    setSubs(updated);
                    const copy = [...records];
                    copy.forEach((inn: any) => {
                      inn.top = inn.top.filter((r: any) => !r.line.includes(s.out) && !r.line.includes(s.in));
                      inn.bottom = inn.bottom.filter((r: any) => !r.line.includes(s.out) && !r.line.includes(s.in));
                    });
                    setRecords(copy);
                    const saved = JSON.parse(localStorage.getItem("baseballReportData") || "{}");
                    localStorage.setItem("baseballReportData", JSON.stringify({ ...saved, subs: updated, records: copy }));
                  }}
                  className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
                >削除</button>
              </div>
            ))}
          </div>

          <AtBatForm
            lineup={lineup}
            currentBatters={currentBatters}
            allyOrder={allyOrder}
            setAllyOrder={setAllyOrder}
            eOrder={eOrder}
            seteOrder={seteOrder}
            homeBatting={gameInfo.homeBatting}
            onThreeOut={scrollToScoreboard}
            allyDH={gameInfo.allyDH}
            dhCancelAlly={dhCancelAlly}
            onAppend={(i: number, h: "表" | "裏", rec: PlayRecord) => {
              const copy = [...records];
              (h === "表" ? copy[i].top : copy[i].bottom).push(rec);
              setRecords(copy);
              const saved = JSON.parse(localStorage.getItem('baseballReportData') || '{}');
              localStorage.setItem('baseballReportData', JSON.stringify({ ...saved, records: copy }));
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
        <div className="bg-white p-4 rounded-xl shadow flex flex-col landscape:h-screen landscape:max-h-screen">
          <h1 className="text-xl font-bold mb-3">レポート出力</h1>
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            className="whitespace-pre-wrap bg-gray-50 p-3 rounded border w-full overflow-auto min-h-[60vh] landscape:min-h-0 landscape:flex-1"
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
                  const clearedInnings = Array.from({ length: 7 }, makeInning);
                  setRecords(clearedRecords);
                  setInnings(clearedInnings);
                  setSubs([]);
                  setDhCancelAlly(null);
                  setDhCancelEnemy(null);
                  setCurrentInning(1);
                  setCurrentHalf('表');
                  setCurrentOuts(0);
                  setAllyOrder(1);
                  seteOrder(1);
                  const saved = JSON.parse(localStorage.getItem('baseballReportData') || '{}');
                  localStorage.setItem('baseballReportData', JSON.stringify({
                    ...saved,
                    innings: clearedInnings,
                    records: clearedRecords,
                    subs: [],
                    dhCancelAlly: null,
                    dhCancelEnemy: null,
                    currentInning: 1,
                    currentHalf: '表',
                    currentOuts: 0,
                    allyOrder: 1,
                    enemyOrder: 1,
                  }));
                  alert('打席記録・得点・投球数・現在回情報・DH解除情報をすべて初期化しました。');                }
              }
            }}
            className="mt-3 ml-2 px-4 py-2 bg-red-600 text-white rounded"
          >
            🗑 次の試合へ(打席結果全削除）
          </button>
        </div>
      </div>
    </div>
  );
}
