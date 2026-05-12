import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

export default function RealBoard({ pgn }) {

  const [game, setGame] = useState(new Chess());
  const [moves, setMoves] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {

    if (!pgn) return;

    const g = new Chess();
    g.loadPgn(pgn);

    setMoves(g.history());
    setGame(new Chess());
    setIndex(0);

  }, [pgn]);

  const goTo = (i) => {

    const g = new Chess();

    for (let k = 0; k < i; k++) {
      g.move(moves[k]);
    }

    setGame(g);
    setIndex(i);
  };

  const lastMove = useMemo(() => {

    const hist = game.history({ verbose: true });

    return hist[hist.length - 1];

  }, [game]);

  const customSquares = useMemo(() => {

    const s = {};

    if (lastMove) {
      s[lastMove.from] = { background: "rgba(255,255,0,0.4)" };
      s[lastMove.to] = { background: "rgba(255,255,0,0.4)" };
    }

    return s;

  }, [lastMove]);

  return (
    <div style={{ display: "flex", gap: 20 }}>

      <Chessboard
        position={game.fen()}
        animationDuration={300}
        arePiecesDraggable={false}
        customSquareStyles={customSquares}
      />

      <div>

        <h3>Moves</h3>

        {moves.map((m, i) => (
          <div
            key={i}
            onClick={() => goTo(i + 1)}
            style={{ cursor: "pointer" }}
          >
            {i + 1}. {m}
          </div>
        ))}

      </div>

    </div>
  );
}