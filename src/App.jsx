import { useMemo, useState } from "react";
import { Chess } from "chess.js";

import Board from "./components/Board.jsx";

export default function App() {
  // =========================================================
  // DEVICE
  // =========================================================

  const isMobile = window.innerWidth < 900;

  // =========================================================
  // BOOKS
  // =========================================================

  const [books, setBooks] = useState(() => {
    const saved = localStorage.getItem("chess-books");

    if (!saved) {
      return [];
    }

    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  // =========================================================
  // FOLDERS
  // =========================================================

  const [folder, setFolder] = useState("General");

  const [openFolders, setOpenFolders] = useState({
    General: true,
  });

  // =========================================================
  // SELECTION
  // =========================================================

  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  // =========================================================
  // SEARCH
  // =========================================================

  const [search, setSearch] = useState("");

  // =========================================================
  // SAVE BOOKS
  // =========================================================

  function saveBooks(data) {
    setBooks(data);

    localStorage.setItem(
      "chess-books",
      JSON.stringify(data)
    );
  }

  // =========================================================
  // EXPORT
  // =========================================================

  function exportLibrary() {
    const data = JSON.stringify(
      books,
      null,
      2
    );

    const blob = new Blob(
      [data],
      {
        type: "application/json",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      "chess-library-backup.json";

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  // =========================================================
  // IMPORT BACKUP
  // =========================================================

  function importLibrary(e) {
    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = (event) => {
      try {
        const data =
          JSON.parse(
            event.target.result
          );

        if (!Array.isArray(data)) {
          alert(
            "Wrong backup file"
          );

          return;
        }

        saveBooks(data);

        setSelectedBook(null);
        setSelectedGame(null);

        alert(
          "Library restored"
        );
      } catch {
        alert(
          "Import error"
        );
      }
    };

    reader.readAsText(file);

    e.target.value = "";
  }

  // =========================================================
  // PGN IMPORT
  // =========================================================

  async function handlePGNFile(e) {
    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text =
        await file.text();

      const games = [];

      /*
       * PGN files normally contain
       * games starting with [Event "..."].
       */

      const parts =
        text.split(
          /\r?\n(?=\[Event\s)/i
        );

      parts.forEach(
        (pgn, index) => {
          if (!pgn.trim()) {
            return;
          }

          try {
            const chess =
              new Chess();

            chess.loadPgn(
              pgn,
              {
                sloppy: true,
              }
            );

            const headers =
              chess.header();

            games.push({
              id:
                Date.now() +
                index,

              name:
                `${headers.White || "White"} - ${
                  headers.Black || "Black"
                }`,

              white:
                headers.White || "",

              black:
                headers.Black || "",

              event:
                headers.Event || "",

              opening:
                headers.Opening || "",

              year:
                headers.Date || "",

              pgn,
            });
          } catch (error) {
            console.log(
              "PGN error:",
              error
            );
          }
        }
      );

      if (!games.length) {
        alert(
          "No games found in PGN"
        );

        return;
      }

      const newBook = {
        id: Date.now(),

        title: file.name,

        folder,

        games,
      };

      const updated = [
        ...books,
        newBook,
      ];

      saveBooks(updated);

      setSelectedBook(
        newBook
      );

      setSelectedGame(
        null
      );
    } catch (error) {
      console.error(
        "PGN import error:",
        error
      );

      alert(
        "PGN import error"
      );
    }

    e.target.value = "";
  }

  // =========================================================
  // GAME INFO
  // =========================================================

  function getGameInfo(game) {
    try {
      const chess =
        new Chess();

      chess.loadPgn(
        game.pgn,
        {
          sloppy: true,
        }
      );

      const history =
        chess.history();

      const headers =
        chess.header();

      /*
       * chess.history() возвращает
       * количество полуходов.
       *
       * Например:
       * 56 полуходов = партия
       * закончилась после 28-го
       * хода чёрных.
       *
       * Поэтому показываем номер
       * последнего полного хода.
       */

      const moveCount =
        Math.ceil(
          history.length / 2
        );

      let result =
        headers.Result || "*";

      /*
       * Делаем ничью более красивой
       * для отображения в интерфейсе.
       */

      if (
        result === "1/2-1/2"
      ) {
        result = "½-½";
      }

      return {
        moveCount,
        result,
      };
    } catch {
      return {
        moveCount: 0,
        result: "*",
      };
    }
  }

  // =========================================================
  // DELETE BOOK
  // =========================================================

  function deleteBook(id) {
    const book =
      books.find(
        (item) =>
          item.id === id
      );

    if (!book) {
      return;
    }

    const ok =
      window.confirm(
        `Delete book "${book.title}"?`
      );

    if (!ok) {
      return;
    }

    const updated =
      books.filter(
        (item) =>
          item.id !== id
      );

    saveBooks(updated);

    if (
      selectedBook &&
      selectedBook.id === id
    ) {
      setSelectedBook(null);
      setSelectedGame(null);
    }
  }

  // =========================================================
  // RENAME BOOK
  // =========================================================

  function renameBook(id) {
    const book =
      books.find(
        (item) =>
          item.id === id
      );

    if (!book) {
      return;
    }

    const name =
      window.prompt(
        "New book name:",
        book.title
      );

    if (
      !name ||
      !name.trim()
    ) {
      return;
    }

    const newName =
      name.trim();

    const updated =
      books.map(
        (item) => {
          if (
            item.id !== id
          ) {
            return item;
          }

          return {
            ...item,
            title: newName,
          };
        }
      );

    saveBooks(updated);

    if (
      selectedBook &&
      selectedBook.id === id
    ) {
      setSelectedBook({
        ...selectedBook,
        title: newName,
      });
    }
  }

  // =========================================================
  // GROUP BOOKS
  // =========================================================

  const groupedBooks =
    useMemo(() => {
      return books.reduce(
        (
          acc,
          book
        ) => {
          const name =
            book.folder ||
            "General";

          if (!acc[name]) {
            acc[name] = [];
          }

          acc[name].push(
            book
          );

          return acc;
        },
        {}
      );
    }, [books]);

  // =========================================================
  // FILTER GAMES
  // =========================================================

  const filteredGames =
    useMemo(() => {
      if (!selectedBook) {
        return [];
      }

      if (!search.trim()) {
        return (
          selectedBook.games ||
          []
        );
      }

      const q =
        search
          .trim()
          .toLowerCase();

      return (
        selectedBook.games ||
        []
      ).filter(
        (game) => {
          return (
            (game.white || "")
              .toLowerCase()
              .includes(q) ||

            (game.black || "")
              .toLowerCase()
              .includes(q) ||

            (game.event || "")
              .toLowerCase()
              .includes(q) ||

            (game.opening || "")
              .toLowerCase()
              .includes(q) ||

            (game.name || "")
              .toLowerCase()
              .includes(q)
          );
        }
      );
    }, [
      selectedBook,
      search,
    ]);

  // =========================================================
  // SELECT BOOK
  // =========================================================

  function selectBook(book) {
    setSelectedBook(book);

    setSelectedGame(
      null
    );

    setSearch("");
  }

  // =========================================================
  // SELECT GAME
  // =========================================================

  function selectGame(game) {
    setSelectedGame(game);

    if (isMobile) {
      setTimeout(() => {
        document
          .getElementById(
            "chess-board-container"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",
            block:
              "start",
          });
      }, 100);
    }
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        padding: 20,
        boxSizing:
          "border-box",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
          alignItems:
            "center",
        }}
      >
        {/* IMPORT PGN */}

        <label
          style={{
            display:
              "inline-block",
            background:
              "#1976d2",
            color: "white",
            padding:
              "10px 16px",
            borderRadius: 8,
            cursor:
              "pointer",
            fontWeight: 600,
          }}
        >
          📂 Import PGN

          <input
            type="file"
            accept=".pgn"
            onChange={
              handlePGNFile
            }
            style={{
              display: "none",
            }}
          />
        </label>

        {/* EXPORT */}

        <button
          type="button"
          onClick={
            exportLibrary
          }
          style={{
            padding:
              "10px 16px",
            borderRadius: 8,
            cursor:
              "pointer",
            border:
              "1px solid #ccc",
            background:
              "white",
            fontWeight: 600,
          }}
        >
          💾 Export Library
        </button>

        {/* IMPORT BACKUP */}

        <label
          style={{
            display:
              "inline-block",
            background:
              "#4caf50",
            color: "white",
            padding:
              "10px 16px",
            borderRadius: 8,
            cursor:
              "pointer",
            fontWeight: 600,
          }}
        >
          📥 Import Backup

          <input
            type="file"
            accept=".json"
            onChange={
              importLibrary
            }
            style={{
              display: "none",
            }}
          />
        </label>

        {/* FOLDER */}

        <select
          value={folder}
          onChange={(e) =>
            setFolder(
              e.target.value
            )
          }
          style={{
            padding: 10,
            borderRadius: 8,
            border:
              "1px solid #ccc",
          }}
        >
          <option>
            General
          </option>

          <option>
            Miniatures
          </option>

          <option>
            Openings
          </option>

          <option>
            Masters
          </option>

          <option>
            Tactics
          </option>

          <option>
            Endgames
          </option>
        </select>

        {/* SEARCH */}

        <input
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          placeholder="Search player / opening / event"
          style={{
            padding: 10,
            width: isMobile
              ? "100%"
              : 320,
            maxWidth: "100%",
            boxSizing:
              "border-box",
            borderRadius: 8,
            border:
              "1px solid #ccc",
          }}
        />
      </div>

      {/* =====================================================
          MAIN AREA
      ===================================================== */}

      <div
        style={{
          display: "flex",
          gap: 20,

          flexDirection:
            isMobile
              ? "column"
              : "row",

          alignItems:
            "flex-start",

          width: "100%",
        }}
      >
        {/* ===================================================
            BOOKS
        =================================================== */}

        <div
          style={{
            width: isMobile
              ? "100%"
              : 280,

            flexShrink: 0,
          }}
        >
          <h3
            style={{
              marginTop: 0,
            }}
          >
            📚 Books
          </h3>

          <div
            style={{
              maxHeight:
                isMobile
                  ? 300
                  : "80vh",

              overflowY:
                "auto",
            }}
          >
            {Object.keys(
              groupedBooks
            ).length === 0 && (
              <div
                style={{
                  padding: 12,
                  opacity: 0.6,
                }}
              >
                No books yet.
                <br />
                Import a PGN
                file.
              </div>
            )}

            {Object.entries(
              groupedBooks
            ).map(
              ([
                folderName,
                folderBooks,
              ]) => (
                <div
                  key={
                    folderName
                  }
                  style={{
                    marginBottom:
                      15,
                  }}
                >
                  {/* FOLDER HEADER */}

                  <div
                    onClick={() =>
                      setOpenFolders(
                        (prev) => ({
                          ...prev,

                          [folderName]:
                            !prev[
                              folderName
                            ],
                        })
                      )
                    }
                    style={{
                      padding: 8,
                      cursor:
                        "pointer",
                      background:
                        "#eee",
                      borderRadius:
                        8,
                      fontWeight: 700,
                      userSelect:
                        "none",
                    }}
                  >
                    {openFolders[
                      folderName
                    ]
                      ? "▼"
                      : "▶"}{" "}
                    📂{" "}
                    {
                      folderName
                    }{" "}
                    (
                    {
                      folderBooks.length
                    }
                    )
                  </div>

                  {/* BOOKS */}

                  {openFolders[
                    folderName
                  ] && (
                    <div>
                      {folderBooks.map(
                        (book) => (
                          <div
                            key={
                              book.id
                            }
                            style={{
                              marginTop:
                                8,
                              marginLeft:
                                10,
                              padding:
                                10,
                              borderRadius:
                                8,

                              border:
                                selectedBook?.id ===
                                book.id
                                  ? "2px solid #1976d2"
                                  : "1px solid #ccc",

                              background:
                                "white",
                            }}
                          >
                            <div
                              style={{
                                display:
                                  "flex",
                                justifyContent:
                                  "space-between",
                                alignItems:
                                  "flex-start",
                                gap: 8,
                              }}
                            >
                              {/* BOOK NAME */}

                              <div
                                onClick={() =>
                                  selectBook(
                                    book
                                  )
                                }
                                style={{
                                  cursor:
                                    "pointer",
                                  flex: 1,
                                  minWidth:
                                    0,
                                }}
                              >
                                <div
                                  style={{
                                    wordBreak:
                                      "break-word",
                                  }}
                                >
                                  📘{" "}
                                  {
                                    book.title
                                  }
                                </div>

                                <div
                                  style={{
                                    fontSize:
                                      12,
                                    opacity:
                                      0.6,
                                    marginTop:
                                      4,
                                  }}
                                >
                                  {
                                    (
                                      book.games ||
                                      []
                                    ).length
                                  }{" "}
                                  games
                                </div>
                              </div>

                              {/* BUTTONS */}

                              <div
                                style={{
                                  display:
                                    "flex",
                                  gap: 5,
                                  flexShrink:
                                    0,
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={(
                                    e
                                  ) => {
                                    e.stopPropagation();

                                    renameBook(
                                      book.id
                                    );
                                  }}
                                  style={{
                                    cursor:
                                      "pointer",
                                    padding:
                                      "5px 7px",
                                    borderRadius:
                                      6,
                                    border:
                                      "1px solid #ccc",
                                    background:
                                      "white",
                                  }}
                                  title="Rename book"
                                >
                                  ✏️
                                </button>

                                <button
                                  type="button"
                                  onClick={(
                                    e
                                  ) => {
                                    e.stopPropagation();

                                    deleteBook(
                                      book.id
                                    );
                                  }}
                                  style={{
                                    cursor:
                                      "pointer",
                                    padding:
                                      "5px 7px",
                                    borderRadius:
                                      6,
                                    border:
                                      "1px solid #ccc",
                                    background:
                                      "white",
                                  }}
                                  title="Delete book"
                                >
                                  ❌
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>

        {/* ===================================================
            GAMES
        =================================================== */}

        <div
          style={{
            width: isMobile
              ? "100%"
              : 340,

            flexShrink: 0,
          }}
        >
          <h3
            style={{
              marginTop: 0,
            }}
          >
            ♟ Games (
            {
              filteredGames.length
            }
            )
          </h3>

          {!selectedBook && (
            <div
              style={{
                padding: 12,
                opacity: 0.6,
              }}
            >
              Select a book
            </div>
          )}

          <div
            style={{
              maxHeight:
                isMobile
                  ? 300
                  : "80vh",

              overflowY:
                "auto",
            }}
          >
            {filteredGames.map(
              (
                game,
                index
              ) => {
                const gameInfo =
                  getGameInfo(
                    game
                  );

                return (
                  <div
                    key={
                      game.id
                    }
                    onClick={() =>
                      selectGame(
                        game
                      )
                    }
                    style={{
                      padding: 10,
                      marginBottom:
                        8,
                      cursor:
                        "pointer",
                      borderRadius:
                        8,

                      border:
                        selectedGame?.id ===
                        game.id
                          ? "2px solid #ff9800"
                          : "1px solid #ddd",

                      background:
                        selectedGame?.id ===
                        game.id
                          ? "#fff3cd"
                          : "white",
                    }}
                  >
                    {/* GAME NAME */}

                    <div
                      style={{
                        wordBreak:
                          "break-word",
                      }}
                    >
                      ♟{" "}
                      {index + 1}.{" "}
                      {game.name}
                    </div>

                    {/* MOVES + RESULT */}

                    <div
                      style={{
                        fontSize: 12,
                        marginTop: 5,
                        opacity: 0.7,
                      }}
                    >
                      {gameInfo.moveCount}{" "}
                      {gameInfo.moveCount ===
                      1
                        ? "ход"
                        : gameInfo.moveCount >=
                            2 &&
                          gameInfo.moveCount <=
                            4
                          ? "хода"
                          : "ходов"}

                      {" · "}

                      <strong>
                        {
                          gameInfo.result
                        }
                      </strong>
                    </div>

                    {/* OPENING */}

                    {game.opening && (
                      <div
                        style={{
                          fontSize: 12,
                          opacity:
                            0.6,
                          marginTop:
                            4,
                        }}
                      >
                        {
                          game.opening
                        }
                      </div>
                    )}

                    {/* EVENT */}

                    {game.event && (
                      <div
                        style={{
                          fontSize: 11,
                          opacity:
                            0.5,
                          marginTop:
                            2,
                        }}
                      >
                        {
                          game.event
                        }
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* ===================================================
            BOARD
        =================================================== */}

        <div
          id="chess-board-container"
          style={{
            flex: 1,
            minWidth: 0,
            width: isMobile
              ? "100%"
              : "auto",

            /*
             * IMPORTANT:
             * Board is part of the main flex row on desktop.
             *
             * On Android it comes immediately after
             * Books and Games, and Board.jsx itself
             * contains the analysis panel.
             */
          }}
        >
          {selectedGame ? (
            <Board
              pgn={
                selectedGame.pgn
              }
            />
          ) : (
            <div
              style={{
                paddingTop: 40,
                paddingBottom: 40,
                opacity: 0.6,
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