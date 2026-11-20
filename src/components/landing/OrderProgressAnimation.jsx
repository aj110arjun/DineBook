const messages = {
  PLACED: ["Your order is in!", "Waiting for the restaurant to confirm your order."],
  ACCEPTED: ["The kitchen has your order", "Your order is confirmed. Cooking starts next."],
  PREPARING: ["Something delicious is cooking", "The kitchen is freshly preparing your food."],
  READY: ["Fresh from the kitchen", "Your food is ready to be served."],
  SERVED: ["Enjoy every bite", "Your food has been served. Bon appétit!"],
};

function CheckBadge() {
  return <g className="order-scene-check">
    <circle cx="112" cy="80" r="17" className="order-scene-success" />
    <path d="m104 80 5 5 10-11" className="order-scene-checkmark" stroke="white" strokeWidth="3" fill="none" />
  </g>;
}

function OrderScene({ stage }) {
  return <svg viewBox="0 0 160 112" fill="none" aria-hidden="true" focusable="false">
    <circle cx="80" cy="55" r="43" className="order-scene-halo" />
    <ellipse cx="80" cy="101" rx="39" ry="4" className="order-scene-shadow" />
    {stage === "PLACED" && <>
      <g className="order-scene-ticket" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M56 19h43a5 5 0 0 1 5 5v64l-7-4-7 4-7-4-7 4-7-4-8 4-5-4V24a5 5 0 0 1 5-5Z" className="order-scene-paper" />
        <path d="M68 35h24M68 46h18M68 57h24M68 68h11" className="order-scene-ink" />
      </g>
      <circle cx="111" cy="77" r="18" className="order-scene-accent-fill" />
      <circle cx="111" cy="77" r="13" stroke="currentColor" strokeWidth="2" />
      <path d="M111 69v8l5 3" className="order-scene-clock-hand" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </>}
    {stage === "ACCEPTED" && <>
      <g className="order-scene-chef" strokeWidth="2.5" strokeLinejoin="round">
        <path d="M54 66V50c-14-1-18-20-6-27 6-4 13-2 18 3 5-18 27-18 32 0 17-9 32 10 20 21-3 3-7 4-12 3v16" className="order-scene-paper" />
        <rect x="54" y="65" width="52" height="15" rx="4" className="order-scene-accent-fill" stroke="currentColor" />
        <path d="M70 51v13m20-13v13" className="order-scene-ink" strokeLinecap="round" />
      </g><CheckBadge />
    </>}
    {stage === "PREPARING" && <>
      <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M64 41c-9-8 8-11 0-20" className="order-scene-steam" />
        <path d="M80 38c-9-8 8-11 0-20" className="order-scene-steam" />
        <path d="M96 41c-9-8 8-11 0-20" className="order-scene-steam" />
        <path d="m106 33-16 35" className="order-scene-spoon" strokeWidth="5" />
        <path d="M47 59H35v12h13m64-12h13v12h-13" />
        <path d="M47 55h66v22a15 15 0 0 1-15 15H62a15 15 0 0 1-15-15Z" className="order-scene-pot" />
        <g className="order-scene-lid"><path d="M43 53h74M74 47v-4h12v4" /></g>
        <path d="M59 65v12" stroke="white" opacity=".55" />
      </g>
      <g className="order-scene-heat" strokeWidth="2" strokeLinecap="round"><path d="M65 98v-2m15 2v-2m15 2v-2" /></g>
    </>}
    {stage === "READY" && <>
      <g className="order-scene-cloche" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M45 78a35 35 0 0 1 70 0Z" className="order-scene-paper" />
        <path d="M72 42a8 8 0 0 1 16 0M39 79h82l-7 9H46Z" className="order-scene-accent-fill" />
        <path d="M57 67a24 24 0 0 1 15-15" className="order-scene-ink" />
      </g>
      <g className="order-scene-sparkles" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M32 35v12m-6-6h12m87-20v10m-5-5h10m-2 34v8m-4-4h8" /></g>
    </>}
    {stage === "SERVED" && <>
      <circle cx="80" cy="57" r="33" className="order-scene-paper" strokeWidth="2.5" />
      <circle cx="80" cy="57" r="24" className="order-scene-ink" strokeWidth="1.5" />
      <path d="M65 62c-1-12 13-23 28-15-1 14-14 25-28 15Z" className="order-scene-success" />
      <path d="m68 62 20-12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="87" cy="67" r="7" className="order-scene-accent-fill" />
      <path d="M31 34v20m-6-20v13a6 6 0 0 0 12 0V34m-6 20v31m98-51c-7 6-9 17-8 25h8m0-25v51" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <CheckBadge />
    </>}
  </svg>;
}

export default function OrderProgressAnimation({ status }) {
  const stage = status === "COMPLETED" ? "SERVED" : status;
  const message = messages[stage];
  if (!message) return null;
  const finished = stage === "SERVED";
  return <div className={`customer-order-live-status${finished ? " is-finished" : ""}`} data-stage={stage.toLowerCase()}>
    <div className="customer-order-scene" key={stage}><OrderScene stage={stage} /></div>
    <div className="customer-order-scene-copy" key={`${stage}-message`}>
      <span className="customer-order-live-label"><i aria-hidden="true" />{finished ? "SERVED WITH CARE" : "FROM ORDER TO FIRST BITE"}</span>
      <h4>{message[0]}</h4><p>{message[1]}{!finished && <span className="customer-order-waiting-dots" aria-hidden="true"><i /><i /><i /></span>}</p>
    </div>
  </div>;
}
