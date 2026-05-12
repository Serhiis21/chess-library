import { useEffect, useRef } from "react";
import { Chessground } from "chessground";
import "chessground/assets/chessground.base.css";
import "chessground/assets/chessground.brown.css";

export default function TestBoard() {
  const ref = useRef(null);

  useEffect(() => {
    Chessground(ref.current, {
      fen: "start",
      coordinates: true
    });
  }, []);

  return <div ref={ref} style={{ width: 400, height: 400 }} />;
}