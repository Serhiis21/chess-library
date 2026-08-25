import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";

import Board from "./components/Board.jsx";

import {
  getBooks,
  addBook,
  updateBook,
  deleteBook as deleteBookFromDB,
} from "./storage.js";

export default function App() {
  // =========================================================
  // DEVICE
  // =========================================================

  const isMobile = window.innerWidth < 900;

  // =========================================================
  // BOOKS
  // =========================================================

  const [books, setBooks] = useState([]);

  const [loadingBooks, setLoadingBooks] = useState(true);

  // =========================================================
  // FOLDERS
  // =========================================================

  const folders = [
    "General",
    "Miniatures",
    "Openings",
    "Masters",
    "Tactics",
    "Endgames",
  ];

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
  // PGN IMPORT DIALOG
  // =========================================================

  const [showImportDialog, setShowImportDialog] =
    useState(false);

  const [pendingPGNFile, setPendingPGNFile] =
    useState(null);

  const [showFolderSelection, setShowFolderSelection] =
    useState(false);

  const [importingPGN, setImportingPGN] =
    useState(false);

  // =========================================================
  // LOAD BOOKS FROM INDEXEDDB
  // =========================================================

  useEffect(() => {
    let mounted = true;

    async function loadBooks() {
      try {
        const data = await getBooks();

        if (mounted) {
          setBooks(
            Array.isArray(data)
              ? data
              : []
          );
        }
      } catch (error) {
        console.error(
          "IndexedDB load error:",
          error
        );

        if (mounted) {
          alert(
            "Ошибка загрузки библиотеки из IndexedDB."
          );
        }
      } finally {
        if (mounted) {
          setLoadingBooks(false);
        }
      }
    }

    loadBooks();

    return () => {
      mounted = false;
    };
  }, []);

  // =========================================================
  // OPEN PGN FILE
  // =========================================================

  function openPGNImport(e) {
    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    /*
     * Сохраняем файл.
     *
     * Сам импорт пока НЕ выполняем.
     *
     * Сначала пользователь должен
     * открыть окно выбора папки.
     */

    setPendingPGNFile(file);

    setShowImportDialog(true);

    setShowFolderSelection(false);

    e.target.value = "";
  }

  // =========================================================
  // CANCEL PGN IMPORT
  // =========================================================

  function cancelPGNImport() {
    if (importingPGN) {
      return;
    }

    setShowImportDialog(false);

    setShowFolderSelection(false);

    setPendingPGNFile(null);
  }

  // =========================================================
  // SHOW FOLDER SELECTION
  // =========================================================

  function openFolderSelection() {
    if (!pendingPGNFile) {
      return;
    }

    setShowFolderSelection(true);
  }

  // =========================================================
  // IMPORT PGN AFTER FOLDER SELECTION
  // =========================================================

  async function importPGNIntoFolder(
    selectedFolder
  ) {
    if (!pendingPGNFile) {
      return;
    }

    if (importingPGN) {
      return;
    }

    setImportingPGN(true);

    try {
      const text =
        await pendingPGNFile.text();

      /*
       * Разделяем PGN на партии.
       *
       * Основной вариант:
       * [Event "..."]
       *
       * Также учитываем возможные
       * пустые строки перед партией.
       */

      const parts =
        text.split(
          /\r?\n(?=\[Event\s)/i
        );

      const games = [];

      const baseId =
        Date.now();

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

            const history =
              chess.history();

            /*
             * Количество шахматных ходов.
             */

            const moveCount =
              Math.ceil(
                history.length / 2
              );

            let result =
              headers.Result || "*";

            if (
              result === "1/2-1/2"
            ) {
              result = "½-½";
            }

            games.push({
              id:
                baseId +
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

              moveCount,

              result,

              pgn,
            });
          } catch (error) {
            console.log(
              "PGN game error:",
              error
            );
          }
        }
      );

      if (!games.length) {
        alert(
          "В PGN-файле не найдено партий."
        );

        setImportingPGN(false);

        return;
      }

      /*
       * Создаём новую книгу.
       */

      const newBook = {
        id:
          Date.now(),

        title:
          pendingPGNFile.name,

        folder:
          selectedFolder,

        games,
      };

      /*
       * Сохраняем книгу непосредственно
       * в IndexedDB.
       */

      await addBook(
        newBook
      );

      /*
       * Обновляем React state.
       */

      setBooks(
        (prev) => [
          ...prev,
          newBook,
        ]
      );

      /*
       * Выбираем новую папку.
       */

      setFolder(
        selectedFolder
      );

      setOpenFolders(
        (prev) => ({
          ...prev,
          [selectedFolder]: true,
        })
      );

      /*
       * Сразу выбираем импортированную книгу.
       */

      setSelectedBook(
        newBook
      );

      setSelectedGame(null);

      setSearch("");

      /*
       * Закрываем окно.
       */

      setShowImportDialog(false);

      setShowFolderSelection(false);

      setPendingPGNFile(null);

      alert(
        `Импортировано партий: ${games.length}`
      );
    } catch (error) {
      console.error(
        "PGN import error:",
        error
      );

      alert(
        "PGN import error: " +
          (
            error?.message ||
            error
          )
      );
    } finally {
      setImportingPGN(false);
    }
  }

  // =========================================================
  // EXPORT LIBRARY
  // =========================================================

  async function exportLibrary() {
    try {
      const data =
        await getBooks();

      const json =
        JSON.stringify(
          data,
          null,
          2
        );

      const blob =
        new Blob(
          [json],
          {
            type:
              "application/json",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const a =
        document.createElement(
          "a"
        );

      a.href = url;

      a.download =
        "chess-library-backup.json";

      document.body.appendChild(
        a
      );

      a.click();

      document.body.removeChild(
        a
      );

      URL.revokeObjectURL(
        url
      );
    } catch (error) {
      console.error(
        "Export error:",
        error
      );

      alert(
        "Ошибка экспорта библиотеки."
      );
    }
  }

  // =========================================================
  // IMPORT BACKUP
  // =========================================================

  async function importLibrary(e) {
    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text =
        await file.text();

      const data =
        JSON.parse(text);

      if (!Array.isArray(data)) {
        alert(
          "Wrong backup file"
        );

        return;
      }

      /*
       * Добавляем книги в IndexedDB.
       */

      for (
        const book of data
      ) {
        await addBook(book);
      }

      /*
       * Перечитываем библиотеку.
       */

      const updated =
        await getBooks();

      setBooks(
        Array.isArray(updated)
          ? updated
          : []
      );

      setSelectedBook(null);

      setSelectedGame(null);

      alert(
        "Library restored"
      );
    } catch (error) {
      console.error(
        "Backup import error:",
        error
      );

      alert(
        "Import error"
      );
    }

    e.target.value = "";
  }

  // =========================================================
  // DELETE BOOK
  // =========================================================

  async function deleteBook(id) {
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

    try {
      await deleteBookFromDB(
        id
      );

      setBooks(
        (prev) =>
          prev.filter(
            (item) =>
              item.id !== id
          )
      );

      if (
        selectedBook &&
        selectedBook.id === id
      ) {
        setSelectedBook(null);

        setSelectedGame(null);
      }
    } catch (error) {
      console.error(
        "Delete book error:",
        error
      );

      alert(
        "Ошибка удаления книги."
      );
    }
  }

  // =========================================================
  // RENAME BOOK
  // =========================================================

  async function renameBook(id) {
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

    const updatedBook = {
      ...book,
      title:
        newName,
    };

    try {
      await updateBook(
        updatedBook
      );

      setBooks(
        (prev) =>
          prev.map(
            (item) =>
              item.id === id
                ? updatedBook
                : item
          )
      );

      if (
        selectedBook &&
        selectedBook.id === id
      ) {
        setSelectedBook(
          updatedBook
        );
      }
    } catch (error) {
      console.error(
        "Rename book error:",
        error
      );

      alert(
        "Ошибка переименования книги."
      );
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

      const games =
        selectedBook.games ||
        [];

      if (!search.trim()) {
        return games;
      }

      const q =
        search
          .trim()
          .toLowerCase();

      return games.filter(
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
    setSelectedBook(
      book
    );

    setSelectedGame(
      null
    );

    setSearch("");
  }

  // =========================================================
  // SELECT GAME
  // =========================================================

  function selectGame(game) {
    setSelectedGame(
      game
    );

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
  // LOADING
  // =========================================================

  if (loadingBooks) {
    return (
      <div
        style={{
          minHeight:
            "100vh",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          fontFamily:
            "Arial, sans-serif",
          fontSize:
            18,
        }}
      >
        ⏳ Loading chess library...
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <>
      <div
        style={{
          width:
            "100%",
          minHeight:
            "100vh",
          padding:
            20,
          boxSizing:
            "border-box",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        {/* ===================================================
            TOP BAR
        =================================================== */}

        <div
          style={{
            display:
              "flex",
            gap:
              12,
            flexWrap:
              "wrap",
            marginBottom:
              20,
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
              color:
                "white",
              padding:
                "10px 16px",
              borderRadius:
                8,
              cursor:
                "pointer",
              fontWeight:
                600,
            }}
          >
            📂 Import PGN

            <input
              type="file"
              accept=".pgn"
              onChange={
                openPGNImport
              }
              style={{
                display:
                  "none",
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
              borderRadius:
                8,
              cursor:
                "pointer",
              border:
                "1px solid #ccc",
              background:
                "white",
              fontWeight:
                600,
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
              color:
                "white",
              padding:
                "10px 16px",
              borderRadius:
                8,
              cursor:
                "pointer",
              fontWeight:
                600,
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
                display:
                  "none",
              }}
            />
          </label>

          {/* SEARCH */}

          <input
            value={
              search
            }
            onChange={(
              e
            ) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search player / opening / event"
            style={{
              padding:
                10,
              width:
                isMobile
                  ? "100%"
                  : 320,
              maxWidth:
                "100%",
              boxSizing:
                "border-box",
              borderRadius:
                8,
              border:
                "1px solid #ccc",
            }}
          />
        </div>

        {/* ===================================================
            MAIN AREA
        =================================================== */}

        <div
          style={{
            display:
              "flex",
            gap:
              20,
            flexDirection:
              isMobile
                ? "column"
                : "row",
            alignItems:
              "flex-start",
            width:
              "100%",
          }}
        >
          {/* =================================================
              BOOKS
          ================================================= */}

          <div
            style={{
              width:
                isMobile
                  ? "100%"
                  : 280,
              flexShrink:
                0,
            }}
          >
            <h3
              style={{
                marginTop:
                  0,
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
              ).length ===
                0 && (
                <div
                  style={{
                    padding:
                      12,
                    opacity:
                      0.6,
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
                          (
                            prev
                          ) => ({
                            ...prev,

                            [folderName]:
                              !prev[
                                folderName
                              ],
                          })
                        )
                      }
                      style={{
                        padding:
                          8,
                        cursor:
                          "pointer",
                        background:
                          "#eee",
                        borderRadius:
                          8,
                        fontWeight:
                          700,
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
                          (
                            book
                          ) => (
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
                                  gap:
                                    8,
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
                                    flex:
                                      1,
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
                                    gap:
                                      5,
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

          {/* =================================================
              GAMES
          ================================================= */}

          <div
            style={{
              width:
                isMobile
                  ? "100%"
                  : 340,
              flexShrink:
                0,
            }}
          >
            {/* SELECTED BOOK HEADER */}

            {selectedBook && (
              <div
                style={{
                  marginBottom:
                    14,
                  padding:
                    "14px 16px",
                  background:
                    "#f5f7fa",
                  borderRadius:
                    10,
                  border:
                    "1px solid #ddd",
                  boxSizing:
                    "border-box",
                }}
              >
                <div
                  style={{
                    fontSize:
                      17,
                    fontWeight:
                      700,
                    wordBreak:
                      "break-word",
                  }}
                >
                  📖{" "}
                  {
                    selectedBook.title
                  }
                </div>

                <div
                  style={{
                    marginTop:
                      5,
                    fontSize:
                      13,
                    opacity:
                      0.65,
                  }}
                >
                  {
                    (
                      selectedBook.games ||
                      []
                    ).length
                  }{" "}
                  партий
                </div>
              </div>
            )}

            {/* GAMES TITLE */}

            <h3
              style={{
                marginTop:
                  0,
                marginBottom:
                  12,
              }}
            >
              ♟ Партии (
              {
                filteredGames.length
              }
              )
            </h3>

            {!selectedBook && (
              <div
                style={{
                  padding:
                    12,
                  opacity:
                    0.6,
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
                ) => (
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
                      padding:
                        10,
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
                        fontWeight:
                          selectedGame?.id ===
                          game.id
                            ? 700
                            : 500,
                      }}
                    >
                      ♟{" "}
                      {index +
                        1}
                      .{" "}
                      {
                        game.name
                      }
                    </div>

                    {/* MOVES + RESULT */}

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap:
                          10,
                        marginTop:
                          6,
                      }}
                    >
                      <div
                        style={{
                          fontSize:
                            12,
                          opacity:
                            0.7,
                        }}
                      >
                        ♟{" "}
                        {
                          game.moveCount ||
                          0
                        }{" "}
                        {game.moveCount ===
                        1
                          ? "ход"
                          : game.moveCount >=
                                2 &&
                            game.moveCount <=
                              4
                          ? "хода"
                          : "ходов"}
                      </div>

                      <div
                        style={{
                          fontSize:
                            13,
                          fontWeight:
                            700,
                          padding:
                            "3px 8px",
                          borderRadius:
                            6,
                          background:
                            "#f0f0f0",
                        }}
                      >
                        {
                          game.result ||
                          "*"
                        }
                      </div>
                    </div>

                    {/* OPENING */}

                    {game.opening && (
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
                          game.opening
                        }
                      </div>
                    )}

                    {/* EVENT */}

                    {game.event && (
                      <div
                        style={{
                          fontSize:
                            11,
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
                )
              )}
            </div>
          </div>

          {/* =================================================
              BOARD
          ================================================= */}

          <div
            id="chess-board-container"
            style={{
              flex:
                1,
              minWidth:
                0,
              width:
                isMobile
                  ? "100%"
                  : "auto",
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
                  paddingTop:
                    40,
                  paddingBottom:
                    40,
                  opacity:
                    0.6,
                }}
              >
                Select a game
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          PGN IMPORT MODAL
      ===================================================== */}

      {showImportDialog && (
        <div
          style={{
            position:
              "fixed",
            inset:
              0,
            background:
              "rgba(0,0,0,0.55)",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            zIndex:
              10000,
            padding:
              20,
            boxSizing:
              "border-box",
          }}
        >
          <div
            style={{
              width:
                "100%",
              maxWidth:
                500,
              background:
                "white",
              borderRadius:
                16,
              padding:
                24,
              boxSizing:
                "border-box",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            {/* TITLE */}

            <h2
              style={{
                marginTop:
                  0,
                marginBottom:
                  12,
              }}
            >
              📂 Импорт PGN
            </h2>

            {/* FILE */}

            <div
              style={{
                padding:
                  14,
                background:
                  "#f5f5f5",
                borderRadius:
                  10,
                marginBottom:
                  20,
                wordBreak:
                  "break-word",
              }}
            >
              <strong>
                Файл:
              </strong>

              <br />

              {
                pendingPGNFile?.name ||
                ""
              }
            </div>

            {!showFolderSelection ? (
              <>
                <div
                  style={{
                    marginBottom:
                      20,
                    lineHeight:
                      1.5,
                  }}
                >
                  Для импорта книги
                  необходимо выбрать
                  папку, в которую она
                  будет помещена.
                </div>

                {/* REQUIRED FOLDER BUTTON */}

                <button
                  type="button"
                  onClick={
                    openFolderSelection
                  }
                  style={{
                    width:
                      "100%",
                    padding:
                      "14px 18px",
                    border:
                      "none",
                    borderRadius:
                      10,
                    background:
                      "#1976d2",
                    color:
                      "white",
                    cursor:
                      "pointer",
                    fontSize:
                      16,
                    fontWeight:
                      700,
                  }}
                >
                  📁 Выбор папки
                </button>

                <button
                  type="button"
                  onClick={
                    cancelPGNImport
                  }
                  style={{
                    width:
                      "100%",
                    marginTop:
                      10,
                    padding:
                      "12px 18px",
                    border:
                      "1px solid #ccc",
                    borderRadius:
                      10,
                    background:
                      "white",
                    cursor:
                      "pointer",
                    fontSize:
                      15,
                  }}
                >
                  Отмена
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontWeight:
                      700,
                    marginBottom:
                      12,
                  }}
                >
                  📁 Выберите папку
                </div>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      isMobile
                        ? "1fr"
                        : "1fr 1fr",
                    gap:
                      10,
                  }}
                >
                  {folders.map(
                    (
                      folderName
                    ) => (
                      <button
                        key={
                          folderName
                        }
                        type="button"
                        disabled={
                          importingPGN
                        }
                        onClick={() =>
                          importPGNIntoFolder(
                            folderName
                          )
                        }
                        style={{
                          padding:
                            "14px 10px",
                          border:
                            "1px solid #ccc",
                          borderRadius:
                            10,
                          background:
                            folderName ===
                            folder
                              ? "#e3f2fd"
                              : "white",
                          cursor:
                            importingPGN
                              ? "wait"
                              : "pointer",
                          fontSize:
                            15,
                          fontWeight:
                            600,
                        }}
                      >
                        📂{" "}
                        {
                          folderName
                        }
                      </button>
                    )
                  )}
                </div>

                {importingPGN && (
                  <div
                    style={{
                      textAlign:
                        "center",
                      marginTop:
                        18,
                      fontWeight:
                        600,
                    }}
                  >
                    ⏳ Импортируем
                    партии...
                  </div>
                )}

                {!importingPGN && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowFolderSelection(
                        false
                      )
                    }
                    style={{
                      width:
                        "100%",
                      marginTop:
                        14,
                      padding:
                        "12px 18px",
                      border:
                        "1px solid #ccc",
                      borderRadius:
                        10,
                      background:
                        "white",
                      cursor:
                        "pointer",
                    }}
                  >
                    ← Назад
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}






