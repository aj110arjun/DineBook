import { useEffect, useState } from "react";
import { Bell, CalendarDays, CreditCard, Heart, LogOut, UserRound, Wallet, Camera, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import LandingFooter from "../../components/landing/LandingFooter.jsx";
import { requestJson } from "../../lib/authApi.js";
import { demoCustomer, demoSessionKey } from "../../data/demoCustomer.js";
import "./CustomerProfilePage.css";

const preferenceDefaults = { cuisines: ["Modern Indian", "Contemporary Japanese", "Seafood & Coastal"], dietary: ["Gluten-Free", "Nut Allergy"], seating: "Indoor (AC)" };
const cuisines = ["Modern Indian", "Contemporary Japanese", "Neapolitan Italian", "Nordic Minimalist", "Seafood & Coastal", "French Classical"];
const diets = ["Gluten-Free", "Vegan", "Keto Friendly", "Nut Allergy", "Lactose Intolerant", "Halal"];

export default function CustomerProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", dob: "", gender: "" });
  const [prefs, setPrefs] = useState(preferenceDefaults);
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState("Personal Information");

  useEffect(() => {
    let alive = true;
    const localPrefs = localStorage.getItem("dinebook-profile-preferences");
    if (localPrefs) { try { setPrefs(JSON.parse(localPrefs)); } catch { /* use defaults */ } }
    const demo = import.meta.env.DEV && sessionStorage.getItem(demoSessionKey) === "active";
    (demo ? Promise.resolve(demoCustomer) : requestJson("/api/customer/me"))
      .then((data) => { if (alive) { setUser(data); setForm((current) => ({ ...current, name: data.name || "", email: data.email || "" })); } })
      .catch(() => alive && navigate("/customer/login", { replace: true }));
    requestJson("/api/customer/restaurants").then((data) => alive && setRestaurants(Array.isArray(data) ? data.slice(0, 2) : [])).catch(() => {});
    return () => { alive = false; };
  }, [navigate]);

  function logout() {
    if (import.meta.env.DEV && sessionStorage.getItem(demoSessionKey) === "active") {
      sessionStorage.removeItem(demoSessionKey); navigate("/customer/login"); return;
    }
    requestJson("/api/auth/logout", { method: "POST" }).finally(() => navigate("/customer/login"));
  }
  function toggle(key, value) { setPrefs((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((x) => x !== value) : [...current[key], value] })); }
  function save() { localStorage.setItem("dinebook-profile-preferences", JSON.stringify(prefs)); setSaved(true); window.setTimeout(() => setSaved(false), 2200); }

  const navItems = [{ label: "Personal Information", icon: UserRound }, { label: "Saved Restaurants", icon: Heart }, { label: "Booking History", icon: CalendarDays }, { label: "Payment History", icon: CreditCard }, { label: "Notification Settings", icon: Bell }, { label: "Wallet", icon: Wallet }];
  return <div className="customer-home profile-page"><CustomerHeader user={user} onLogout={() => navigate("/customer/login")} />
    <main className="profile-shell">
      <nav className="profile-crumb"><Link to="/customer">Home</Link><span>/</span><span>Account</span><span>/</span><strong>{section}</strong></nav>
      <div className="profile-layout">
        <aside className="profile-sidebar">
          <div className="profile-identity"><div className="profile-avatar"><img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&h=240&fit=crop&crop=faces" alt="Profile" /></div><strong>{user?.name || "Your Profile"}</strong><span>{user?.email || ""}</span></div>
          <div className="profile-menu">{navItems.map(({ label, icon: Icon }) => label === "Booking History" ? <Link className={section === label ? "selected" : ""} key={label} to="/customer/profile/reservations"><Icon size={17} />{label}</Link> : <button className={section === label ? "selected" : ""} key={label} onClick={() => setSection(label)}><Icon size={17} />{label}</button>)}</div>
          <button className="profile-logout" onClick={logout}><LogOut size={17} />Logout Account</button>
        </aside>
        <div className="profile-content">
          <section className="profile-card personal-card"><div className="profile-card-title"><h1>Personal Information</h1><span>PREMIUM ACCOUNT</span></div>
            <div className="profile-photo-row"><div className="profile-avatar small"><img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&h=240&fit=crop&crop=faces" alt="" /></div><div><button className="profile-upload" type="button" onClick={() => document.getElementById("profile-photo")?.click()}><Camera size={14} /> Upload Photo</button><input id="profile-photo" type="file" accept="image/png,image/jpeg" hidden /><small>JPG or PNG. Max size of 800K</small></div></div>
            <div className="profile-fields">{[["Full Name", "name", "text"], ["Email Address", "email", "email"], ["Phone Number", "phone", "tel"], ["Date of Birth", "dob", "text"]].map(([label, key, type]) => <label key={key}>{label}<input type={type} value={form[key]} placeholder={key === "phone" ? "+91 98765 43210" : key === "dob" ? "April 14, 1994" : ""} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}<label className="full-field">Gender<select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="">Select gender</option><option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option></select></label></div>
          </section>
          <section className="profile-saved"><div className="profile-section-heading"><h2>Saved Restaurants</h2><button onClick={() => setSection("Saved Restaurants")}>View All Saved ({restaurants.length})</button></div><div className="saved-grid">{restaurants.length ? restaurants.map((restaurant) => <article className="saved-card" key={restaurant.id}><div className="saved-photo" style={{ backgroundImage: `url(${restaurant.image_url || restaurant.image || "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900"})` }}><button aria-label="Remove saved restaurant"><Heart size={17} fill="currentColor" /></button></div><div className="saved-info"><strong>{restaurant.name}</strong><span>{[restaurant.location, restaurant.cuisine].filter(Boolean).join(" · ")}</span><Link to={`/customer/restaurants/${restaurant.id}`}>Explore Restaurant</Link></div></article>) : <div className="profile-empty">Restaurants you save will appear here.</div>}</div></section>
          <section className="profile-card preference-card"><h2>Dining Preferences</h2><div className="preference-block"><h3>Preferred Cuisines</h3><div className="cuisine-options">{cuisines.map((item) => <label key={item}><input type="checkbox" checked={prefs.cuisines.includes(item)} onChange={() => toggle("cuisines", item)} />{item}</label>)}</div></div><div className="preference-block"><h3>Dietary Restrictions / Allergies</h3><div className="diet-options">{diets.map((item) => <button className={prefs.dietary.includes(item) ? "active" : ""} key={item} onClick={() => toggle("dietary", item)}>{item}</button>)}</div></div><div className="preference-block"><h3>Preferred Seating Zone</h3><div className="seating-options">{["Indoor (AC)", "Rooftop / Outdoor", "No Preference"].map((item) => <label key={item}><input type="radio" name="seating" checked={prefs.seating === item} onChange={() => setPrefs({ ...prefs, seating: item })} />{item}</label>)}</div></div><div className="profile-actions"><button className="profile-cancel" onClick={() => setPrefs(preferenceDefaults)}>Cancel</button><button className="profile-save" onClick={save}>{saved ? <><Check size={15} /> Saved</> : "Save Changes"}</button></div></section>
        </div>
      </div>
    </main><LandingFooter /></div>;
}
