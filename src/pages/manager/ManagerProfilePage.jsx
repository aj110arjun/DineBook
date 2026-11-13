import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import ManagerInformation from "../../components/manager/profile/ManagerInformation.jsx";
import RestaurantInformation from "../../components/manager/profile/RestaurantInformation.jsx";
import PortalBreadcrumb from "../../components/PortalBreadcrumb.jsx";
import Notice from "../../components/auth/Notice.jsx";
import { requestJson } from "../../lib/authApi.js";
import { usePageState } from "../../state/usePageState.js";
import { useAccountPreferences } from "../../components/preferences/AccountPreferences.jsx";
import "../../assets/css/ManagerProfilePage.css";

export function ManagerProfileContent({ data, onManagerPersist, onRestaurantPersist, onAuthError }) {
  return <div className="manager-profile-sections">
    <ManagerInformation manager={data.manager} onPersist={onManagerPersist} onAuthError={onAuthError} />
    {data.restaurant ? <RestaurantInformation restaurant={data.restaurant} onPersist={onRestaurantPersist} onAuthError={onAuthError} />
      : <section className="manager-profile-card"><h2>Restaurant Details</h2><p className="manager-profile-help">No restaurant is linked to your manager account. Contact DineBook support if this is unexpected.</p></section>}
  </div>;
}

export default function ManagerProfilePage() {
  const navigate = useNavigate();
  const accountId = useAccountPreferences()?.accountId;
  const [{ data, loading, error, refresh }, set] = usePageState(`ManagerProfilePage/${accountId || "unscoped"}`, () => ({ data: null, loading: true, error: "", refresh: 0 }));
  function authError(reason) {
    if (reason.status !== 401 && reason.status !== 403) return false;
    navigate("/manager/login", { replace: true, state: { notice: reason.message || "Please sign in as a manager to continue." } });
    return true;
  }
  useEffect(() => {
    const controller = new AbortController();
    set.loading(true); set.error("");
    requestJson("/api/manager/profile", { signal: controller.signal, fallbackMessage: "Unable to load your manager profile." })
      .then((value) => { if (!controller.signal.aborted) set.data(value); })
      .catch((reason) => { if (!controller.signal.aborted && !authError(reason)) set.error(reason.message); })
      .finally(() => { if (!controller.signal.aborted) set.loading(false); });
    return () => controller.abort();
  }, [refresh, accountId]);

  return <ManagerLayout title="Manager Profile"><div className="manager-dashboard-content manager-profile-page">
    <PortalBreadcrumb home={{ label: "Home", to: "/manager/dashboard" }} items={[{ label: "Manager Profile" }]} className="manager-breadcrumb" />
    <header className="manager-profile-heading"><h2>Manager Profile</h2><p>Manage your personal information and restaurant details.</p></header>
    <Notice message={error} />
    {loading ? <div className="manager-profile-card manager-profile-loading" role="status" aria-live="polite">Loading manager and restaurant details…</div>
      : data ? <ManagerProfileContent data={data} onAuthError={authError}
        onManagerPersist={(manager) => set.data((current) => ({ ...current, manager }))}
        onRestaurantPersist={(restaurant) => set.data((current) => ({ ...current, restaurant }))} />
        : <div className="manager-profile-card"><p>Your profile is unavailable right now.</p><button type="button" className="manager-profile-button" onClick={() => set.refresh((value) => value + 1)}>Try again</button></div>}
  </div></ManagerLayout>;
}
