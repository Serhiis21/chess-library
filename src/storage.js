// =========================================================
// CHESS LIBRARY — INDEXEDDB STORAGE
// =========================================================

const DB_NAME = "chess-library";
const DB_VERSION = 2;

const BOOKS_STORE = "books";

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

      if (!db.objectStoreNames.contains(BOOKS_STORE)) {
        db.createObjectStore(
          BOOKS_STORE,
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
      reject(transaction.error);
    };
  });
}

// =========================================================
// SAVE ALL BOOKS
// =========================================================

export async function saveBooks(
  books
) {
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

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      db.close();
      reject(
        transaction.error ||
          new Error(
            "IndexedDB transaction aborted"
          )
      );
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

export async function addBook(
  book
) {
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

    store.put(book);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      db.close();
      reject(
        transaction.error ||
          new Error(
            "IndexedDB transaction aborted"
          )
      );
    };
  });
}

// =========================================================
// UPDATE BOOK
// =========================================================

export async function updateBook(
  book
) {
  return addBook(book);
}

// =========================================================
// DELETE BOOK
// =========================================================

export async function deleteBook(
  id
) {
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

    store.delete(id);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      db.close();
      reject(
        transaction.error ||
          new Error(
            "IndexedDB transaction aborted"
          )
      );
    };
  });
}

// =========================================================
// CLEAR DATABASE
// =========================================================

export async function clearBooks() {
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

    store.clear();

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      db.close();
      reject(
        transaction.error ||
          new Error(
            "IndexedDB transaction aborted"
          )
      );
    };
  });
}