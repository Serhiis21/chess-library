import { useMemo, useState } from "react";
import { Chess } from "chess.js";

import Board from "./components/Board.jsx";

export default function App() {

  // =========================
  // DEVICE
  // =========================

  const isDesktop =
    window.innerWidth > 900;


  // =========================
  // BOOK STORAGE
  // =========================

  const [books, setBooks] = useState(() => {

    const saved =
      localStorage.getItem("chess-books");

    try {

      return saved
        ? JSON.parse(saved)
        : [];

    } catch {

      return [];

    }

  });


  // =========================
  // FOLDERS
  // =========================

  const [folder, setFolder] =
    useState("General");


  const [openFolders, setOpenFolders] =
    useState({
      General: true
    });


  // =========================
  // SELECTION
  // =========================

  const [selectedBook, setSelectedBook] =
    useState(null);


  const [selectedGame, setSelectedGame] =
    useState(null);


  // =========================
  // SEARCH
  // =========================

  const [search, setSearch] =
    useState("");


  // =========================
  // SAVE BOOKS
  // =========================

  function saveBooks(data) {

    setBooks(data);

    localStorage.setItem(
      "chess-books",
      JSON.stringify(data)
    );

  }
  // =========================
// EXPORT LIBRARY
// =========================

function exportLibrary() {

  const data =
    JSON.stringify(
      books,
      null,
      2
    );


  const blob =
    new Blob(
      [data],
      {
        type:"application/json"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const a =
    document.createElement("a");


  a.href = url;

  a.download =
    "chess-library-backup.json";


  a.click();


  URL.revokeObjectURL(url);

}



// =========================
// IMPORT LIBRARY
// =========================

function importLibrary(e) {

  const file =
    e.target.files[0];


  if (!file)
    return;


  const reader =
    new FileReader();


  reader.onload =
    event => {

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

}
  


  // =========================
  // PGN IMPORT
  // =========================

  async function handlePGNFile(e) {

    const file =
      e.target.files[0];


    if (!file)
      return;


    const text =
      await file.text();


    const games = [];


    // разделяем PGN партии
    const parts =
      text.split(
        /\n(?=\[Event )/
      );


    parts.forEach(
      (pgn, index) => {


        if (!pgn.trim())
          return;


        try {

          const chess =
            new Chess();


          chess.loadPgn(
            pgn,
            {
              sloppy: true
            }
          );


          const headers =
            chess.header();


          games.push({

            id:
              Date.now() +
              index,


            name:
              `${headers.White || "White"} - ${headers.Black || "Black"}`,


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


            pgn

          });


        } catch(err) {

          console.log(
            "PGN error",
            err
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

      id:
        Date.now(),


      title:
        file.name,


      folder,


      games

    };


    const updated =
      [
        ...books,
        newBook
      ];


    saveBooks(updated);


    e.target.value = "";

  }


  // =========================
  // DELETE BOOK
  // =========================

  function deleteBook(id) {

    const updated =
      books.filter(
        b =>
          b.id !== id
      );


    saveBooks(updated);


    if (
      selectedBook?.id === id
    ) {

      setSelectedBook(null);

      setSelectedGame(null);

    }

  }
  // =========================
// RENAME BOOK
// =========================

function renameBook(id) {

  const book =
    books.find(
      b => b.id === id
    );


  if (!book)
    return;


  const name =
    prompt(
      "New book name:",
      book.title
    );


  if (!name)
    return;


  const updated =
    books.map(
      b =>

        b.id === id

        ? {
            ...b,
            title: name
          }

        : b
    );


  saveBooks(updated);


  if (
    selectedBook?.id === id
  ) {

    setSelectedBook(
      {
        ...selectedBook,
        title: name
      }
    );

  }

}
    // =========================
  // GROUP BOOKS
  // =========================

  const groupedBooks =
    books.reduce(
      (acc, book) => {

        const name =
          book.folder || "General";


        if (!acc[name]) {

          acc[name] = [];

        }


        acc[name].push(book);


        return acc;

      },
      {}
    );


  // =========================
  // FILTER GAMES
  // =========================

  const filteredGames =
    useMemo(() => {


      if (!selectedBook)
        return [];


      if (!search.trim())
        return selectedBook.games;


      const q =
        search.toLowerCase();



      return selectedBook.games.filter(
        game => {


          return (

            game.white
              .toLowerCase()
              .includes(q)


            ||

            game.black
              .toLowerCase()
              .includes(q)


            ||

            game.event
              .toLowerCase()
              .includes(q)


            ||

            game.opening
              .toLowerCase()
              .includes(q)

          );


        }
      );


    }, [
      selectedBook,
      search
    ]);



  // =========================
  // RETURN
  // =========================

  return (

    <div
      style={{
        padding: 20,
        fontFamily: "Arial"
      }}
    >


      {/* =====================
          TOP BAR
      ====================== */}

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20
        }}
      >


        {isDesktop && (

<label

style={{

  background:"#1976d2",

  color:"white",

  padding:"10px 16px",

  borderRadius:8,

  cursor:"pointer",

  fontWeight:600

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
  display:"none"
}}

/>


</label>

)}



<button

onClick={exportLibrary}

style={{

  padding:"10px 16px",

  borderRadius:8,

  cursor:"pointer"

}}

>

💾 Export Library

</button>




<label

style={{

  background:"#4caf50",

  color:"white",

  padding:"10px 16px",

  borderRadius:8,

  cursor:"pointer"

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
  display:"none"
}}

/>


</label>



        <select

          value={folder}

          onChange={
            e =>
              setFolder(
                e.target.value
              )
          }


          style={{
            padding:10,
            borderRadius:8
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




        <input

          value={search}

          onChange={
            e =>
              setSearch(
                e.target.value
              )
          }

          placeholder=
            "Search player / opening / event"


          style={{

            padding:10,

            width:
              window.innerWidth < 700
              ? "100%"
              : 320,

            borderRadius:8,

            border:
              "1px solid #ccc"

          }}

        />


      </div>



      {/* =====================
          MAIN AREA
      ====================== */}


      <div

        style={{

          display:"flex",

          gap:20,


          flexDirection:

            window.innerWidth < 900

            ? "column"

            : "row"

        }}

      >



        {/* =====================
            BOOK LIST
        ====================== */}


        <div

          style={{

            width:

              window.innerWidth < 900

              ? "100%"

              : 280

          }}

        >

          <h3>
            📚 Books
          </h3>



          <div

            style={{

              maxHeight:
                "80vh",

              overflowY:
                "auto"

            }}

          >

            {Object.entries(
              groupedBooks
            )
            .map(
              (
                [
                  folderName,
                  folderBooks
                ]
              ) => (


              <div

                key={folderName}

                style={{
                  marginBottom:15
                }}

              >


                <div

                  onClick={() =>
                    setOpenFolders(
                      prev => ({

                        ...prev,

                        [folderName]:
                          !prev[folderName]

                      })
                    )
                  }


                  style={{

                    padding:8,

                    cursor:"pointer",

                    background:
                      "#eee",

                    borderRadius:8,

                    fontWeight:700

                  }}

                >

                  {
                    openFolders[folderName]
                    ? "▼"
                    : "▶"
                  }

                  {" "}

                  📂 {folderName}

                  {" "}

                  ({folderBooks.length})


                </div>


                {
                  openFolders[folderName] && (

                    <div>

                      {
                        folderBooks.map(
                          book => (

                            <div

                              key={book.id}

                              style={{

                                marginTop:8,

                                marginLeft:10,

                                padding:10,

                                borderRadius:8,

                                border:
                                  selectedBook?.id === book.id

                                  ? "2px solid #1976d2"

                                  : "1px solid #ccc"

                              }}

                            >

                              <div

                                style={{

                                  display:"flex",

                                  justifyContent:
                                    "space-between",

                                  gap:8

                                }}

                              >


                                <div

                                  onClick={() => {

                                    setSelectedBook(book);

                                    setSelectedGame(null);

                                  }}


                                  style={{

                                    cursor:"pointer",

                                    flex:1

                                  }}

                                >

                                  📘 {book.title}

                                  <div

                                    style={{

                                      fontSize:12,

                                      opacity:.6

                                    }}

                                  >

                                    {book.games.length}
                                    {" "}
                                    games

                                  </div>


                                </div>


                                {isDesktop && (

  <div

    style={{
      display:"flex",
      gap:6
    }}

  >

    <button

      onClick={() =>
        renameBook(
          book.id
        )
      }

      style={{
        cursor:"pointer"
      }}

    >

      ✏️

    </button>


    <button

      onClick={() =>
        deleteBook(
          book.id
        )
      }

      style={{
        cursor:"pointer"
      }}

    >

      ❌

    </button>


  </div>

)}


                              </div>


                            </div>

                          )
                        )
                      }


                    </div>

                  )
                }


              </div>


            ))}


          </div>


        </div>
                {/* =====================
            GAMES LIST
        ====================== */}


        <div

          style={{

            width:

              window.innerWidth < 900

              ? "100%"

              : 340

          }}

        >


          <h3>

            ♟ Games (
            {filteredGames.length}
            )

          </h3>



          <div

            style={{

              maxHeight:
                window.innerWidth < 900
                ? 300
                : "80vh",

              overflowY:
                "auto"

            }}

          >


            {
              filteredGames.map(
                (
                  game,
                  index
                ) => (


                <div

                  key={game.id}


                  onClick={() =>
                    setSelectedGame(game)
                  }


                  style={{

                    padding:10,

                    marginBottom:8,

                    cursor:"pointer",

                    borderRadius:8,


                    border:

                      selectedGame?.id === game.id

                      ? "2px solid #ff9800"

                      : "1px solid #ddd",


                    background:

                      selectedGame?.id === game.id

                      ? "#fff3cd"

                      : "white"

                  }}

                >


                  <div>

                    ♟ {index + 1}.
                    {" "}
                    {game.name}

                  </div>



                  {
                    game.opening && (

                      <div

                        style={{

                          fontSize:12,

                          opacity:.6,

                          marginTop:4

                        }}

                      >

                        {game.opening}

                      </div>

                    )
                  }


                </div>


              ))
            }


          </div>


        </div>





        {/* =====================
            BOARD
        ====================== */}


        <div

          style={{

            flex:1

          }}

        >


          {
            selectedGame ? (


              <Board

                pgn={
                  selectedGame.pgn
                }

              />


            ) : (


              <div

                style={{

                  paddingTop:40,

                  opacity:.6

                }}

              >

                Select a game


              </div>


            )
          }


        </div>


      </div>


    </div>


  );

}