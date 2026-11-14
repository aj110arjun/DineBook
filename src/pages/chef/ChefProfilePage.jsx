import { useEffect } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { MapPin, Store } from "lucide-react";
import ChefLayout from "../../components/chef/ChefLayout.jsx";
import AccountInformation from "../../components/profile/AccountInformation.jsx";
import { Detail } from "../../components/manager/profile/ProfileParts.jsx";
import PortalBreadcrumb from "../../components/PortalBreadcrumb.jsx";
import Notice from "../../components/auth/Notice.jsx";
import { requestJson } from "../../lib/authApi.js";
import { profileStatus } from "../../lib/managerProfile.js";
import { usePageState } from "../../state/usePageState.js";
import "../../assets/css/ManagerProfilePage.css";
import "../../assets/css/ChefProfilePage.css";

export function ChefProfileContent({ data, onPersist, onAuthError }) {
  const { restaurant } = data;
  return <div className="chef-profile-sections">
    <AccountInformation key={data.chef.id} account={data.chef} role="chef" onPersist={onPersist} onAuthError={onAuthError} />
    <section className="manager-profile-card chef-profile-restaurant" aria-labelledby="chef-restaurant-title">
      <header className="manager-profile-card-heading">
        <div><h2 id="chef-restaurant-title">Assigned Restaurant</h2><p>Your current kitchen team and workplace.</p></div>
        <Store size={24} className="chef-profile-section-icon" aria-hidden="true" />
      </header>
      {restaurant ? <>
        <div className="chef-profile-workplace"><strong>{restaurant.name}</strong><span>{profileStatus(restaurant.status)}</span></div>
        <p className="chef-profile-address"><MapPin size={17} aria-hidden="true" />{[restaurant.address, restaurant.city, restaurant.state, restaurant.pin_code].filter(Boolean).join(", ")}</p>
        <dl className="manager-profile-details">
          <Detail label="Cuisine">{restaurant.cuisine_type}</Detail>
          <Detail label="Restaurant phone">{restaurant.phone}</Detail>
        </dl>
        <Link className="manager-profile-link" to="/chef/service-hours">View service hours</Link>
      </> : <p className="manager-profile-help">No restaurant is assigned to your chef account. Contact your manager for help.</p>}
      <p className="manager-profile-help chef-profile-assignment-note">Restaurant details and team assignments are managed by your restaurant manager.</p>
    </section>
  </div>;
}

export default function ChefProfilePage() {
  const { chef, updateChefProfile } = useOutletContext();
  const navigate = useNavigate();
  const [{ data, loading, error, refresh }, set] = usePageState(`ChefProfilePage/${chef.id}`, () => ({ data: null, loading: true, error: "", refresh: 0 }));

  function authError(reason) {
    if (![401, 403].includes(reason.status)) return false;
    navigate("/chef/login", { replace: true, state: { notice: reason.message || "Please sign in as a chef to continue." } });
    return true;
  }

  useEffect(() => {
    const controller = new AbortController();
    set.loading(true); set.error("");
    requestJson("/api/chef/profile", { signal: controller.signal, fallbackMessage: "Unable to load your chef profile." })
      .then((value) => { if (!controller.signal.aborted) set.data(value); })
      .catch((reason) => { if (!controller.signal.aborted && !authError(reason)) set.error(reason.message); })
      .finally(() => { if (!controller.signal.aborted) set.loading(false); });
    return () => controller.abort();
  }, [chef.id, refresh]);

  function persist(value) {
    if (value.id !== chef.id) return;
    set.data((current) => ({ ...current, chef: value }));
    updateChefProfile(value);
  }

  return <ChefLayout title="Chef Profile">
    <div className="chef-profile-page">
      <PortalBreadcrumb home={{ label: "Home", to: "/chef/dashboard" }} items={[{ label: "Profile" }]} />
      <header className="manager-profile-heading"><h2>Chef Profile</h2><p>Manage your personal information and view your kitchen assignment.</p></header>
      <Notice message={error} />
      {loading ? <div className="manager-profile-card manager-profile-loading" role="status" aria-live="polite">Loading your chef profile…</div>
        : data ? <ChefProfileContent data={data} onPersist={persist} onAuthError={authError} />
          : <div className="manager-profile-card"><p>Your profile is unavailable right now.</p><button type="button" className="manager-profile-button" onClick={() => set.refresh((value) => value + 1)}>Try again</button></div>}
    </div>
  </ChefLayout>;
}
