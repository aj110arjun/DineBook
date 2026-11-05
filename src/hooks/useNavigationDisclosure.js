import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// Shared keyboard behavior for customer, manager, chef and admin mobile menus.
export default function useNavigationDisclosure(open, close, navigationId) {
  const { pathname } = useLocation();
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => { closeRef.current(); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const nav = document.getElementById(navigationId);
    const panel = nav?.closest("aside") || nav;
    const focusable = () => Array.from(panel?.querySelectorAll(
      'a[href], button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]',
    ) || []).filter((element) => element.getClientRects().length);
    focusable()[0]?.focus();
    function keyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (!first) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
    document.addEventListener("keydown", keyDown);
    return () => {
      document.removeEventListener("keydown", keyDown);
      if (previous?.isConnected) previous.focus();
    };
  }, [open, navigationId]);
}
