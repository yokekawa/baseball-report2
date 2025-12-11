import React, { useState, useEffect } from "react";

// 投手配列を安全に更新する共通関数
function updateInningPitchers(prevInnings: any[], idx: number, side: "awayPitchers" | "homePitchers", p: any) {
  return prevInnings.map((row, i) => {
    if (i !== idx) return row;
    const base = row[side];
    const cand = typeof p === "function" ? p(base) : p;
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

const renderPitchers = (list: { name: string; pitchThis: string; pitchTotal: string }[], isOpponent: boolean) =>
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

// ===== PitcherInputs =====
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
        <div key={j} className="flex items-center gap-2 mb-1">
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

          <input
            type="number"
            value={p.pitchThis}
            placeholder="球"
            onChange={(e) => updatePitcher(j, "pitchThis", e.target.value)}
            className="w-12 border rounded px-1"
          />

          <span>/</span>

          <input
            type="number"
            value={p.pitchTotal}
            placeholder="累計"
            onChange={(e) => updatePitcher(j, "pitchTotal", e.target.value)}
            className="w-14 border rounded px-1"
          />
        </div>
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
function SubForm({ playerList, posList, lineup, subs, setSubs, onAdd, currentInning, currentHalf, currentBatters }: any) {
  // …（中略：あなたの元コードそのまま残すため、Part1 では省略します）
  return (
    <div>{/* ここは Part2 で全体を送ります */}</div>
  );
}

// ===== AtBatForm =====
function AtBatForm(props: any) {
  // …（中略：あなたの元コードそのまま残すため、Part1 では省略）
  return <div>{/* Part3 で送ります */}</div>;
}

// ===== メインアプリ（タブ機能をここに追加） =====
export default function BaseballReportApp() {

  // ← ★ここが Part1 の最重要ポイント（タブ状態）
  const [tab, setTab] = useState("info");  // ★ 追加済み ★

  // 以下、gameInfo / innings / lineup / subs / records 等の state は
  // Part2 で続けて送ります
        {/* 左ペイン：入力フォーム */}
        <div className="bg-white p-4 rounded-xl shadow overflow-y-auto h-[90vh] landscape:h-screen landscape:max-h-screen">
          {/* タブ切替 */}
          <div className="flex gap-3 mb-4 border-b pb-2 text-sm">
            <button
              onClick={() => setTab("info")}
              className={tab === "info" ? "font-bold border-b-2 border-blue-600" : ""}
            >
              試合情報
            </button>
            <button
              onClick={() => setTab("score")}
              className={tab === "score" ? "font-bold border-b-2 border-blue-600" : ""}
            >
              スコア &amp; 投球数
            </button>
            <button
              onClick={() => setTab("subs")}
              className={tab === "subs" ? "font-bold border-b-2 border-blue-600" : ""}
            >
              交代
            </button>
            <button
              onClick={() => setTab("bat")}
              className={tab === "bat" ? "font-bold border-b-2 border-blue-600" : ""}
            >
              打撃・走塁
            </button>
          </div>

          {/* ▼ 試合情報タブ */}
          {tab === "info" && (
            <>
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
                <input
                  type="number"
                  value={gameInfo.startHour}
                  onChange={(e) => setGameInfo({ ...gameInfo, startHour: e.target.value })}
                  className="w-16 p-1 border rounded"
                />
                時
                <input
                  type="number"
                  value={gameInfo.startMin}
                  onChange={(e) => setGameInfo({ ...gameInfo, startMin: e.target.value })}
                  className="w-16 p-1 border rounded"
                />
                分
              </div>
              <div className="mb-2 flex gap-2 items-center">
                <label className="text-sm text-gray-600 w-24">終了時間</label>
                <input
                  type="number"
                  value={gameInfo.endHour}
                  onChange={(e) => setGameInfo({ ...gameInfo, endHour: e.target.value })}
                  className="w-16 p-1 border rounded"
                />
                時
                <input
                  type="number"
                  value={gameInfo.endMin}
                  onChange={(e) => setGameInfo({ ...gameInfo, endMin: e.target.value })}
                  className="w-16 p-1 border rounded"
                />
                分
              </div>

              {/* 先攻/後攻 */}
              <div className="mb-2">
                <label className="block text-sm text-gray-600">先攻/後攻</label>
                <select
                  value={gameInfo.homeBatting ? "後攻" : "先攻"}
                  onChange={(e) =>
                    setGameInfo({ ...gameInfo, homeBatting: e.target.value === "後攻" })
                  }
                  className="p-1 border rounded"
                >
                  <option value="先攻">先攻</option>
                  <option value="後攻">後攻</option>
                </select>
              </div>

              {/* 先発メンバー入力（守備重複防止） */}
              <h2 className="text-lg font-semibold mb-2">先発メンバー入力</h2>
              {lineup.map((p: any, idx: number) => {
                const usedNames = lineup.map((l: any) => l.name).filter(Boolean);
                const usedPos = lineup.map((l: any) => l.pos).filter(Boolean);
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
                      {POS_LIST.filter((pos) => !usedPos.includes(pos) || pos === p.pos).map(
                        (pos) => (
                          <option key={pos}>{pos}</option>
                        )
                      )}
                    </select>
                  </div>
                );
              })}
            </>
          )}

          {/* ▼ スコア & 投球数タブ */}
          {tab === "score" && (
            <>
              <h2 className="text-lg font-semibold mb-2">スコアボード & 投球数</h2>
              {innings.map((inn: any, idx: number) => (
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
                          label="八王子投手"
                          pitchers={inn.awayPitchers}
                          setPitchers={(p: any) =>
                            setInnings((prev: InningRow[]) =>
                              updateInningPitchers(prev, idx, "awayPitchers", p)
                            )
                          }
                          playerList={playerList}
                          buttonClass="bg-blue-100"
                          isOpponent={false}
                        />
                      </div>

                      {/* 後攻（ホーム／味方）の攻撃 */}
                      <div className="mb-2">
                        <span className="font-semibold">八王子の攻撃</span>
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
                          setPitchers={(p: any) =>
                            setInnings((prev: InningRow[]) =>
                              updateInningPitchers(prev, idx, "homePitchers", p)
                            )
                          }
                          playerList={playerList}
                          buttonClass="bg-green-100"
                          isOpponent={true}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 先攻（ホーム／味方）の攻撃 */}
                      <div className="mb-2">
                        <span className="font-semibold">八王子の攻撃</span>
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
                          setPitchers={(p: any) =>
                            setInnings((prev: InningRow[]) =>
                              updateInningPitchers(prev, idx, "homePitchers", p)
                            )
                          }
                          playerList={playerList}
                          buttonClass="bg-green-100"
                          isOpponent={true}
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
                          label="八王子投手"
                          pitchers={inn.awayPitchers}
                          setPitchers={(p: any) =>
                            setInnings((prev: InningRow[]) =>
                              updateInningPitchers(prev, idx, "awayPitchers", p)
                            )
                          }
                          playerList={playerList}
                          buttonClass="bg-blue-100"
                          isOpponent={false}
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </>
          )}

          {/* ▼ 交代タブ */}
          {tab === "subs" && (
            <>
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
                onAdd={(s: any) => {
                  const idx = s.inning - 1;
                  const rec: PlayRecord =
                    s.type === "守備変更"
                      ? {
                          line: `${s.type}：${s.out}(${s.oldPos})→(${s.newPos})`,
                          deltaOuts: 0,
                          advancedOrder: false,
                          batterName: "",
                        }
                      : s.type === "代打"
                      ? {
                          line: `${s.out}→${s.in}(代打)`,
                          deltaOuts: 0,
                          advancedOrder: false,
                          batterName: "",
                        }
                      : {
                          line: `${s.type}：${s.out}→${s.in}(${s.pos})`,
                          deltaOuts: 0,
                          advancedOrder: false,
                          batterName: "",
                        };

                  const copy = [...records];
                  if (s.half === "表") copy[idx].top.push(rec);
                  else copy[idx].bottom.push(rec);
                  setRecords(copy);
                }}
              />

              {/* 交代一覧 */}
              <div className="mt-4 border p-2 rounded">
                <h3 className="font-semibold mb-2">交代一覧</h3>
                {subs.length === 0 && (
                  <div className="text-gray-500 text-sm">（なし）</div>
                )}
                {subs.map((s: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center mb-1 text-sm"
                  >
                    <span>
                      {s.inning}回{s.half} {s.type}:{s.out}
                      {s.type === "守備変更"
                        ? `(${s.oldPos})→(${s.newPos})`
                        : s.type === "代打"
                        ? `→${s.in}`
                        : `(${s.pos})→${s.in}(${s.pos})`}
                    </span>
                    <button
                      onClick={() => {
                        const updated = subs.filter(
                          (_: any, i: number) => i !== idx
                        );
                        setSubs(updated);
                        // 打席結果からも該当の交代行を削除
                        const copy = [...records];
                        copy.forEach((inn: any) => {
                          inn.top = inn.top.filter(
                            (r: any) =>
                              !r.line.includes(s.out) && !r.line.includes(s.in)
                          );
                          inn.bottom = inn.bottom.filter(
                            (r: any) =>
                              !r.line.includes(s.out) && !r.line.includes(s.in)
                          );
                        });
                        setRecords(copy);

                        // localStorage も更新
                        const saved = JSON.parse(
                          localStorage.getItem("baseballReportData") || "{}"
                        );
                        localStorage.setItem(
                          "baseballReportData",
                          JSON.stringify({
                            ...saved,
                            subs: updated,
                            records: copy,
                          })
                        );
                      }}
                      className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ▼ 打撃・走塁タブ */}
          {tab === "bat" && (
            <>
              {/* 打席入力フォーム */}
              <AtBatForm
                lineup={lineup}
                currentBatters={currentBatters}
                allyOrder={allyOrder}
                setAllyOrder={setAllyOrder}
                eOrder={eOrder}
                seteOrder={seteOrder}
                homeBatting={gameInfo.homeBatting}
                onAppend={(
                  i: number,
                  h: "表" | "裏",
                  rec: PlayRecord
                ) => {
                  const copy = [...records];
                  (h === "表" ? copy[i].top : copy[i].bottom).push(rec);

                  setRecords(copy);
                  const saved = JSON.parse(
                    localStorage.getItem("baseballReportData") || "{}"
                  );
                  localStorage.setItem(
                    "baseballReportData",
                    JSON.stringify({
                      ...saved,
                      records: copy,
                    })
                  );
                }}
                currentInning={currentInning}
                setCurrentInning={setCurrentInning}
                currentHalf={currentHalf}
                setCurrentHalf={setCurrentHalf}
                currentOuts={currentOuts}
                setCurrentOuts={setCurrentOuts}
                onUndo={handleUndo}
              />
            </>
          )}
        </div>
