
import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessground } from "chessground";

import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";

export default function Board({ pgn }) {
  const boardRef = useRef(null);
  const cgRef = useRef(null);

  const engineRef = useRef(null);
  const engineReadyRef = useRef(false);
  const engineStartingRef = useRef(false);

  const timerRef = useRef(null);
  const searchIdRef = useRef(0);
  const searchTimerRef = useRef(null);

  const mountedRef = useRef(true);

  const [moves, setMoves] = useState([]);
  const [index, setIndex] = useState(0);

  const [startFen, setStartFen] = useState(null);
  const [startsBlack, setStartsBlack] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000);

  const [analyzing, setAnalyzing] = useState(false);
  const [engineReady, setEngineReady] = useState(false);

  const [evaluation, setEvaluation] = useState(null);
  const [depth, setDepth] = useState(null);
  const [bestMove, setBestMove] = useState("");
  const [principalVariation, setPrincipalVariation] =
    useState("");

  const [engineError, setEngineError] = useState("");

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined"
      ? window.innerWidth
      : 1000
  );

  useEffect(() => {
    const onResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const isMobile = windowWidth < 900;
  const isSmallMobile = windowWidth < 600;

  const boardSize = isSmallMobile
    ? Math.max(
        280,
        Math.min(windowWidth - 24, 520)
      )
    : isMobile
      ? Math.min(windowWidth - 24, 520)
      : 520;

  // =========================================================
  // LOAD PGN
  // =========================================================

  useEffect(() => {
    if (!pgn) {
      return;
    }

    const chess = new Chess();

    try {
      chess.loadPgn(pgn, {
        sloppy: true
      });
    } catch (error) {
      console.error("PGN error:", error);
      return;
    }

    const headers = chess.header();
    const fen = headers.FEN || null;

    setStartFen(fen);

    setStartsBlack(
      Boolean(
        fen &&
          fen.split(" ")[1] === "b"
      )
    );

    setMoves(chess.history());
    setIndex(0);
    setPlaying(false);

    stopAnalysis();

    setEvaluation(null);
    setDepth(null);
    setBestMove("");
    setPrincipalVariation("");
    setEngineError("");
  }, [pgn]);

  // =========================================================
  // CHESSGROUND
  // =========================================================

  useEffect(() => {
    if (!boardRef.current) {
      return;
    }

    if (cgRef.current) {
      return;
    }

    try {
      cgRef.current = Chessground(
        boardRef.current,
        {
          coordinates: true,

          movable: {
            free: false
          },

          animation: {
            enabled: true,
            duration: 250
          },

          drawable: {
            enabled: true,
            visible: true,
            eraseOnClick: true,

            brushes: {
              green: {
                key: "g",
                color: "#4caf50",
                opacity: 0.8,
                lineWidth: 10
              },

              red: {
                key: "r",
                color: "#e53935",
                opacity: 0.8,
                lineWidth: 10
              },

              yellow: {
                key: "y",
                color: "#fbc02d",
                opacity: 0.8,
                lineWidth: 10
              },

              blue: {
                key: "b",
                color: "#1e88e5",
                opacity: 0.8,
                lineWidth: 10
              }
            }
          }
        }
      );
    } catch (error) {
      console.error(
        "Chessground error:",
        error
      );
    }

    return () => {
      try {
        if (cgRef.current) {
          cgRef.current.destroy();
        }
      } catch {
        // ignore
      }

      cgRef.current = null;
    };
  }, []);

  // =========================================================
  // CURRENT CHESS
  // =========================================================

  function getCurrentChess() {
    try {
      const chess = new Chess(
        startFen || undefined
      );

      for (let i = 0; i < index; i++) {
        if (!moves[i]) {
          continue;
        }

        chess.move(moves[i]);
      }

      return chess;
    } catch (error) {
      console.error(
        "Position error:",
        error
      );

      return null;
    }
  }

  function getCurrentFen() {
    const chess = getCurrentChess();

    if (!chess) {
      return null;
    }

    return chess.fen();
  }

  // =========================================================
  // UPDATE BOARD
  // =========================================================

  useEffect(() => {
    if (!cgRef.current) {
      return;
    }

    const chess = new Chess(
      startFen || undefined
    );

    let lastMove = null;

    for (let i = 0; i < index; i++) {
      const move = moves[i];

      if (!move) {
        continue;
      }

      try {
        const result = chess.move(move);

        if (result) {
          lastMove = result;
        }
      } catch {
        break;
      }
    }

    try {
      cgRef.current.set({
        fen: chess.fen(),

        lastMove: lastMove
          ? [
              lastMove.from,
              lastMove.to
            ]
          : undefined
      });
    } catch (error) {
      console.error(
        "Chessground update error:",
        error
      );
    }
  }, [index, moves, startFen]);

  // =========================================================
  // AUTOPLAY
  // =========================================================

  useEffect(() => {
    if (!playing) {
      clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setIndex(prev => {
        if (prev >= moves.length) {
          clearInterval(timerRef.current);
          setPlaying(false);
          return prev;
        }

        return prev + 1;
      });
    }, speed);

    return () => {
      clearInterval(timerRef.current);
    };
  }, [
    playing,
    speed,
    moves.length
  ]);

  // =========================================================
  // SIDE TO MOVE
  // =========================================================

  function getSideToMove() {
    const fen = getCurrentFen();

    if (!fen) {
      return "w";
    }

    return fen.split(" ")[1] || "w";
  }

  const sideToMove = getSideToMove();

  const sideToMoveText =
    sideToMove === "w"
      ? "Белых"
      : "Чёрных";

  const sideToMoveIcon =
    sideToMove === "w"
      ? "♙"
      : "♟";

  // =========================================================
  // STOCKFISH URL
  // =========================================================

  function getStockfishUrl() {
    const base =
      import.meta.env.BASE_URL || "/";

    return new URL(
      "stockfish/stockfish-18-lite-single.js",
      new URL(
        base,
        window.location.origin
      )
    ).href;
  }

  // =========================================================
  // STOCKFISH MESSAGE
  // =========================================================

  function handleEngineMessage(event) {
    if (!mountedRef.current) {
      return;
    }

    const line =
      typeof event.data === "string"
        ? event.data.trim()
        : "";

    if (!line) {
      return;
    }

    console.log(
      "Stockfish:",
      line
    );

    if (line === "uciok") {
      engineReadyRef.current = true;
      engineStartingRef.current = false;

      setEngineReady(true);

      try {
        engineRef.current.postMessage(
          "isready"
        );
      } catch {
        // ignore
      }

      return;
    }

    if (line === "readyok") {
      return;
    }

    if (!line.startsWith("info")) {
      return;
    }

    const depthMatch =
      line.match(
        /\bdepth\s+(\d+)/
      );

    if (depthMatch) {
      setDepth(
        Number(depthMatch[1])
      );
    }

    const scoreMatch =
      line.match(
        /\bscore\s+(cp|mate)\s+(-?\d+)/
      );

    if (scoreMatch) {
      const scoreType =
        scoreMatch[1];

      const raw =
        Number(scoreMatch[2]);

      const fen =
        getCurrentFen();

      const currentSide =
        fen
          ? fen.split(" ")[1]
          : "w";

      let whiteScore = raw;

      if (currentSide === "b") {
        whiteScore = -raw;
      }

      if (scoreType === "cp") {
        setEvaluation(
          whiteScore / 100
        );
      } else {
        setEvaluation(
          whiteScore > 0
            ? `+M${Math.abs(raw)}`
            : `-M${Math.abs(raw)}`
        );
      }
    }

    const pvMatch =
      line.match(
        /\bpv\s+(.+)$/
      );

    if (pvMatch) {
      const pv =
        pvMatch[1]
          .trim()
          .split(/\s+/);

      if (pv.length > 0) {
        setBestMove(pv[0]);

        setPrincipalVariation(
          pv
            .slice(0, 8)
            .join(" ")
        );
      }
    }
  }

  // =========================================================
  // ENGINE ERROR
  // =========================================================

  function handleEngineError(error) {
    console.error(
      "Stockfish worker error:",
      error
    );

    if (!mountedRef.current) {
      return;
    }

    setEngineError(
      "Ошибка запуска Stockfish"
    );

    setAnalyzing(false);
    setEngineReady(false);

    engineReadyRef.current = false;
    engineStartingRef.current = false;
  }

  // =========================================================
  // LOAD ENGINE
  // =========================================================

  function loadEngine() {
    if (engineRef.current) {
      return engineRef.current;
    }

    if (engineStartingRef.current) {
      return null;
    }

    engineStartingRef.current = true;

    try {
      const jsUrl =
        getStockfishUrl();

      console.log(
        "Loading Stockfish:",
        jsUrl
      );

      const worker =
        new Worker(
          jsUrl,
          {
            type: "classic"
          }
        );

      worker.onmessage =
        handleEngineMessage;
  

      worker.onerror =
        handleEngineError;

      worker.onmessageerror =
        error => {
          console.error(
            "Stockfish message error:",
            error
          );
        };

      engineRef.current =
        worker;

      engineReadyRef.current =
        false;

      setEngineReady(false);
      setEngineError("");

      worker.postMessage("uci");

      return worker;
    } catch (error) {
      console.error(
        "Stockfish loading error:",
        error
      );

      engineStartingRef.current =
        false;

      setEngineError(
        "Не удалось загрузить Stockfish"
      );

      return null;
    }
  }
  
 // =========================================================
// STOCKFISH BEST MOVE ARROW
// =========================================================

useEffect(() => {
  if (!cgRef.current) {
    return;
  }

  // Если лучшего хода пока нет —
  // убираем стрелку Stockfish.
  if (
    !bestMove ||
    bestMove.length < 4
  ) {
    try {
      cgRef.current.set({
        drawable: {
          shapes: []
        }
      });
    } catch (error) {
      console.error(
        "Stockfish arrow clear error:",
        error
      );
    }

    return;
  }

  const from =
    bestMove.substring(0, 2);

  const to =
    bestMove.substring(2, 4);

  const squarePattern =
    /^[a-h][1-8]$/;

  if (
    !squarePattern.test(from) ||
    !squarePattern.test(to)
  ) {
    return;
  }

  try {
    cgRef.current.set({
      drawable: {
        shapes: [
          {
            orig: from,
            dest: to,
            brush: "green"
          }
        ]
      }
    });
  } catch (error) {
    console.error(
      "Stockfish arrow error:",
      error
    );
  }
}, [bestMove]);

  // =========================================================
  // START ENGINE SEARCH
  // =========================================================

  function startEngineSearch(
    engine,
    fen,
    searchId
  ) {
    if (
      !engine ||
      !mountedRef.current
    ) {
      return;
    }

    if (
      searchId !==
      searchIdRef.current
    ) {
      return;
    }

    try {
      engine.postMessage("stop");
    } catch {
      // ignore
    }

    try {
      engine.postMessage("ucinewgame");
    } catch {
      // ignore
    }

    try {
      engine.postMessage(
        `position fen ${fen}`
      );

      engine.postMessage(
        "go depth 18"
      );
    } catch (error) {
      console.error(
        "Stockfish search error:",
        error
      );

      setEngineError(
        "Ошибка запуска анализа"
      );

      setAnalyzing(false);

      return;
    }

    clearTimeout(
      searchTimerRef.current
    );

    searchTimerRef.current =
      setTimeout(() => {
        if (
          searchId !==
          searchIdRef.current
        ) {
          return;
        }

        if (
          depth === null &&
          evaluation === null
        ) {
          try {
            engine.postMessage(
              "stop"
            );
          } catch {
            // ignore
          }

          setEngineError(
            "Stockfish не начал анализ"
          );

          setAnalyzing(false);
        }
      }, 15000);
  }

  // =========================================================
  // ANALYZE
  // =========================================================

  function analyzePosition() {
    if (analyzing) {
      stopAnalysis();
      return;
    }

    const fen =
      getCurrentFen();

    if (!fen) {
      setEngineError(
        "Не удалось получить позицию"
      );

      return;
    }

    setEngineError("");
    setEvaluation(null);
    setDepth(null);
    setBestMove("");
    setPrincipalVariation("");

    const engine =
      loadEngine();

    if (!engine) {
      setAnalyzing(true);

      const currentSearch =
        ++searchIdRef.current;

      const waitInterval =
        setInterval(() => {
          if (
            currentSearch !==
            searchIdRef.current
          ) {
            clearInterval(
              waitInterval
            );

            return;
          }

          if (
            engineReadyRef.current &&
            engineRef.current
          ) {
            clearInterval(
              waitInterval
            );

            startEngineSearch(
              engineRef.current,
              fen,
              currentSearch
            );
          }
        }, 100);

      setTimeout(() => {
        clearInterval(
          waitInterval
        );
      }, 10000);

      return;
    }

    setAnalyzing(true);

    const currentSearch =
      ++searchIdRef.current;

    startEngineSearch(
      engine,
      fen,
      currentSearch
    );
  }

  // =========================================================
  // STOP
  // =========================================================

  function stopAnalysis() {
    searchIdRef.current++;

    clearTimeout(
      searchTimerRef.current
    );

    setAnalyzing(false);

    if (engineRef.current) {
      try {
        engineRef.current.postMessage(
          "stop"
        );
      } catch {
        // ignore
      }
    }
  }

  // =========================================================
  // CLEANUP
  // =========================================================

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      clearInterval(
        timerRef.current
      );

      clearTimeout(
        searchTimerRef.current
      );

      searchIdRef.current++;

      if (engineRef.current) {
        try {
          engineRef.current.postMessage(
            "stop"
          );
        } catch {
          // ignore
        }

        try {
          engineRef.current.terminate();
        } catch {
          // ignore
        }
      }

      engineRef.current = null;
      engineReadyRef.current = false;
      engineStartingRef.current = false;
    };
  }, []);

  // =========================================================
  // NAVIGATION
  // =========================================================

  function go(newIndex) {
    const safeIndex =
      Math.max(
        0,
        Math.min(
          newIndex,
          moves.length
        )
      );

    stopAnalysis();

    setIndex(safeIndex);

    setEvaluation(null);
    setDepth(null);
    setBestMove("");
    setPrincipalVariation("");
    setEngineError("");
  }

  // =========================================================
  // FORMAT EVALUATION
  // =========================================================

  function formatEvaluation() {
    if (evaluation === null) {
      return "—";
    }

    if (
      typeof evaluation ===
      "string"
    ) {
      return evaluation;
    }

    if (evaluation > 0) {
      return `+${evaluation.toFixed(2)}`;
    }

    return evaluation.toFixed(2);
  }

  // =========================================================
  // ANALYSIS PANEL
  // =========================================================

  const analysisPanel = (
    <div
      style={{
        width: "100%",
        maxWidth: isMobile
          ? 520
          : "none",
        padding: 14,
        border:
          "1px solid #d8d8d8",
        borderRadius: 10,
        background: "#fafafa",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 17,
          marginBottom: 10
        }}
      >
        ♟ Stockfish 18 — Анализ
      </div>

      <button
        onClick={analyzePosition}
        style={{
          display: "block",
          width: "100%",
          minHeight: 44,
          padding: "10px 14px",
          borderRadius: 7,
          border: "1px solid #bbb",
          background:
            analyzing
              ? "#ffe082"
              : "#ffffff",
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
          touchAction: "manipulation"
        }}
      >
        {analyzing
          ? "⏹ Остановить анализ"
          : "♟ Анализировать позицию"}
      </button>

      <div
        style={{
          marginTop: 9,
          fontSize: 12,
          opacity: 0.7
        }}
      >
        Движок:{" "}
        {engineReady
          ? "готов"
          : "загрузка..."}
      </div>

      {engineError && (
        <div
          style={{
            marginTop: 9,
            padding: 8,
            borderRadius: 6,
            background: "#ffebee",
            color: "#c62828",
            fontSize: 13,
            lineHeight: 1.4,
            wordBreak: "break-word"
          }}
        >
          {engineError}
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop:
            "1px solid #e0e0e0",
          display: "grid",
          gap: 6,
          fontSize: 14,
          lineHeight: 1.5
        }}
      >
        <div>
          Оценка:{" "}
          <strong>
            {formatEvaluation()}
          </strong>
        </div>

        <div>
          Глубина:{" "}
          <strong>
            {depth || "—"}
          </strong>
        </div>

        <div>
          Лучший ход:{" "}
          <strong>
            {bestMove || "—"}
          </strong>
        </div>

        <div
          style={{
            overflowWrap: "anywhere"
          }}
        >
          Вариант:{" "}
          <strong>
            {principalVariation || "—"}
          </strong>
        </div>
      </div>
    </div>
  );

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1100,
        margin: "0 auto",
        boxSizing: "border-box",
        padding: isMobile
          ? "0 8px"
          : "0 12px"
      }}
    >
      {/* =====================================================
          DESKTOP:
          BOARD + ANALYSIS SIDE BY SIDE
      ===================================================== */}

      <div
        style={{
          display: isMobile
            ? "block"
            : "grid",
          gridTemplateColumns:
            isMobile
              ? "1fr"
              : "520px minmax(300px, 1fr)",
          gap: isMobile
            ? 0
            : 20,
          alignItems: "start",
          marginBottom: 16
        }}
      >
        {/* BOARD */}

        <div
          style={{
            width: boardSize,
            maxWidth: "100%",
            margin: isMobile
              ? "0 auto 16px auto"
              : "0",
            boxSizing: "border-box"
          }}
        >
          <div
            ref={boardRef}
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow:
                "0 4px 16px rgba(0,0,0,0.25)",
              background: "#d8b27c"
            }}
          />
        </div>

        {/* DESKTOP ANALYSIS */}

        {!isMobile && (
          <div
            style={{
              width: "100%",
              paddingTop: 0
            }}
          >
            {analysisPanel}
          </div>
        )}
      </div>

      {/* =====================================================
          MOVES
      ===================================================== */}

      <div
        style={{
          width: "100%",
          maxWidth: 520,
          margin:
            "0 auto 16px auto"
        }}
      >
        <h3
          style={{
            margin:
              "0 0 10px 0"
          }}
        >
          Moves
        </h3>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 12
          }}
        >
          <button
            onClick={() => go(0)}
          >
            ⏮
          </button>

          <button
            onClick={() =>
              go(index - 1)
            }
          >
            ◀
          </button>

          <button
            onClick={() =>
              go(index + 1)
            }
          >
            ▶
          </button>

          <button
            onClick={() =>
              go(moves.length)
            }
          >
            ⏭
          </button>

          <button
            onClick={() =>
              setPlaying(!playing)
            }
          >
            {playing
              ? "⏸ Pause"
              : "▶ Play"}
          </button>
        </div>

        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 8,
            background:
              sideToMove === "w"
                ? "#f5f5f5"
                : "#e9e9e9",
            border:
              "1px solid #ddd",
            fontWeight: 700,
            width: "100%",
            boxSizing: "border-box"
          }}
        >
          Ход:{" "}
          {sideToMoveIcon}{" "}
          {sideToMoveText}
        </div>
      </div>

      {/* =====================================================
          MOBILE ANALYSIS
      ===================================================== */}

      {isMobile && (
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            margin:
              "0 auto 16px auto"
          }}
        >
          {analysisPanel}
        </div>
      )}

      {/* =====================================================
          MOVE LIST
      ===================================================== */}

      <div
        style={{
          width: "100%",
          maxWidth: 520,
          margin: "0 auto",
          boxSizing: "border-box"
        }}
      >
        <div
          style={{
            marginBottom: 14
          }}
        >
          <div
            style={{
              marginBottom: 5
            }}
          >
            Speed
          </div>

          <select
            value={speed}
            onChange={e =>
              setSpeed(
                Number(e.target.value)
              )
            }
            style={{
              padding: 7,
              borderRadius: 6,
              maxWidth: "100%"
            }}
          >
            <option value={1500}>
              Slow
            </option>

            <option value={1000}>
              Normal
            </option>

            <option value={500}>
              Fast
            </option>

            <option value={250}>
              Very Fast
            </option>
          </select>
        </div>

        <div
          style={{
            maxHeight:
              isMobile
                ? 320
                : 460,
            overflowY: "auto",
            border:
              "1px solid #ddd",
            borderRadius: 8,
            padding: 8,
            boxSizing: "border-box",
            width: "100%"
          }}
        >
          {Array.from({
            length: Math.ceil(
              (
                moves.length +
                (startsBlack ? 1 : 0)
              ) / 2
            )
          }).map((_, i) => {
            let white = null;
            let black = null;

            let whiteIndex = null;
            let blackIndex = null;

            if (startsBlack) {
              if (i === 0) {
                black = moves[0];
                blackIndex = 1;
              } else {
                white =
                  moves[i * 2 - 1];

                black =
                  moves[i * 2];

                whiteIndex =
                  i * 2;

                blackIndex =
                  i * 2 + 1;
              }
            } else {
              white =
                moves[i * 2];

              black =
                moves[i * 2 + 1];

              whiteIndex =
                i * 2 + 1;

              blackIndex =
                i * 2 + 2;
            }

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  padding: 4,
                  minWidth: 0
                }}
              >
                <div
                  style={{
                    width: 30,
                    flexShrink: 0,
                    fontWeight: 600
                  }}
                >
                  {i + 1}.
                </div>

                <div
                  onClick={() =>
                    white &&
                    go(whiteIndex)
                  }
                  style={{
                    flex: 1,
                    minWidth: 0,
                    cursor: white
                      ? "pointer"
                      : "default",
                    borderRadius: 4,
                    padding:
                      "3px 5px",
                    background:
                      index ===
                      whiteIndex
                        ? "#ffe082"
                        : "transparent",
                    overflow: "hidden",
                    textOverflow:
                      "ellipsis",
                    whiteSpace:
                      "nowrap"
                  }}
                >
                  {white || ""}
                </div>

                <div
                  onClick={() =>
                    black &&
                    go(blackIndex)
                  }
                  style={{
                    flex: 1,
                    minWidth: 0,
                    cursor: black
                      ? "pointer"
                      : "default",
                    borderRadius: 4,
                    padding:
                      "3px 5px",
                    background:
                      index ===
                      blackIndex
                        ? "#ffe082"
                        : "transparent",
                    overflow: "hidden",
                    textOverflow:
                      "ellipsis",
                    whiteSpace:
                      "nowrap"
                  }}
                >
                  {startsBlack &&
                  i === 0
                    ? `... ${
                        black || ""
                      }`
                    : black || ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}