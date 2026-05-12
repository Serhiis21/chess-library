import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";

import Board from "./components/Board.jsx";

export default function App() {

  // 📚 BOOKS
  const [books, setBooks] = useState(() => {

    const saved = localStorage.getItem("chess-books");

    return saved ? JSON.parse(saved) : [];

  });

  // 📖 SELECTED
  const [selectedBook, setSelectedBook] = useState(null);

  const [selectedGame, setSelectedGame] = useState(null);

  // 🔎 SEARCH
  const [search, setSearch] = useState("");

  // 💾 SAVE
  useEffect(() => {

    localStorage.setItem(
      "chess-books",
      JSON.stringify(books)
    );

  }, [books]);

  // 📥 IMPORT PGN
  function handlePGNFile(event) {

    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {

      const text = e.target.result;

      const rawGames = text
        .split(/\r?\n\r?\n(?=\[Event)/)
        .map(g => g.trim())
        .filter(g => g.includes("[Event"));

      const games = rawGames.map((pgn, i) => {

        const g = new Chess();

        try {

          g.loadPgn(pgn, { sloppy: true });

        } catch {

          return null;

        }

        const h = g.header?.() || {};

        return {

          id: i,

          white: h.White || "White",

          black: h.Black || "Black",

          event: h.Event || "",

          opening: h.Opening || "",

          name:
            `${h.White || "White"} vs ${h.Black || "Black"}`,

          pgn

        };

      }).filter(Boolean);

      const newBook = {

        id: Date.now(),

        title: file.name,

        games

      };

      setBooks(prev => [...prev, newBook]);

    };

    reader.readAsText(file);

  }

  // 🗑 DELETE
  function deleteBook(bookId) {

    setBooks(prev =>
      prev.filter(book => book.id !== bookId)
    );

    if (selectedBook?.id === bookId) {

      setSelectedBook(null);
      setSelectedGame(null);

    }

  }

  // 🔎 FILTERED GAMES
  const filteredGames = useMemo(() => {

    if (!selectedBook) return [];

    if (!search.trim()) return selectedBook.games;

    const q = search.toLowerCase();

    return selectedBook.games.filter(g =>

      g.white.toLowerCase().includes(q) ||
      g.black.toLowerCase().includes(q) ||
      g.event.toLowerCase().includes(q) ||
      g.opening.toLowerCase().includes(q)

    );

  }, [selectedBook, search]);

  return (
    <div style={{ padding: 20 }}>

      {/* TOP BAR */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          gap: 12,
          alignItems: "center"
        }}
      >

        {/* IMPORT */}
        <label
          style={{
            display: "inline-block",
            padding: "10px 16px",
            background: "#1976d2",
            color: "white",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600
          }}
        >

          📂 Import PGN

          <input
            type="file"
            accept=".pgn"
            onChange={handlePGNFile}
            style={{ display: "none" }}
          />

        </label>

        {/* SEARCH */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search player / opening / event"
          style={{
            padding: 10,
            width: 320,
            borderRadius: 8,
            border: "1px solid #ccc"
          }}
        />

      </div>

      {/* MAIN */}
      <div style={{ display: "flex", gap: 20 }}>

        {/* BOOKS */}
        <div style={{ width: 260 }}>

          <h3>Books</h3>

          <div
            style={{
              maxHeight: "85vh",
              overflowY: "auto"
            }}
          >

            {books.map(book => (

              <div
                key={book.id}

                style={{
                  padding: 10,
                  marginBottom: 8,
                  border: "1px solid #ccc",
                  borderRadius: 6,

                  background:
                    selectedBook?.id === book.id
                      ? "#f0f0f0"
                      : "white"
                }}
              >

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >

                  <div
                    onClick={() => {

                      setSelectedBook(book);
                      setSelectedGame(null);

                    }}
                    style={{
                      cursor: "pointer",
                      flex: 1
                    }}
                  >

                    📘 {book.title}

                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.6
                      }}
                    >

                      {book.games.length} games

                    </div>

                  </div>

                  <button
                    onClick={() => deleteBook(book.id)}
                    style={{
                      marginLeft: 10,
                      cursor: "pointer"
                    }}
                  >

                    ❌

                  </button>

                </div>

              </div>

            ))}

          </div>

        </div>

        {/* GAMES */}
        <div style={{ width: 340 }}>

          <h3>
            Games ({filteredGames.length})
          </h3>

          <div
            style={{
              maxHeight: "85vh",
              overflowY: "auto"
            }}
          >

            {filteredGames.map(game => (

              <div
                key={game.id}

                onClick={() => setSelectedGame(game)}

                style={{
                  padding: 8,
                  marginBottom: 6,
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  cursor: "pointer",

                  background:
                    selectedGame?.id === game.id
                      ? "#ffe082"
                      : "white"
                }}
              >

                <div>
                  ♟ {game.name}
                </div>

                {game.opening && (

                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.6,
                      marginTop: 2
                    }}
                  >

                    {game.opening}

                  </div>

                )}

              </div>

            ))}

          </div>

        </div>

        {/* BOARD */}
        <div style={{ flex: 1 }}>

          {selectedGame ? (

            <Board pgn={selectedGame.pgn} />

          ) : (

            <div
              style={{
                opacity: 0.6,
                paddingTop: 40
              }}
            >

              Select a game

            </div>

          )}

        </div>

      </div>

    </div>
  );
}