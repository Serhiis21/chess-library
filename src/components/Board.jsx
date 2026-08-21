import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";

import { Chessground } from "chessground";

import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css";

export default function Board({ pgn }) {

  const boardRef = useRef(null);
  const cgRef = useRef(null);

  const [moves, setMoves] = useState([]);
  const [index, setIndex] = useState(0);

  // 🔥 FEN
  const [startFen, setStartFen] =
    useState(null);

  // 🔥 BLACK TO MOVE FROM FEN
  const [startsBlack, setStartsBlack] =
    useState(false);

  const [playing, setPlaying] =
    useState(false);

  const [speed, setSpeed] =
    useState(1000);

  const timerRef = useRef(null);

  // 📱 RESPONSIVE SIZE
  const boardSize =
    window.innerWidth < 700
      ? window.innerWidth - 24
      : 520;

  // =========================
  // LOAD PGN
  // =========================
  useEffect(() => {

    if (!pgn) return;

    const g = new Chess();

    try {

      g.loadPgn(pgn, {
        sloppy: true
      });

    } catch {

      return;

    }

    // 🔥 FEN SUPPORT
    const headers = g.header();

    setStartFen(
      headers.FEN || null
    );

    // 🔥 BLACK TO MOVE
    if (
      headers.FEN &&
      headers.FEN.includes(" b ")
    ) {

      setStartsBlack(true);

    } else {

      setStartsBlack(false);

    }

    setMoves(g.history());

    setIndex(0);

    setPlaying(false);

  }, [pgn]);

  // =========================
  // CREATE BOARD
  // =========================
  useEffect(() => {

    if (!boardRef.current) return;

    if (!cgRef.current) {

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

    }

  }, []);

  // =========================
  // UPDATE POSITION
  // =========================
  useEffect(() => {

    if (!cgRef.current) return;

    // 🔥 START FROM FEN
    const g = new Chess(
      startFen || undefined
    );

    let lastMove = null;

    for (let i = 0; i < index; i++) {

      const move = moves[i];

      if (move) {

        const result = g.move(move);

        if (result) {

          lastMove = result;

        }

      }

    }

    cgRef.current.set({

      fen: g.fen(),

      lastMove: lastMove
        ? [lastMove.from, lastMove.to]
        : undefined

    });

  }, [index, moves, startFen]);

  // =========================
  // AUTOPLAY
  // =========================
  useEffect(() => {

    if (!playing) {

      clearInterval(timerRef.current);

      return;

    }

    timerRef.current = setInterval(() => {

      setIndex(prev => {

        if (prev >= moves.length) {

          clearInterval(
            timerRef.current
          );

          return prev;

        }

        return prev + 1;

      });

    }, speed);

    return () =>
      clearInterval(timerRef.current);

  }, [playing, speed, moves.length]);

  // =========================
  // NAVIGATION
  // =========================
  function go(i) {

    setIndex(

      Math.max(
        0,
        Math.min(i, moves.length)
      )

    );

  }

  return (

    <div
      style={{
        display: "flex",
        gap: 20,

        flexDirection:
          window.innerWidth < 900
            ? "column"
            : "row"
      }}
    >

      {/* BOARD */}
      <div
        ref={boardRef}
        style={{

          width: boardSize,
          height: boardSize,

          borderRadius: 8,

          overflow: "hidden",

          boxShadow:
            "0 4px 16px rgba(0,0,0,0.25)",

          flexShrink: 0

        }}
      />

      {/* RIGHT PANEL */}
      <div
        style={{
          width:
            window.innerWidth < 900
              ? "100%"
              : 320
        }}
      >

        <h3>Moves</h3>

        {/* CONTROLS */}
        <div
          style={{
            marginBottom: 14,

            display: "flex",

            flexWrap: "wrap",

            gap: 8
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

        {/* SPEED */}
        <div
          style={{
            marginBottom: 16
          }}
        >

          <div>Speed</div>

          <select
            value={speed}

            onChange={(e) =>
              setSpeed(
                Number(e.target.value)
              )
            }
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

        {/* MOVES */}
        <div
          style={{

            maxHeight:
              window.innerWidth < 900
                ? 260
                : 420,

            overflowY: "auto",

            border:
              window.innerWidth < 900
                ? "1px solid #ddd"
                : "none",

            borderRadius: 8,

            padding:
              window.innerWidth < 900
                ? 8
                : 0

          }}
        >

          {Array.from({
            length:
              Math.ceil(
                (moves.length + (startsBlack ? 1 : 0)) / 2
              )
          }).map((_, i) => {

            let white = null;
            let black = null;

            let whiteIndex = null;
            let blackIndex = null;

            // 🔥 GAME STARTS FROM BLACK
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
                  gap: 10,
                  padding: 4
                }}
              >

                <div
                  style={{
                    width: 30
                  }}
                >
                  {i + 1}.
                </div>

                {/* WHITE */}
                <div
                  onClick={() =>
                    white &&
                    go(whiteIndex)
                  }

                  style={{

                    width: 90,

                    cursor: white
                      ? "pointer"
                      : "default",

                    borderRadius: 4,

                    padding: "2px 4px",

                    background:
                      index === whiteIndex
                        ? "#ffe082"
                        : "transparent"

                  }}
                >
                  {white || ""}
                </div>

                {/* BLACK */}
                <div
                  onClick={() =>
                    black &&
                    go(blackIndex)
                  }

                  style={{

                    width: 90,

                    cursor: black
                      ? "pointer"
                      : "default",

                    borderRadius: 4,

                    padding: "2px 4px",

                    background:
                      index === blackIndex
                        ? "#ffe082"
                        : "transparent"

                  }}
                >
                  {startsBlack && i === 0
                    ? `... ${black || ""}`
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