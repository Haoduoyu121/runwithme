"use client";

import { useEffect, useState } from "react";

import { formatCountdown } from "@/data/home";

type Props = {
  title: string;
  targetDate: string;
};

export default function CountdownWidget({
  title,
  targetDate,
}: Props) {
  const [, force] = useState(0);

  /* 每天更新一次 */
  useEffect(() => {
    const t = window.setInterval(
      () => force((v) => v + 1),
      60 * 60 * 1000
    );
    return () => window.clearInterval(t);
  }, []);

  const { days, label } = formatCountdown(targetDate);

  const isToday = label === "Today";
  const isPast = label === "days ago";

  return (
    <div className="home-widget-countdown">
      <div className="home-widget-countdown-title">
        {title || "Countdown"}
      </div>

      <div
        className={`home-widget-countdown-number${
          isToday ? " is-today" : ""
        }${isPast ? " is-past" : ""}`}
      >
        {days}
      </div>

      <div className="home-widget-countdown-label">
        {label}
      </div>

      <div className="home-widget-countdown-target">
        {targetDate}
      </div>
    </div>
  );
}