"use client";

import { useEffect, useState } from "react";

import {
  loadDailySentences,
  getTodaySentence,
} from "@/lib/studyStorage";

type Sentence = {
  text: string;
  source?: string;
} | null;

export default function DailyQuoteWidget() {
  const [sentence, setSentence] = useState<Sentence>(null);

  useEffect(() => {
    /* 每天只抽一次（getTodaySentence 内部有缓存） */
    const all = loadDailySentences();
    const s = getTodaySentence(all);
    if (s) {
      setSentence({
        text: s.text,
        source: (s as { source?: string }).source,
      });
    }
  }, []);

  return (
    <div className="home-widget-daily">
      <div className="home-widget-daily-label">
        TODAY
      </div>

      {sentence ? (
        <>
          <div className="home-widget-daily-text">
            {sentence.text}
          </div>
          {sentence.source && (
            <div className="home-widget-daily-source">
              — {sentence.source}
            </div>
          )}
        </>
      ) : (
        <div className="home-widget-daily-empty">
          还没有每日一句
        </div>
      )}
    </div>
  );
}