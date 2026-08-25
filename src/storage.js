// =========================================================
// CHESS LIBRARY — INDEXEDDB STORAGE
// =========================================================

const DB_NAME = "chess-library";
const DB_VERSION = 2;

const BOOKS_STORE = "books";
const GAMES_STORE = "games";

// =========================================================
// OPEN DATABASE
// =========================================================

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      // BOOKS
      if (!db.objectStoreNames.contains(BOOKS_STORE)) {
        db.createObjectStore(
          BOOKS_STORE,
          {
            keyPath: "id",
          }
        );
      }

      // GAMES / PGN
      if (!db.objectStoreNames.contains(GAMES_STORE)) {
        db.createObjectStore(
          GAMES_STORE,
          {
            keyPath: "id",
          }
        );
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// =========================================================
// GET ALL BOOKS
// =========================================================

export async function getBooks() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      BOOKS_STORE,
      "readonly"
    );

    const store =
      transaction.objectStore(
        BOOKS_STORE
      );

    const request =
      store.getAll();

    request.onsuccess = () => {
      resolve(
        request.result || []
      );
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };

    transaction.onerror = () => {
      db.close();
    };
  });
}

// =========================================================
// GET BOOK
// =========================================================

export async function getBook(id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      BOOKS_STORE,
      "readonly"
    );

    const store =
      transaction.objectStore(
        BOOKS_STORE
      );

    const request =
      store.get(id);

    request.onsuccess = () => {
      resolve(
        request.result || null
      );
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };

    transaction.onerror = () => {
      db.close();
    };
  });
}

// =========================================================
// SAVE ALL BOOKS
// =========================================================

export async function saveBooks(books) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      BOOKS_STORE,
      "readwrite"
    );

    const store =
      transaction.objectStore(
        BOOKS_STORE
      );

    transaction.onerror = () => {
      reject(transaction.error);
    };

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    store.clear();

    for (const book of books) {
      store.put(book);
    }
  });
}

// =========================================================
// ADD BOOK
// =========================================================

export async function addBook(book) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      BOOKS_STORE,
      "readwrite"
    );

    const store =
      transaction.objectStore(
        BOOKS_STORE
      );

    const request =
      store.put(book);

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

// =========================================================
// UPDATE BOOK
// =========================================================

export async function updateBook(book) {
  return addBook(book);
}

// =========================================================
// DELETE BOOK
// =========================================================

export async function deleteBook(id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [BOOKS_STORE, GAMES_STORE],
      "readwrite"
    );

    const booksStore =
      transaction.objectStore(
        BOOKS_STORE
      );

    const gamesStore =
      transaction.objectStore(
        GAMES_STORE
      );

    // Удаляем книгу
    booksStore.delete(id);

    // Удаляем все PGN этой книги
    const cursorRequest =
      gamesStore.openCursor();

    cursorRequest.onsuccess = () => {
      const cursor =
        cursorRequest.result;

      if (!cursor) {
        return;
      }

      const game =
        cursor.value;

      if (game.bookId === id) {
        cursor.delete();
      }

      cursor.continue();
    };

    cursorRequest.onerror = () => {
      reject(
        cursorRequest.error
      );
    };

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

// =========================================================
// CLEAR DATABASE
// =========================================================

export async function clearDatabase() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [BOOKS_STORE, GAMES_STORE],
      "readwrite"
    );

    transaction.objectStore(
      BOOKS_STORE
    ).clear();

    transaction.objectStore(
      GAMES_STORE
    ).clear();

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

// =========================================================
// SAVE GAME PGN
// =========================================================
//
// Формат:
//
// {
//   id: gameId,
//   bookId: bookId,
//   pgn: "..."
// }
//

export async function saveGamePGN(
  gameId,
  bookId,
  pgn
) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      GAMES_STORE,
      "readwrite"
    );

    const store =
      transaction.objectStore(
        GAMES_STORE
      );

    const request =
      store.put({
        id: gameId,
        bookId,
        pgn,
      });

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

// =========================================================
// SAVE MANY GAME PGNS
// =========================================================

export async function saveGamePGNs(
  games
) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      GAMES_STORE,
      "readwrite"
    );

    const store =
      transaction.objectStore(
        GAMES_STORE
      );

    for (const game of games) {
      store.put({
        id: game.id,
        bookId: game.bookId,
        pgn: game.pgn,
      });
    }

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

// =========================================================
// GET GAME PGN
// =========================================================

export async function getGamePGN(
  gameId
) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      GAMES_STORE,
      "readonly"
    );

    const store =
      transaction.objectStore(
        GAMES_STORE
      );

    const request =
      store.get(gameId);

    request.onsuccess = () => {
      const result =
        request.result;

      resolve(
        result
          ? result.pgn
          : null
      );
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };

    transaction.onerror = () => {
      db.close();
    };
  });
}

// =========================================================
// GET ALL PGNS FOR BOOK
// =========================================================

export async function getBookPGNs(
  bookId
) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      GAMES_STORE,
      "readonly"
    );

    const store =
      transaction.objectStore(
        GAMES_STORE
      );

    const request =
      store.getAll();

    request.onsuccess = () => {
      const games =
        request.result || [];

      resolve(
        games.filter(
          (game) =>
            game.bookId === bookId
        )
      );
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      db.close();
    };

    transaction.onerror = () => {
      db.close();
    };
  });
}

// =========================================================
// DELETE GAME PGN
// =========================================================

export async function deleteGamePGN(
  gameId
) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      GAMES_STORE,
      "readwrite"
    );

    const store =
      transaction.objectStore(
        GAMES_STORE
      );

    store.delete(gameId);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

// =========================================================
// GET DATABASE STATISTICS
// =========================================================

export async function getStorageStats() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [
        BOOKS_STORE,
        GAMES_STORE,
      ],
      "readonly"
    );

    const booksStore =
      transaction.objectStore(
        BOOKS_STORE
      );

    const gamesStore =
      transaction.objectStore(
        GAMES_STORE
      );

    const booksRequest =
      booksStore.count();

    const gamesRequest =
      gamesStore.count();

    let booksCount = 0;
    let gamesCount = 0;

    booksRequest.onsuccess = () => {
      booksCount =
        booksRequest.result;
    };

    gamesRequest.onsuccess = () => {
      gamesCount =
        gamesRequest.result;
    };

    transaction.oncomplete = () => {
      db.close();

      resolve({
        books: booksCount,
        games: gamesCount,
      });
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}