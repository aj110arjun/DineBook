import CustomForm from "../../components/forms/CustomForm.jsx";
import { useState, useEffect } from "react";
import { ChefHat, Plus } from "lucide-react";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import PortalBreadcrumb from "../../components/PortalBreadcrumb.jsx";
import { FormField } from "../../components/auth/FormField.jsx";
import Notice from "../../components/auth/Notice.jsx";
import { requestJson } from "../../lib/authApi.js";
import ManagerChefWalletTransfers from "./ManagerChefWalletTransfers.jsx";

export default function ManagerStaffPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [walletRefreshKey, setWalletRefreshKey] = useState(0);
  const [chefs, setChefs] = useState([]);
  const [chefsLoading, setChefsLoading] = useState(true);
  const [chefsError, setChefsError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadChefs() {
      setChefsLoading(true);
      setChefsError("");

      try {
        const data = await requestJson("/api/manager/staff");

        if (active) {
          setChefs(data);
        }
      } catch (reason) {
        if (active) {
          setChefsError(reason.message || "Unable to load chef details.");
        }
      } finally {
        if (active) {
          setChefsLoading(false);
        }
      }
    }

    loadChefs();

    return () => {
      active = false;
    };
  }, [walletRefreshKey]);

  async function handleAddChef(event) {
    event.preventDefault();

    const formElement = event.currentTarget;


    const form = new FormData(formElement);

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await requestJson("/api/manager/staff", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name") || "").trim(),
          email: String(form.get("email") || "")
            .trim()
            .toLowerCase(),
        }),
        fallbackMessage: "Unable to add chef.",
      });

      formElement.reset();
      setSuccess(
        "Chef added. Their sign-in email and temporary password have been sent.",
      );

      // Reload wallet transfer options so the new chef appears.
      setWalletRefreshKey((current) => current + 1);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ManagerLayout title="Chef Management">
      <div className="manager-dashboard-content">
        <PortalBreadcrumb
          home={{ label: "Home", to: "/manager/dashboard" }}
          items={[{ label: "Chef Management" }]}
          className="manager-breadcrumb"
        />

        <div className="manager-heading">
          <div>
            <h2>Chef Management</h2>
            <p>Add chefs and transfer funds to their wallets.</p>
          </div>
        </div>

        <div className="grid gap-6">
          <section className="manager-staff-panel rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-wine/10 text-wine">
                <ChefHat size={19} />
              </span>

              <div>
                <h3 className="font-semibold text-ink">Add Chef</h3>
                <p className="mt-1 text-xs text-stone-500">
                  Sign-in credentials will be emailed to the chef.
                </p>
              </div>
            </div>

            <CustomForm onSubmit={handleAddChef} noValidate>
              <FormField
                id="name"
                label="Chef Full Name"
                placeholder="Enter the chef’s name"
                autoComplete="name"
                minLength={2}
                maxLength={120}
                required
              />

              <FormField
                id="email"
                label="Chef Email Address"
                type="email"
                placeholder="chef@restaurant.com"
                autoComplete="email"
                required
              />

              <p className="mb-4 text-xs leading-5 text-stone-500">
                We’ll email a temporary password to this address. The chef must
                change it at first sign-in.
              </p>

              <Notice message={error} />
              <Notice message={success} type="success" />

              <button
                type="submit"
                disabled={saving}
                className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white transition hover:bg-ink disabled:opacity-60"
              >
                <Plus size={16} />
                {saving ? "Adding chef…" : "Add Chef"}
              </button>
            </CustomForm>
          </section>
          <section className="manager-chef-details">
            <header>
              <div>
                <h3>Restaurant chefs</h3>
                <p>View the chefs linked to your manager account.</p>
              </div>

              <button
                type="button"
                disabled={chefsLoading}
                onClick={() => setWalletRefreshKey((current) => current + 1)}
              >
                {chefsLoading ? "Loading…" : "Refresh"}
              </button>
            </header>

            {chefsError ? (
              <p role="alert" className="manager-chef-details-error">
                {chefsError}
              </p>
            ) : chefsLoading ? (
              <p role="status">Loading chef details…</p>
            ) : chefs.length === 0 ? (
              <p>No chefs have been added yet.</p>
            ) : (
              <div className="manager-chef-list">
                {chefs.map((chef) => (
                  <article className="manager-chef-item" key={chef.id}>
                    <div className="manager-chef-avatar" aria-hidden="true">
                      <ChefHat size={22} />
                    </div>

                    <div className="manager-chef-info">
                      <h4>{chef.name}</h4>
                      <a href={`mailto:${chef.email}`}>{chef.email}</a>
                      <small>Role: {chef.role}</small>
                    </div>

                    <div className="manager-chef-state">
                      <span
                        className={`manager-chef-badge ${
                          chef.is_active && chef.status === "ACTIVE"
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {chef.status.replaceAll("_", " ")}
                      </span>
                      <small>
                        {chef.is_active
                          ? "Account enabled"
                          : "Account disabled"}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <ManagerChefWalletTransfers key={walletRefreshKey} />
        </div>
      </div>
    </ManagerLayout>
  );
}
