"use client";

import { useEffect, useState } from "react";

import { loadCollections } from "@/lib/collectionStorage";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0"
  )}`;
}

function dateStrOf(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0"
  )}`;
}

export default function CollectionWidget() {
  const [total, setTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    function refresh() {
      const items = loadCollections();
      const today = todayStr();
      setTotal(items.length);
      setTodayCount(
        items.filter(
          (it) => dateStrOf(it.createdAt) === today
        ).length
      );
    }

    refresh();

    const timer = window.setInterval(refresh, 20000);
    window.addEventListener(
      "runwithme:collection-updated",
      refresh
    );

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(
        "runwithme:collection-updated",
        refresh
      );
    };
  }, []);

  return (
    <div className="home-widget-collection">
      <div className="home-widget-collection-label">
        COLLECTION
      </div>

      <div className="home-widget-collection-number">
        {total}
      </div>

      <div className="home-widget-collection-unit">
        saved moments
      </div>

      {todayCount > 0 && (
        <div className="home-widget-collection-today">
          <span className="home-widget-collection-star">
            ★
          </span>
          <span>今天 +{todayCount}</span>
        </div>
      )}
    </div>
  );
}