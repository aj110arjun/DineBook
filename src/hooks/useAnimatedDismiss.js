import { useEffect, useRef, useState } from "react";

export default function useAnimatedDismiss(onDismiss) {
  const [closing, setClosing] = useState(false);
  const timer = useRef(null);
  const latest = useRef(onDismiss);
  latest.current = onDismiss;
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function dismiss() {
    if (timer.current !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { latest.current?.(); return; }
    setClosing(true);
    // This timer is solely the dismiss animation, never an artificial loading delay.
    timer.current = window.setTimeout(() => latest.current?.(), 140);
  }
  return { closing, dismiss };
}
