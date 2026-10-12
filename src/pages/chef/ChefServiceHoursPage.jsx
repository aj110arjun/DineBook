import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import ChefLayout from "../../components/chef/ChefLayout.jsx";
import { requestJson } from "../../lib/authApi.js";

const displayDay = (day) => day.charAt(0).toUpperCase() + day.slice(1);

export default function ChefServiceHoursPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = () => requestJson("/api/chef/service-hours").then((value) => { if (active) { setData(value); setError(""); } }).catch((reason) => active && setError(reason.message)).finally(() => active && setLoading(false));
    load();
    const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  return <ChefLayout title="Service Hours"><section className="chef-service-hours">
    {error && <p role="alert">{error}</p>}{loading ? <p role="status">Loading service schedule…</p> : data && <>
      <article className="chef-service-today"><Clock3 size={22} /><div><span>Today's service</span><strong>{data.today?.is_open ? data.today.periods.map((item) => `${item.opens}–${item.closes}`).join(" · ") : "Closed today"}</strong></div><small>{data.timezone}</small></article>
      <section className="chef-service-card"><h2>Weekly schedule</h2><div className="chef-service-week">{data.days.map((day) => <article key={day.day}><strong>{displayDay(day.day)}</strong>{day.periods.length ? day.periods.map((period, index) => <span key={index}>{period.opens} – {period.closes}</span>) : <span className="closed">Closed</span>}</article>)}</div></section>
      <section className="chef-service-card"><h2>Upcoming schedule exceptions</h2>{data.exceptions?.length ? <ul>{data.exceptions.map((item) => <li key={item.id}><strong>{item.start_date}{item.end_date !== item.start_date ? ` – ${item.end_date}` : ""}</strong><span>{item.is_closed ? "Closed" : item.periods.map((period) => `${period.opens}–${period.closes}`).join(" · ")}</span>{item.reason && <small>{item.reason}</small>}</li>)}</ul> : <p>No upcoming exceptions.</p>}</section>
    </>}
  </section></ChefLayout>;
}
