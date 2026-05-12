import { useEffect, useState } from "react";

export default function BookList({ onSelect }) {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    fetch("/pgn/index.json")
      .then((r) => r.json())
      .then((data) => {
        setBooks(data.books || []);
      })
      .catch((e) => {
        console.error("Ошибка загрузки книг", e);
      });
  }, []);

  return (
    <div className="panel">
      <h2>📚 Книги</h2>

      {books.map((book) => (
        <div
          key={book}
          className="card"
          onClick={() => onSelect(book)}
        >
          {book.replace(".pgn", "")}
        </div>
      ))}
    </div>
  );
}