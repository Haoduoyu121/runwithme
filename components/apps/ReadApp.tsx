"use client";

import { useEffect, useState } from "react";

import type { ReadBook } from "@/data/read";
import { loadLibrary } from "@/lib/readLibraryStorage";

import ReadLibrary from "@/components/apps/read/ReadLibrary";
import ReadBookPicker from "@/components/apps/read/ReadBookPicker";
import ReadReader from "@/components/apps/read/ReadReader";

type ReadAppProps = { onBack: () => void };

export default function ReadApp({ onBack }: ReadAppProps) {
  const [books, setBooks] = useState<ReadBook[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    null
  );
  const [showPicker, setShowPicker] = useState(false);

  function refresh() {
    setBooks(loadLibrary());
  }

  useEffect(() => {
    refresh();
  }, []);

  const activeBook = activeId
    ? books.find((b) => b.id === activeId) ?? null
    : null;

  return (
    <main className="phone-screen app-screen read-app">
      {activeBook ? (
        <ReadReader
          book={activeBook}
          onExit={() => {
            setActiveId(null);
            refresh();
          }}
        />
      ) : (
        <ReadLibrary
          books={books}
          onOpen={(id) => setActiveId(id)}
          onAdd={() => setShowPicker(true)}
          onBack={onBack}
          onRefresh={refresh}
        />
      )}

      {showPicker && (
        <ReadBookPicker
          onClose={() => setShowPicker(false)}
          onAdded={(id) => {
            setShowPicker(false);
            refresh();
            setActiveId(id);
          }}
        />
      )}
    </main>
  );
}