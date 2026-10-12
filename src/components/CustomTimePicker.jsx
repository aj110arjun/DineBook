import { useEffect, useRef, useState } from "react";
import { Clock3 } from "lucide-react";

const pad = (value) => String(value).padStart(2, "0");

function partsFromTime(value) {
  const [rawHour, minute] = (value || "20:00").split(":").map(Number);
  return {
    hour: rawHour % 12 || 12,
    minute: Number.isFinite(minute) ? minute : 0,
    period: rawHour >= 12 ? "PM" : "AM",
  };
}

export default function CustomTimePicker({ id, value, onChange, label = "Choose time" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const parts = partsFromTime(value);

  useEffect(() => {
    if (!open) return undefined;
    rootRef.current?.querySelectorAll(".custom-time-options .selected").forEach((option) => option.scrollIntoView({ block: "center" }));
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function update(next) {
    let hour = next.hour % 12;
    if (next.period === "PM") hour += 12;
    onChange(`${pad(hour)}:${pad(next.minute)}`);
  }

  const choices = [
    { name: "Hour", values: Array.from({ length: 12 }, (_, index) => index + 1), selected: parts.hour, format: pad },
    { name: "Minute", values: Array.from({ length: 60 }, (_, index) => index), selected: parts.minute, format: pad },
    { name: "Period", values: ["AM", "PM"], selected: parts.period, format: (value) => value },
  ];

  return <div className={`custom-time-picker${open ? " is-open" : ""}`} ref={rootRef}>
    <button id={id} type="button" className="custom-time-trigger" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span>{pad(parts.hour)}:{pad(parts.minute)} <b>{parts.period}</b></span><Clock3 size={17} aria-hidden="true" />
    </button>
    {open && <div className="custom-time-popover" role="dialog" aria-label={label}>
      {choices.map(({ name, values, selected, format }) => <div className="custom-time-column" key={name} aria-label={name}>
        <span className="custom-time-column-label">{name}</span>
        <div className="custom-time-options" role="listbox" aria-label={name}>
          {values.map((choice) => <button type="button" role="option" aria-selected={selected === choice} className={selected === choice ? "selected" : ""} key={choice} onClick={() => { update({ ...parts, [name.toLowerCase()]: choice }); }}>
            {format(choice)}
          </button>)}
        </div>
      </div>)}
    </div>}
  </div>;
}
