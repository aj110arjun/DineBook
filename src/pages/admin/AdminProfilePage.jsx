import useLoadingPhase from "../../hooks/useLoadingPhase.js";
import LoadingState, { RefreshIndicator } from "../../components/ui/LoadingState.jsx";
import { useCallback, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import { useAdminSession } from "../../components/admin/AdminSessionContext.jsx";
import AccountInformation from "../../components/profile/AccountInformation.jsx";
import Notice from "../../components/auth/Notice.jsx";
import { requestJson } from "../../lib/authApi.js";
import { usePageState } from "../../state/usePageState.js";
import "../../assets/css/ManagerProfilePage.css";

export default function AdminProfilePage() {
  const { admin, updateAdminProfile, clearAdmin } = useAdminSession();

  const [{ data, loading, error, refresh }, set] = usePageState(
    `AdminProfilePage/${admin.id}`,
    () => ({
      data: null,
      loading: true,
      error: "",
      refresh: 0,
    }),
  );

  const handleAuthError = useCallback(
    (reason) => {
      if (![401, 403].includes(reason.status)) return false;

      clearAdmin();
      return true;
    },
    [clearAdmin],
  );

  const { initialLoading, refreshing } = useLoadingPhase(loading, Boolean(data), error);

  useEffect(() => {
    const controller = new AbortController();

    set.loading(true);
    set.error("");
    set.data(null);

    requestJson("/api/admin/profile", {
      signal: controller.signal,
      timeout: 10000,
      fallbackMessage: "Unable to load your admin profile.",
    })
      .then((value) => {
        if (controller.signal.aborted) return;

        if (value.admin.id !== admin.id) {
          clearAdmin();
          return;
        }

        set.data(value);
        updateAdminProfile(value.admin);
      })
      .catch((reason) => {
        if (
          !controller.signal.aborted &&
          !handleAuthError(reason)
        ) {
          set.error(reason.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          set.loading(false);
        }
      });

    return () => controller.abort();
  }, [
    admin.id,
    refresh,
    set,
    clearAdmin,
    handleAuthError,
    updateAdminProfile,
  ]);

  function persist(savedAdmin) {
    if (savedAdmin.id !== admin.id) return;

    set.data({ admin: savedAdmin });
    updateAdminProfile(savedAdmin);
  }

  return (
    <AdminLayout title="Admin Profile">
      <div className="admin-dashboard-content manager-profile-page">
        <header className="manager-profile-heading">
          <h2>Your Profile</h2>
          <p>Manage your personal information and profile photo.</p>
        </header>

        <Notice message={error} />

        {refreshing && <RefreshIndicator active />}
        {initialLoading ? (
          <LoadingState variant="form" label="Loading your admin profile…" />
        ) : data ? (
          <AccountInformation
            key={data.admin.id}
            account={data.admin}
            role="admin"
            onPersist={persist}
            onAuthError={handleAuthError}
          />
        ) : (
          <div className="manager-profile-card">
            <p>Your profile is unavailable right now.</p>
            <button
              type="button"
              className="manager-profile-button"
              onClick={() => set.refresh((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
