import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  User,
  X,
} from "lucide-react";

import { requestJson } from "../../lib/authApi.js";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import AdminActionConfirmModal from "../../components/admin/AdminActionConfirmModal.jsx";

export default function AdminManagerRequestDetailsPage() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null);
  const [error, setError] = useState("");

  async function loadRequest() {
    setLoading(true);
    setError("");

    try {
      const data = await requestJson(
        `/api/admin/managers/requests/${requestId}`,
        {
          method: "GET",
          fallbackMessage: "Unable to load manager request.",
        },
      );

      setRequest(data);
    } catch (err) {
      setError(err.message || "Unable to load manager request.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequest();
  }, [requestId]);

  async function handleApprove() {
    setProcessing(true);
    setError("");

    try {
      await requestJson(`/api/admin/managers/${requestId}/approve`, {
        method: "PATCH",
        fallbackMessage: "Unable to approve manager.",
      });

      navigate("/admin/requests", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to approve manager.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    setProcessing(true);
    setError("");

    try {
      await requestJson(`/api/admin/managers/${requestId}/reject`, {
        method: "PATCH",
        fallbackMessage: "Unable to reject manager.",
      });

      navigate("/admin/requests", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to reject manager.");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Request Details" activePath="/admin/requests">
        <div className="admin-dashboard-content">
          <div className="flex min-h-[420px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#0fa99d]/10 text-[#0fa99d]">
                  <Clock3 size={22} />
                </div>

                <h2 className="text-base font-bold text-[#172335]">
                  Loading manager request
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Please wait while the application details are loaded.
                </p>
              </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error && !request) {
    return (
      <AdminLayout title="Request Details" activePath="/admin/requests">
        <div className="admin-dashboard-content">
              <button
                type="button"
                onClick={() => navigate("/admin/requests")}
                className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-[#0fa99d]"
              >
                <ArrowLeft size={16} />
                Back to Requests
              </button>

              <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-100 text-red-600">
                    <X size={17} />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-red-700">
                      Unable to load application
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-red-600">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
        </div>
      </AdminLayout>
    );
  }

  const restaurant = request?.restaurant || {};
  const documents = request?.documents || [];
  const hours = request?.hours || [];

  const status = String(restaurant.status || request?.status || "PENDING").toUpperCase();

  const statusStyles = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    REJECTED: "border-red-200 bg-red-50 text-red-700",
    ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <AdminLayout title="Request Details" activePath="/admin/requests">
      <div className="admin-dashboard-content">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {/* Page Header */}
          <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#0fa99d]/10 text-[#0fa99d]">
                  <User size={24} />
                </div>

                <div className="min-w-0">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0fa99d]">
                    Manager Application
                  </p>

                  <h2 className="truncate text-2xl font-bold tracking-tight text-[#172335]">
                    {request?.name || "Manager Request"}
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <Mail size={14} />
                      {request?.email || "Not provided"}
                    </span>

                    {request?.created_at && (
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays size={14} />
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide",
                    statusStyles[status] ||
                      "border-gray-200 bg-gray-50 text-gray-600",
                  ].join(" ")}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {status}
                </span>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-100 pt-5">
              <p className="max-w-3xl text-sm leading-6 text-gray-500">
                Review the manager, restaurant, operating hours, and submitted
                documents before making an approval decision.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {status === "PENDING" && <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setConfirmationAction("reject")}
              disabled={processing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X size={16} />
              {processing ? "Processing..." : "Reject Application"}
            </button>

            <button
              type="button"
              onClick={() => setConfirmationAction("approve")}
              disabled={processing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0fa99d] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172335] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={16} />
              {processing ? "Processing..." : "Approve Application"}
            </button>
          </div>}
          {status !== "PENDING" && (
            <div className="mb-7 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              This application is {status.toLowerCase()}. Approval and rejection actions are available for pending applications.
            </div>
          )}

          {/* Main Information */}
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Manager Information */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <SectionTitle
                icon={User}
                title="Manager Information"
                description="Personal details submitted by the manager."
              />

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <InfoItem icon={User} label="Full Name" value={request?.name} />

                <InfoItem
                  icon={Mail}
                  label="Email Address"
                  value={request?.email}
                />

                  <InfoItem
                    icon={ShieldCheck}
                  label="Manager Account Status"
                  value={request?.status}
                />

                <InfoItem
                  icon={CalendarDays}
                  label="Registered On"
                  value={
                    request?.created_at
                      ? new Date(request.created_at).toLocaleString()
                      : "Not provided"
                  }
                />
              </div>
            </section>

            {/* Restaurant Information */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <SectionTitle
                icon={Store}
                title="Restaurant Information"
                description="Restaurant details provided during registration."
              />

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <InfoItem
                  icon={Building2}
                  label="Restaurant Name"
                  value={restaurant.name}
                />

                <InfoItem
                  icon={Store}
                  label="Cuisine"
                  value={restaurant.cuisine_type}
                />

                <InfoItem
                  icon={ShieldCheck}
                  label="Restaurant Status"
                  value={restaurant.status}
                />

                <InfoItem
                  icon={Phone}
                  label="Restaurant Contact"
                  value={restaurant.phone}
                />

                <InfoItem
                  icon={Mail}
                  label="Restaurant Email"
                  value={restaurant.email}
                />

                <InfoItem
                  icon={User}
                  label="Seating Capacity"
                  value={restaurant.capacity}
                />

                <InfoItem
                  icon={Store}
                  label="Dining Tables"
                  value={restaurant.tables}
                />
              </div>

              <div className="mt-6 border-t border-gray-100 pt-5">
                <InfoItem
                  label="Restaurant Description"
                  value={restaurant.description}
                  fullWidth
                />
              </div>
            </section>

            {/* Address */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <SectionTitle
                icon={MapPin}
                title="Restaurant Address"
                description="Location information submitted by the manager."
              />

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <InfoItem
                  icon={MapPin}
                  label="Full Address"
                  value={restaurant.address}
                  fullWidth
                />

                <InfoItem icon={MapPin} label="City" value={restaurant.city} />

                <InfoItem
                  icon={MapPin}
                  label="State"
                  value={restaurant.state}
                />

                <InfoItem
                  icon={MapPin}
                  label="PIN Code"
                  value={restaurant.pin_code}
                />
              </div>
            </section>

            {/* Operating Hours */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <SectionTitle
                icon={Clock3}
                title="Operating Hours"
                description="Restaurant operating schedule."
              />

              <div className="mt-6 overflow-hidden rounded-xl border border-gray-100">
                {hours.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <Clock3 size={22} className="mx-auto text-gray-300" />

                    <p className="mt-2 text-sm font-medium text-gray-500">
                      No operating hours available.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {hours.map((day) => (
                      <div
                        key={day.day_of_week}
                        className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-[#0fa99d]/60" />

                          <span className="text-sm font-semibold capitalize text-[#172335]">
                            {day.day_of_week}
                          </span>
                        </div>

                        {day.enabled ? (
                          <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-600">
                            {day.open_time || "—"} – {day.close_time || "—"}
                          </span>
                        ) : (
                          <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                            Closed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Documents */}
          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            <SectionTitle
              icon={FileText}
              title="Submitted Documents"
              description="Documents uploaded during manager registration."
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {documents.length === 0 ? (
                <div className="sm:col-span-2 lg:col-span-3">
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 py-10 text-center">
                    <FileText size={26} className="mx-auto text-gray-300" />

                    <p className="mt-3 text-sm font-semibold text-gray-500">
                      No documents available
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      No files were submitted with this application.
                    </p>
                  </div>
                </div>
              ) : (
                documents.map((document) => (
                  <a
                    key={document.id}
                    href={document.file_url || document.file_path}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex min-w-0 items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-[#0fa99d] hover:bg-gray-50"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0fa99d]/10 text-[#0fa99d] transition group-hover:bg-[#0fa99d] group-hover:text-white">
                      <FileText size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#172335] transition group-hover:text-[#0fa99d]">
                        {document.document_type || "Document"}
                      </p>

                      <p className="mt-1 truncate text-xs text-gray-500">
                        {document.file_name || "View submitted document"}
                      </p>

                      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[#0fa99d]">
                        Open Document
                      </p>
                    </div>
                  </a>
                ))
              )}
            </div>
          </section>

          {/* Bottom Actions */}
          <div className="mt-8 flex flex-col gap-4 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => navigate("/admin/requests")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-[#0fa99d]"
            >
              <ArrowLeft size={16} />
              Back to Requests
            </button>

            {status === "PENDING" && <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setConfirmationAction("reject")}
                disabled={processing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-6 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X size={16} />
                Reject
              </button>

              <button
                type="button"
                onClick={() => setConfirmationAction("approve")}
                disabled={processing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0fa99d] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172335] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check size={16} />
                Approve
              </button>
            </div>}
          </div>
      </div>
      <AdminActionConfirmModal
        action={confirmationAction}
        subject={restaurant.name || request?.name || "this manager application"}
        busy={processing}
        onCancel={() => setConfirmationAction(null)}
        onConfirm={confirmationAction === "approve" ? handleApprove : handleReject}
      />
    </AdminLayout>
  );
}

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 pb-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0fa99d]/10 text-[#0fa99d]">
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <h3 className="text-base font-bold text-[#172335]">{title}</h3>

        <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, fullWidth = false }) {
  return (
    <div className={fullWidth ? "w-full sm:col-span-2" : ""}>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
        {Icon && <Icon size={13} />}
        <span>{label}</span>
      </div>

      <p className="mt-2 break-words text-sm font-semibold leading-6 text-[#172335]">
        {value !== null && value !== undefined && value !== ""
          ? value
          : "Not provided"}
      </p>
    </div>
  );
}
