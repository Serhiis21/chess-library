import { useEffect, useState } from "react";
import Board from "./Board";

export default function GameList({ book }) {
  const [games, setGames] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!book) return;

    fetch(`/pgn/${book}`)
      .then((r) => r.text())
      .then((text) => {
        const parts = text
          .replace(/\r/g, "")
          .split("[Event");

        const parsed = parts
          .filter(Boolean)
          .map((g) => "[Event" + g);

        setGames(parsed);
        setSelected(parsed[0]);
      });
  }, [book]);

  return (
    <div style={{ display: "flex", gap: "15px" }}>

      {/* СПИСОК ПАРТИЙ */}
      <div className="panel" style={{ width: "280px" }}>
        <h2>♟ Партии</h2>

        {games.map((g, i) => {
          const white = g.match(/\[White "(.*?)"\]/)?.[1] || "White";
          const black = g.match(/\[Black "(.*?)"\]/)?.[1] || "Black";

          return (
            <div
              key={i}
              className={`card ${selected === g ? "active" : ""}`}
              onClick={() => setSelected(g)}
            >
              {white} — {black}
            </div>
          );
        })}
      </div>

      {/* ДОСКА */}
      <div className="panel" style={{ flex: 1 }}>
        <Board pgn={selected} />
      </div>

    </div>
  );
}