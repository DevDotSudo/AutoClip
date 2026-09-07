"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("autoclip-theme");
    const next = saved === "light";
    setLight(next);
    document.documentElement.dataset.theme = next ? "light" : "dark";
  }, []);
  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.dataset.theme = next ? "light" : "dark";
    localStorage.setItem("autoclip-theme", next ? "light" : "dark");
  }
  return <button className="icon-btn" onClick={toggle} aria-label="Toggle theme" title="Toggle theme">{light ? "☾" : "☀"}</button>;
}
