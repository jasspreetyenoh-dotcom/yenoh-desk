"use client";

import { useEffect, useState } from "react";
import LoaderMark from "./LoaderMark";

// A short intro, like the one on yenoh.in, shown the first time Desk is opened in a browser tab.
// The tiny script in layout.js decides before the page paints whether to show it (data-intro),
// so there is no flash. Later opens in the same tab skip it.
const SHOW_FOR_MS = 1500;

export default function IntroSplash() {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (document.documentElement.dataset.intro !== "show") return;
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem("yd-intro", "1");
      } catch {}
      setLeaving(true);
    }, SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={"splash" + (leaving ? " splash-out" : "")} aria-hidden="true">
      <LoaderMark full />
    </div>
  );
}
