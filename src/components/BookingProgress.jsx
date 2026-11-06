import { Check } from "lucide-react";

export default function BookingProgress({
  step,
  busy,
  onBack,
  preorder = false,
}) {
  const stages = [
    ["Your visit", "Choose a date, dining period and guest count."],
    ...(preorder
      ? [["Preorder food", "Choose menu items for your visit."]]
      : []),
    ["Choose tables", "Select enough available seats for your party."],
    ["Review & pay", "Review the total and payment method before confirming."],
  ];

  return (
    <nav className="ux-booking-progress" aria-label="Reservation progress">
      <ol>
        {stages.map(([label], index) => {
          const number = index + 1;
          const complete = step > number;

          const content = (
            <>
              <span className="ux-step-number" aria-hidden="true">
                {complete ? <Check size={15} /> : number}
              </span>
              <span>{label}</span>
            </>
          );

          return (
            <li
              key={label}
              className={
                step === number ? "is-current" : complete ? "is-complete" : ""
              }
              aria-current={step === number ? "step" : undefined}
            >
              {complete && step <= stages.length && !busy ? (
                <button
                  type="button"
                  onClick={() => onBack(number)}
                  aria-label={`Edit ${label.toLowerCase()}`}
                >
                  {content}
                </button>
              ) : (
                <span>{content}</span>
              )}
            </li>
          );
        })}
      </ol>

      <p>
        {stages[step - 1]?.[1] ||
          "Your booking status and next steps are below."}
      </p>
    </nav>
  );
}
