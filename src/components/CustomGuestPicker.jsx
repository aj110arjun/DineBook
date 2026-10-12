import { useEffect, useRef, useState } from "react";
import { ChevronDown, Users } from "lucide-react";

export default function CustomGuestPicker({ id, value, onChange, max = 12 }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <div className={`custom-guest-picker${open ? " is-open" : ""}`} ref={rootRef}>
    <button id={id} type="button" className="custom-guest-trigger" aria-label="Number of guests" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span>{value} {Number(value) === 1 ? "Guest" : "Guests"}</span><Users size={16} aria-hidden="true" /><ChevronDown size={15} className="custom-guest-chevron" aria-hidden="true" />
    </button>
    {open && <div className="custom-guest-menu" role="listbox" aria-label="Number of guests">
      {Array.from({ length: max }, (_, index) => index + 1).map((count) => <button type="button" role="option" aria-selected={Number(value) === count} className={Number(value) === count ? "selected" : ""} key={count} onClick={() => { onChange(String(count)); setOpen(false); }}>
        {count} {count === 1 ? "Guest" : "Guests"}
      </button>)}
    </div>}
  </div>;
}
