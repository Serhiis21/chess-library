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

  const [playing, setPlaying] = useState(false);

  const [speed, setSpeed] = useState(1000);

  const timerRef = useRef(null);

  // ЗАГРУЗКА PGN
  useEffect(() => {

    if (!pgn) return;

    const g = new Chess();

    g.loadPgn(pgn);

    setMoves(g.history());
    setIndex(0);
    setPlaying(false);

  }, [pgn]);

  // СОЗДАНИЕ ДОСКИ
  useEffect(() => {

    if (!boardRef.current) return;

    if (!cgRef.current) {

      cgRef.current = Chessground(boardRef.current, {

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

      });
    }

  }, []);

  // ОБНОВЛЕНИЕ ПОЗИЦИИ
  useEffect(() => {

    if (!cgRef.current) return;

    const g = new Chess();

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

  }, [index, moves]);

  // АВТОПЛЕЙ
  useEffect(() => {

    if (!playing) {

      clearInterval(timerRef.current);

      return;
    }

    timerRef.current = setInterval(() => {

      setIndex(prev => {

        if (prev >= moves.length) {

          clearInterval(timerRef.current);

          return prev;
        }

        return prev + 1;

      });

    }, speed);

    return () => clearInterval(timerRef.current);

  }, [playing, speed, moves.length]);

  // ПЕРЕХОД
  function go(i) {

    setIndex(
      Math.max(0, Math.min(i, moves.length))
    );

  }

  return (
    <div style={{ display: "flex", gap: 20 }}>

      {/* ДОСКА */}
      <div
        ref={boardRef}
        style={{
          width: 520,
          height: 520,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)"
        }}
      />

      {/* ПРАВАЯ ПАНЕЛЬ */}
      <div style={{ width: 280 }}>

        <h3>Moves</h3>

        {/* УПРАВЛЕНИЕ */}
        <div style={{ marginBottom: 14 }}>

          <button onClick={() => go(0)}>
            ⏮
          </button>

          <button onClick={() => go(index - 1)}>
            ◀
          </button>

          <button onClick={() => go(index + 1)}>
            ▶
          </button>

          <button onClick={() => go(moves.length)}>
            ⏭
          </button>

          <button
            onClick={() => setPlaying(!playing)}
            style={{ marginLeft: 10 }}
          >
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>

        </div>

        {/* СКОРОСТЬ */}
        <div style={{ marginBottom: 16 }}>

          <div>Speed</div>

          <select
            value={speed}
            onChange={(e) =>
              setSpeed(Number(e.target.value))
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

        {/* ХОДЫ */}
        <div
          style={{
            maxHeight: 420,
            overflowY: "auto"
          }}
        >

          {Array.from({
            length: Math.ceil(moves.length / 2)
          }).map((_, i) => {

            const white = moves[i * 2];
            const black = moves[i * 2 + 1];

            const whiteIndex = i * 2 + 1;
            const blackIndex = i * 2 + 2;

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: 4
                }}
              >

                <div style={{ width: 30 }}>
                  {i + 1}.
                </div>

                {/* WHITE */}
                <div
                  onClick={() => go(whiteIndex)}
                  style={{
                    width: 80,
                    cursor: "pointer",
                    borderRadius: 4,
                    padding: "2px 4px",

                    background:
                      index === whiteIndex
                        ? "#ffe082"
                        : "transparent"
                  }}
                >
                  {white}
                </div>

                {/* BLACK */}
                <div
                  onClick={() => go(blackIndex)}
                  style={{
                    width: 80,
                    cursor: "pointer",
                    borderRadius: 4,
                    padding: "2px 4px",

                    background:
                      index === blackIndex
                        ? "#ffe082"
                        : "transparent"
                  }}
                >
                  {black || ""}
                </div>

              </div>
            );
          })}

        </div>

      </div>

    </div>
  );
}