import { useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

export default function PlayBoard() {

  const [game, setGame] = useState(new Chess());

  function onDrop(from, to) {

    const newGame = new Chess(game.fen());

    const move = newGame.move({
      from,
      to,
      promotion: "q"
    });

    if (!move) return false;

    setGame(newGame);
    return true;
  }

  return (
    <div style={{ width: 500 }}>

      <Chessboard
        position={game.fen()}
        onPieceDrop={onDrop}
      />

    </div>
  );
}