import { useEffect, useState } from "react";
import { API_BASE } from "../../lib/authApi.js";
import {
  ArrowRight,
  FileText,
  Image as ImageIcon,
  Mail,
  MapPin,
  ShieldCheck,
  Store,
  Upload,
  User,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import ManagerAuthLayout from "../../components/auth/ManagerAuthLayout.jsx";
import ImageCropDialog from "../../components/manager/ImageCropDialog.jsx";
import { FormField, PasswordField } from "../../components/auth/FormField.jsx";
import Notice from "../../components/auth/Notice.jsx";

const initialApplication = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",

  restaurantName: "",
  restaurantDescription: "",
  cuisineType: "",
  restaurantContact: "",
  restaurantEmail: "",
  address: "",
  city: "",
  state: "",
  pinCode: "",
};

const steps = [
  "Personal Details",
  "Restaurant Info",
  "Documents",
  "Operating Hours",
  "Review",
];

function DocumentCard({
  title,
  description,
  required = false,
  file,
  onUpload,
  onRemove,
  accept = ".pdf",
  image = false,
  error,
}) {
  const inputId = `document-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className={`mb-4 rounded-xl border bg-white p-4 ${error ? "border-red-300" : "border-stone-200"}`}>
      <div className="flex items-center gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-stone-100 text-wine">
          {image ? <ImageIcon size={19} /> : <FileText size={19} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">{title}</h3>

            <span
              className={[
                "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                required
                  ? "bg-rose-50 text-rose-600"
                  : "bg-stone-100 text-stone-500",
              ].join(" ")}
            >
              {required ? "Required" : "Optional"}
            </span>
          </div>

          {file ? (
            <p className="mt-1 truncate text-xs text-emerald-600">
              {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
            </p>
          ) : (
            <p className="mt-1 text-xs text-stone-400">{description}</p>
          )}
        </div>

        <div className="shrink-0">
          {file ? (
            <div className="flex items-center gap-2">
              <label
                htmlFor={inputId}
                className="flex h-9 cursor-pointer items-center rounded-lg border border-ink bg-white px-3 text-xs font-semibold text-ink transition hover:bg-stone-50"
              >
                Replace
              </label>

              <button
                type="button"
                onClick={onRemove}
                className="grid h-9 w-9 place-items-center rounded-lg border border-stone-200 text-stone-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Remove ${title}`}
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <label
              htmlFor={inputId}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-wine px-4 text-xs font-semibold text-white transition hover:bg-ink"
            >
              <Upload size={14} />
              Upload
            </label>
          )}

          <input
            id={inputId}
            type="file"
            className="hidden"
            accept={accept}
            onChange={(event) => {
              const selectedFile = event.target.files?.[0] || null;

              if (selectedFile) {
                onUpload(selectedFile);
              }

              event.target.value = "";
            }}
          />
        </div>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-red-600" role="alert">{error}</p>}
    </div>
  );
}

function ReviewItem({ label, value, full = false }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-400">
        {label}
      </p>

      <p className="text-sm font-medium leading-6 text-ink">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function ReviewDocument({ label, file, required = false }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-stone-50 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-wine">
          <FileText size={16} />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{label}</p>

          {file ? (
            <p className="mt-0.5 truncate text-xs text-emerald-600">
              {file.name}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-stone-400">
              {required ? "Required document missing" : "Not uploaded"}
            </p>
          )}
        </div>
      </div>

      <span
        className={[
          "ml-3 shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
          file
            ? "bg-emerald-50 text-emerald-600"
            : required
              ? "bg-rose-50 text-rose-600"
              : "bg-stone-100 text-stone-500",
        ].join(" ")}
      >
        {file ? "Uploaded" : required ? "Required" : "Optional"}
      </span>
    </div>
  );
}

export default function ManagerRegisterPage() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [pendingBanner, setPendingBanner] = useState(null);

  const [application, setApplication] = useState(initialApplication);
  const [mapQuery, setMapQuery] = useState("");
  const [addressLookupQuery, setAddressLookupQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressLookupBusy, setAddressLookupBusy] = useState(false);
  const [addressLookupError, setAddressLookupError] = useState("");
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMapQuery([application.address, application.city, application.state, application.pinCode].filter(Boolean).join(", "));
    }, 500);
    return () => window.clearTimeout(timeoutId);
  }, [application.address, application.city, application.state, application.pinCode]);

  useEffect(() => {
    const query = addressLookupQuery.trim();
    if (query.length < 5) {
      setAddressSuggestions([]);
      setAddressLookupError("");
      setAddressLookupBusy(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setAddressLookupBusy(true);
      setAddressLookupError("");
      try {
        const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en`, { signal: controller.signal });
        if (!response.ok) throw new Error("Address search is temporarily unavailable.");
        const result = await response.json();
        setAddressSuggestions(result.features || []);
      } catch (reason) {
        if (reason.name !== "AbortError") {
          setAddressSuggestions([]);
          setAddressLookupError("Couldn’t look up addresses right now. You can still enter the coordinates manually.");
        }
      } finally {
        if (!controller.signal.aborted) setAddressLookupBusy(false);
      }
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [addressLookupQuery]);
  const [documents, setDocuments] = useState({
    fssaiLicense: null,
    businessRegistration: null,
    gstCertificate: null,
    ownerIdentity: null,
    brandingImages: null,
  });

  const initialHours = {
    monday: {
      enabled: false,
      open: "17:00",
      close: "22:00",
    },
    tuesday: {
      enabled: false,
      open: "17:00",
      close: "22:00",
    },
    wednesday: {
      enabled: false,
      open: "17:00",
      close: "22:00",
    },
    thursday: {
      enabled: false,
      open: "17:00",
      close: "22:00",
    },
    friday: {
      enabled: false,
      open: "17:00",
      close: "23:30",
    },
    saturday: {
      enabled: false,
      open: "17:00",
      close: "23:30",
    },
    sunday: {
      enabled: true,
      open: "16:00",
      close: "21:00",
    },
  };

  const [hours, setHours] = useState(initialHours);
  const [capacity, setCapacity] = useState("");
  const [tables, setTables] = useState("");
  const [interiorMedia, setInteriorMedia] = useState(null);
  function updateField(field, value) {
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    if (field === "email") {
      setEmailCode("");
      setEmailCodeSent(false);
      setEmailVerified(false);
      setError("");
    }
    setApplication((current) => ({
      ...current,
      [field]: value,
    }));
    if (["address", "city", "state", "pinCode"].includes(field)) {
      setAddressSuggestions([]);
      setAddressLookupQuery([
        field === "address" ? value : application.address,
        field === "city" ? value : application.city,
        field === "state" ? value : application.state,
        field === "pinCode" ? value : application.pinCode,
      ].filter(Boolean).join(", "));
    }
  }

  function selectRestaurantAddress(feature) {
    const properties = feature.properties || {};
    const streetAddress = [properties.housenumber, properties.street].filter(Boolean).join(" ");
    const address = streetAddress || properties.name || properties.street || properties.city || "";
    setApplication((current) => ({
      ...current,
      address,
      city: properties.city || properties.district || properties.county || current.city,
      state: properties.state || current.state,
      pinCode: properties.postcode || current.pinCode,
    }));
    setAddressSuggestions([]);
    setAddressLookupQuery("");
    setAddressLookupError("");
  }
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const ACCEPTED_DOCUMENT_TYPES = ["application/pdf"];

  function handleDocumentChange(field, file) {
    setError("");
    setFieldErrors((current) => ({ ...current, [field]: "" }));

    if (!file) return;

    if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type)) {
      setFieldErrors((current) => ({ ...current, [field]: "Official documents must be uploaded as PDF files." }));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFieldErrors((current) => ({ ...current, [field]: "File must be 5 MB or smaller." }));
      return;
    }

    setDocuments((current) => ({
      ...current,
      [field]: file,
    }));
  }

  function handleBannerSelection(file) {
    setError("");
    setFieldErrors((current) => ({ ...current, brandingImages: "" }));
    if (!file) return;

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setFieldErrors((current) => ({ ...current, brandingImages: "Choose a PNG or JPG image." }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFieldErrors((current) => ({ ...current, brandingImages: "Image must be 10 MB or smaller." }));
      return;
    }

    setPendingBanner(file);
  }

  function saveCroppedBanner(file) {
    setDocuments((current) => ({ ...current, brandingImages: file }));
    setFieldErrors((current) => ({ ...current, brandingImages: "" }));
    setPendingBanner(null);
  }

  function removeDocument(field) {
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    setDocuments((current) => ({
      ...current,
      [field]: null,
    }));
  }

  function updateHours(day, field, value) {
    setHours((current) => ({
      ...current,
      [day]: {
        ...current[day],
        [field]: value,
      },
    }));
  }

  function toggleDay(day) {
    setHours((current) => ({
      ...current,
      [day]: {
        ...current[day],
        enabled: !current[day].enabled,
      },
    }));
  }

  function handleInteriorMedia(event) {
    const file = event.target.files?.[0] || null;

    if (!file) return;

    const maxSize = 10 * 1024 * 1024;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Interior media must be a JPEG or PNG image.");
      return;
    }

    if (file.size > maxSize) {
      setError("Interior media must be 10 MB or smaller.");
      return;
    }

    setError("");
    setInteriorMedia(file);

    event.target.value = "";
  }

  function validateDocuments() {
    if (!documents.brandingImages) {
      setFieldErrors((current) => ({ ...current, brandingImages: "Upload and crop a restaurant banner image." }));
      return false;
    }

    if (!documents.fssaiLicense) {
      setFieldErrors((current) => ({ ...current, fssaiLicense: "Upload your FSSAI or food safety document." }));
      return false;
    }

    if (!documents.businessRegistration) {
      setFieldErrors((current) => ({ ...current, businessRegistration: "Upload your business registration certificate." }));
      return false;
    }

    if (!documents.ownerIdentity) {
      setFieldErrors((current) => ({ ...current, ownerIdentity: "Upload your owner identity proof." }));
      return false;
    }

    return true;
  }

  function handleDocumentsContinue(event) {
    event.preventDefault();

    if (!validateDocuments()) return;

    setError("");

    console.log("Documents:", documents);

    setStep(4);
  }

  async function requestEmailCode() {
    const email = application.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setFieldErrors((current) => ({ ...current, email: "Enter a valid email address." }));
      return;
    }
    setEmailBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/auth/manager/send-verification`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || "Unable to send a confirmation code.");
      setEmailCodeSent(true);
      setEmailVerified(false);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setEmailBusy(false);
    }
  }

  async function verifyEmailCode() {
    setEmailBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/auth/manager/verify-email`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: application.email.trim().toLowerCase(), code: emailCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || "Unable to verify this email.");
      setEmailVerified(true);
      setError("");
    } catch (reason) {
      setError(reason.message);
    } finally {
      setEmailBusy(false);
    }
  }

  function handlePersonalContinue(event) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) return;

    setError("");
    setFieldErrors({});

    if (application.password !== application.confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match." });
      return;
    }

    if (!emailVerified) {
      setError("Verify your email address with the confirmation code before continuing.");
      return;
    }

    setApplication((current) => ({
      ...current,
      restaurantEmail: current.restaurantEmail || current.email,
    }));
    setStep(2);
  }

  function handleRestaurantContinue(event) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) return;

    setError("");

    /*
     * We are not submitting to the backend yet.
     *
     * The complete application will be submitted after:
     * Personal Details
     * Restaurant Info
     * Documents
     * Operating Hours
     * Review
     */

    console.log("Restaurant information:", application);

    setStep(3);
  }

  function handleBack() {
    setError("");
    setStep((current) => Math.max(1, current - 1));
  }
  async function handleFinalSubmit(event) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      const formData = new FormData();

      // Manager account
      formData.append("name", application.name);
      formData.append("email", application.email);
      formData.append("password", application.password);

      // Restaurant information
      formData.append("restaurant_name", application.restaurantName);
      formData.append(
        "restaurant_description",
        application.restaurantDescription,
      );
      formData.append("cuisine_type", application.cuisineType);
      formData.append("restaurant_contact", application.restaurantContact);
      formData.append("restaurant_email", application.restaurantEmail);

      // Address
      formData.append("address", application.address);
      formData.append("city", application.city);
      formData.append("state", application.state);
      formData.append("pin_code", application.pinCode);

      // Restaurant capacity
      formData.append("capacity", capacity);
      formData.append("tables", tables);
      // Operating hours
      Object.entries(hours).forEach(([day, schedule]) => {
        formData.append(`${day}_enabled`, String(schedule.enabled));
        formData.append(`${day}_open`, schedule.open);
        formData.append(`${day}_close`, schedule.close);
      });

      // Required documents
      if (documents.fssaiLicense) {
        formData.append("fssai_license", documents.fssaiLicense);
      }

      if (documents.businessRegistration) {
        formData.append(
          "business_registration",
          documents.businessRegistration,
        );
      }

      if (documents.ownerIdentity) {
        formData.append("owner_identity", documents.ownerIdentity);
      }

      // Optional documents
      if (documents.gstCertificate) {
        formData.append("gst_certificate", documents.gstCertificate);
      }

      formData.append("branding_images", documents.brandingImages);

      if (interiorMedia) {
        formData.append("interior_media", interiorMedia);
      }

      const response = await fetch(`${API_BASE}/api/auth/manager/register`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || "Unable to submit manager registration.",
        );
      }

      console.log("Manager application submitted:", data);

      // Go to waiting for admin approval page
      navigate("/manager/pending");
    } catch (err) {
      console.error("Manager registration failed:", err);

      setError(err.message || "Unable to submit manager registration.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ManagerAuthLayout>
      <div className="w-full">
        {/* Progress */}
        <div className="mb-10 border-b border-stone-200 pb-7">
          <div className="flex w-full items-start justify-between">
            {steps.map((label, index) => {
              const stepNumber = index + 1;
              const active = stepNumber === step;
              const completed = stepNumber < step;

              return (
                <div key={label} className="flex flex-1 items-start">
                  {/* Step */}
                  <div className="flex min-w-[90px] flex-col items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (stepNumber <= step) {
                          setError("");
                          setStep(stepNumber);
                        }
                      }}
                      disabled={stepNumber > step}
                      className="flex flex-col items-center"
                    >
                      <span
                        className={[
                          "grid h-9 w-9 place-items-center rounded-full border text-xs font-semibold transition",
                          active || completed
                            ? "border-wine bg-wine text-white"
                            : "border-stone-300 bg-white text-stone-400",
                        ].join(" ")}
                      >
                        {stepNumber}
                      </span>

                      <span
                        className={[
                          "mt-3 text-center text-xs font-medium leading-4",
                          active || completed ? "text-ink" : "text-stone-400",
                        ].join(" ")}
                      >
                        {label}
                      </span>
                    </button>
                  </div>

                  {/* Connector */}
                  {stepNumber < steps.length && (
                    <div
                      className={[
                        "mt-[18px] h-px flex-1",
                        stepNumber < step ? "bg-wine" : "bg-stone-200",
                      ].join(" ")}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <h2 className="font-display text-3xl font-semibold text-ink">
              Create Manager Account
            </h2>

            <p className="mb-7 mt-2 text-sm leading-6 text-stone-500">
              Start your DineBook restaurant manager application with your
              personal account details.
            </p>

            <form onSubmit={handlePersonalContinue} noValidate>
              <FormField
                id="name"
                label="Full Name"
                type="text"
                placeholder="Enter your full name"
                autoComplete="name"
                icon={User}
                minLength={2}
                required
                value={application.name}
                error={fieldErrors.name}
                onChange={(event) => updateField("name", event.target.value)}
              />

              <FormField
                id="email"
                label="Email Address"
                type="email"
                placeholder="manager@restaurant.com"
                autoComplete="email"
                icon={Mail}
                required
                value={application.email}
                error={fieldErrors.email}
                onChange={(event) => updateField("email", event.target.value)}
              />

              <div className="-mt-2 mb-5">
                {!emailCodeSent ? (
                  <button type="button" onClick={requestEmailCode} disabled={emailBusy || emailVerified}
                    className="text-sm font-semibold text-wine hover:text-ink disabled:opacity-60">
                    {emailBusy ? "Sending code…" : "Send email confirmation code"}
                  </button>
                ) : emailVerified ? (
                  <p className="text-sm font-medium text-emerald-700">Email confirmed</p>
                ) : (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="block flex-1 text-sm font-medium text-ink" htmlFor="managerEmailCode">
                      Confirmation code
                      <input id="managerEmailCode" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                        value={emailCode} onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="mt-2 h-11 w-full rounded-lg border border-stone-200 px-3 text-sm outline-none focus:border-wine" />
                    </label>
                    <button type="button" onClick={verifyEmailCode} disabled={emailBusy || emailCode.length !== 6}
                      className="h-11 rounded-lg bg-wine px-4 text-sm font-semibold text-white disabled:opacity-60">
                      {emailBusy ? "Checking…" : "Verify"}
                    </button>
                    <button type="button" onClick={requestEmailCode} disabled={emailBusy}
                      className="h-11 rounded-lg border border-stone-200 px-3 text-sm font-semibold text-ink disabled:opacity-60">Resend</button>
                  </div>
                )}
              </div>

              <PasswordField
                id="password"
                label="Password"
                placeholder="Create a password"
                autoComplete="new-password"
                minLength={8}
                required
                value={application.password}
                error={fieldErrors.password}
                onChange={(event) =>
                  updateField("password", event.target.value)
                }
              />

              <PasswordField
                id="confirmPassword"
                label="Confirm Password"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                minLength={8}
                required
                value={application.confirmPassword}
                error={fieldErrors.confirmPassword}
                onChange={(event) =>
                  updateField("confirmPassword", event.target.value)
                }
              />

              <Notice message={error} />

              <button
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-wine/20"
                type="submit"
              >
                Continue
                <ArrowRight size={16} />
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-stone-500">
              Already have a manager account?{" "}
              <Link
                to="/manager/login"
                className="font-semibold text-wine hover:text-ink"
              >
                Sign in
              </Link>
            </p>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <h2 className="font-display text-3xl font-semibold text-ink">
              Restaurant Information
            </h2>

            <p className="mb-7 mt-2 text-sm leading-6 text-stone-500">
              Fill out the public-facing details for your establishment.
            </p>

            <form onSubmit={handleRestaurantContinue} noValidate>
              {/* Restaurant Name */}
              <FormField
                id="restaurantName"
                label="Restaurant Name"
                type="text"
                placeholder="Enter your restaurant name"
                icon={Store}
                minLength={2}
                required
                value={application.restaurantName}
                onChange={(event) =>
                  updateField("restaurantName", event.target.value)
                }
              />

              {/* Description */}
              <label className="mb-4 block" htmlFor="restaurantDescription">
                <span className="mb-2 block text-sm font-medium text-ink">
                  Restaurant Description
                </span>

                <textarea
                  id="restaurantDescription"
                  name="restaurantDescription"
                  rows={4}
                  placeholder="Describe your restaurant, cuisine, atmosphere, and dining experience."
                  required
                  value={application.restaurantDescription}
                  aria-invalid={Boolean(fieldErrors.restaurantDescription)}
                  onInvalid={(event) => { event.preventDefault(); setFieldErrors((current) => ({ ...current, restaurantDescription: "Enter a restaurant description." })); }}
                  onChange={(event) =>
                    updateField("restaurantDescription", event.target.value)
                  }
                  className="block w-full resize-none rounded-lg border border-stone-200 bg-white px-3.5 py-3 text-sm text-ink outline-none placeholder:text-stone-400 transition focus:border-wine focus:ring-2 focus:ring-wine/10"
                />
                {fieldErrors.restaurantDescription && <p className="-mt-3 mb-4 text-xs font-medium text-red-600" role="alert">{fieldErrors.restaurantDescription}</p>}
              </label>

              {/* Cuisine */}
              <label className="mb-4 block" htmlFor="cuisineType">
                <span className="mb-2 block text-sm font-medium text-ink">
                  Cuisine Type
                </span>

                <select
                  id="cuisineType"
                  name="cuisineType"
                  required
                  value={application.cuisineType}
                  aria-invalid={Boolean(fieldErrors.cuisineType)}
                  onInvalid={(event) => { event.preventDefault(); setFieldErrors((current) => ({ ...current, cuisineType: "Choose a cuisine type." })); }}
                  onChange={(event) =>
                    updateField("cuisineType", event.target.value)
                  }
                  className="h-12 w-full appearance-none rounded-lg border border-stone-200 bg-white px-3.5 text-sm text-ink outline-none transition focus:border-wine focus:ring-2 focus:ring-wine/10"
                >
                  <option value="">Select cuisine type</option>
                  <option value="Contemporary American">
                    Contemporary American
                  </option>
                  <option value="Indian">Indian</option>
                  <option value="Italian">Italian</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Mexican">Mexican</option>
                  <option value="Mediterranean">Mediterranean</option>
                  <option value="French">French</option>
                  <option value="Thai">Thai</option>
                  <option value="Other">Other</option>
                </select>
                {fieldErrors.cuisineType && <p className="-mt-3 mb-4 text-xs font-medium text-red-600" role="alert">{fieldErrors.cuisineType}</p>}
              </label>

              {/* Contact + Email */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  id="restaurantContact"
                  label="Restaurant Contact No."
                  type="tel"
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  required
                  pattern="[+]?[0-9][0-9 ()-]{5,18}[0-9]"
                  patternMessage="Enter a valid phone number."
                  value={application.restaurantContact}
                  onChange={(event) =>
                    updateField("restaurantContact", event.target.value)
                  }
                />

                <FormField
                  id="restaurantEmail"
                  label="Restaurant Email"
                  type="email"
                  placeholder="hello@restaurant.com"
                  autoComplete="email"
                  required
                  value={application.restaurantEmail}
                  onChange={(event) =>
                    updateField("restaurantEmail", event.target.value)
                  }
                />
              </div>

              {/* Address */}
              <div className="relative">
                <FormField
                  id="address"
                  label="Full Restaurant Address"
                  type="text"
                  placeholder="Type the address, then select a match"
                  autoComplete="street-address"
                  icon={MapPin}
                  required
                  value={application.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  onBlur={() => window.setTimeout(() => setAddressSuggestions([]), 150)}
                />
                {(addressLookupBusy || addressSuggestions.length > 0 || addressLookupError) && (
                  <div className="absolute z-20 -mt-3 w-full overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg">
                    {addressLookupBusy && <p className="px-4 py-3 text-sm text-stone-500">Searching addresses…</p>}
                    {!addressLookupBusy && addressSuggestions.map((feature, index) => {
                      const place = feature.properties || {};
                      const primary = [place.housenumber, place.street].filter(Boolean).join(" ") || place.name || place.street || "Address result";
                      const secondary = [place.city || place.district || place.county, place.state, place.postcode, place.country].filter(Boolean).join(", ");
                      return (
                        <button
                          key={`${feature.properties?.osm_id || primary}-${index}`}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectRestaurantAddress(feature)}
                          className="block w-full border-b border-stone-100 px-4 py-3 text-left last:border-0 hover:bg-stone-50"
                        >
                          <span className="block text-sm font-medium text-ink">{primary}</span>
                          {secondary && <span className="mt-0.5 block text-xs text-stone-500">{secondary}</span>}
                        </button>
                      );
                    })}
                    {!addressLookupBusy && addressLookupError && <p className="px-4 py-3 text-sm text-amber-800">{addressLookupError}</p>}
                  </div>
                )}
                <p className="-mt-2 mb-4 text-xs text-stone-400">Choose a suggested location to fill its street address, city, state, and postal code. Search data © OpenStreetMap contributors.</p>
              </div>

              {/* City / State / PIN */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  id="city"
                  label="City"
                  type="text"
                  placeholder="City"
                  autoComplete="address-level2"
                  required
                  value={application.city}
                  onChange={(event) => updateField("city", event.target.value)}
                />

                <FormField
                  id="state"
                  label="State"
                  type="text"
                  placeholder="State"
                  autoComplete="address-level1"
                  required
                  value={application.state}
                  onChange={(event) => updateField("state", event.target.value)}
                />

                <FormField
                  id="pinCode"
                  label="PIN / ZIP Code"
                  type="text"
                  placeholder="PIN / ZIP"
                  autoComplete="postal-code"
                  required
                  value={application.pinCode}
                  onChange={(event) =>
                    updateField("pinCode", event.target.value)
                  }
                />
              </div>

              {/* Live Google Maps location preview */}
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">
                    Live Google Maps Location
                  </span>

                  <span className="text-xs font-medium text-wine">
                    Required
                  </span>
                </div>

                <div className="relative h-64 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                  <iframe
                    key={mapQuery || "restaurant-location"}
                    title="Google Maps restaurant location preview"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery || "India")}&output=embed`}
                    className="h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-stone-400">
                  The map preview follows your restaurant address. You can add precise map coordinates later.
                </p>
              </div>

              <Notice message={error} />

              {/* Buttons */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex h-12 items-center justify-center rounded-lg border border-ink bg-white px-5 text-sm font-semibold text-ink transition hover:bg-stone-50 focus:outline-none focus:ring-4 focus:ring-stone-200"
                >
                  Back
                </button>

                <button
                  type="submit"
                  className="flex h-12 items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-wine/20"
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <h2 className="font-display text-3xl font-semibold text-ink">
              Business Documents
            </h2>

            <p className="mb-7 mt-2 text-sm leading-6 text-stone-500">
              Upload official merchant documents as PDF files only (Max 5MB).
            </p>

            <form onSubmit={handleDocumentsContinue} noValidate>
              <DocumentCard
                title="FSSAI License / Food Safety"
                description="Upload your food safety or FSSAI license as a PDF."
                required
                file={documents.fssaiLicense}
                error={fieldErrors.fssaiLicense}
                onUpload={(file) => handleDocumentChange("fssaiLicense", file)}
                onRemove={() => removeDocument("fssaiLicense")}
              />

              <DocumentCard
                title="Business Registration Cert."
                description="Upload your business registration certificate as a PDF."
                required
                file={documents.businessRegistration}
                error={fieldErrors.businessRegistration}
                onUpload={(file) =>
                  handleDocumentChange("businessRegistration", file)
                }
                onRemove={() => removeDocument("businessRegistration")}
              />

              <DocumentCard
                title="GST / Tax Certificate"
                description="Upload your GST or tax certificate as a PDF."
                file={documents.gstCertificate}
                error={fieldErrors.gstCertificate}
                onUpload={(file) =>
                  handleDocumentChange("gstCertificate", file)
                }
                onRemove={() => removeDocument("gstCertificate")}
              />

              <DocumentCard
                title="Owner Identity Proof (ID)"
                description="Upload a government-issued identity document as a PDF."
                required
                file={documents.ownerIdentity}
                error={fieldErrors.ownerIdentity}
                onUpload={(file) => handleDocumentChange("ownerIdentity", file)}
                onRemove={() => removeDocument("ownerIdentity")}
              />

              <DocumentCard
                title="Restaurant Banner Image"
                description="Upload a PNG or JPG banner image (16:9 crop, up to 10 MB)."
                required
                file={documents.brandingImages}
                error={fieldErrors.brandingImages}
                onUpload={handleBannerSelection}
                onRemove={() => removeDocument("brandingImages")}
                accept=".png,.jpg,.jpeg"
                image
              />

              {/* Security notice */}
              <div className="mb-6 flex gap-3 rounded-lg bg-stone-50 p-4">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-wine" />

                <p className="text-xs leading-5 text-stone-500">
                  Your uploaded credentials are encrypted and strictly used for
                  compliance verification. They are never shared publicly.
                </p>
              </div>

              <Notice message={error} />

              {/* Navigation */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex h-12 items-center justify-center rounded-lg border border-ink bg-white px-5 text-sm font-semibold text-ink transition hover:bg-stone-50 focus:outline-none focus:ring-4 focus:ring-stone-200"
                >
                  Back
                </button>

                <button
                  type="submit"
                  className="flex h-12 items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-wine/20"
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </>
        )}
        {/* STEP 4 */}
        {step === 4 && (
          <>
            <h2 className="font-display text-3xl font-semibold text-ink">
              Location & Operating Hours
            </h2>

            <p className="mb-7 mt-2 text-sm leading-6 text-stone-500">
              Configure weekly timing schedules and floor capabilities.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();

                if (!capacity.trim()) {
                  setFieldErrors((current) => ({ ...current, capacity: "Enter the total seating capacity." }));
                  return;
                }

                if (!tables.trim()) {
                  setFieldErrors((current) => ({ ...current, tables: "Enter the number of dining tables." }));
                  return;
                }

                setError("");
                setFieldErrors((current) => ({ ...current, capacity: "", tables: "" }));

                console.log("Operating hours:", {
                  hours,
                  capacity,
                  tables,
                  interiorMedia,
                });

                setStep(5);
              }}
              noValidate
            >
              {/* Weekly Timing Schedule */}
              <div className="mb-7">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink">
                  Weekly Timing Schedule
                </h3>

                <div className="space-y-3">
                  {Object.entries(hours).map(([day, schedule]) => (
                    <div
                      key={day}
                      className="grid grid-cols-[1fr_112px_auto_112px_52px] items-center gap-3"
                    >
                      <span className="text-sm font-medium capitalize text-ink">
                        {day}
                      </span>

                      <input
                        type="time"
                        value={schedule.open}
                        disabled={!schedule.enabled}
                        onChange={(event) =>
                          updateHours(day, "open", event.target.value)
                        }
                        className="h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-ink outline-none transition focus:border-wine focus:ring-2 focus:ring-wine/10 disabled:cursor-not-allowed disabled:text-stone-300"
                      />

                      <span className="text-center text-xs text-stone-400">
                        to
                      </span>

                      <input
                        type="time"
                        value={schedule.close}
                        disabled={!schedule.enabled}
                        onChange={(event) =>
                          updateHours(day, "close", event.target.value)
                        }
                        className="h-10 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-ink outline-none transition focus:border-wine focus:ring-2 focus:ring-wine/10 disabled:cursor-not-allowed disabled:text-stone-300"
                      />

                      <button
                        type="button"
                        onClick={() => toggleDay(day)}
                        aria-label={`${schedule.enabled ? "Disable" : "Enable"} ${day}`}
                        className={[
                          "relative h-7 w-12 rounded-full transition",
                          schedule.enabled ? "bg-wine" : "bg-slate-200",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
                            schedule.enabled ? "right-1" : "left-1",
                          ].join(" ")}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seating & Capacity */}
              <div className="mb-7">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink">
                  Seating & Capacity
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    id="capacity"
                    label="Total Seating Capacity"
                    type="number"
                    placeholder="45"
                    required
                    min={1}
                    value={capacity}
                    error={fieldErrors.capacity}
                    onChange={(event) => { setCapacity(event.target.value); setFieldErrors((current) => ({ ...current, capacity: "" })); }}
                  />

                  <FormField
                    id="tables"
                    label="No. of Dining Tables"
                    type="number"
                    placeholder="12"
                    required
                    min={1}
                    value={tables}
                    error={fieldErrors.tables}
                    onChange={(event) => { setTables(event.target.value); setFieldErrors((current) => ({ ...current, tables: "" })); }}
                  />
                </div>
              </div>

              {/* Optional Interior Media */}
              <div className="mb-7">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink">
                  Optional Interior Media
                </h3>

                <label
                  htmlFor="interiorMedia"
                  className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 px-6 py-6 text-center transition hover:border-wine hover:bg-wine/[0.02]"
                >
                  <Upload size={20} className="mb-2 text-wine" />

                  {interiorMedia ? (
                    <>
                      <span className="text-sm font-semibold text-ink">
                        {interiorMedia.name}
                      </span>

                      <span className="mt-1 text-xs text-emerald-600">
                        {(interiorMedia.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-wine">
                        Click to upload or drag & drop images
                      </span>

                      <span className="mt-1 text-xs text-stone-400">
                        JPEG, PNG up to 10MB. Ideal dimension 1200x800.
                      </span>
                    </>
                  )}

                  <input
                    id="interiorMedia"
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleInteriorMedia}
                  />
                </label>
              </div>

              <Notice message={error} />

              {/* Navigation */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex h-12 items-center justify-center rounded-lg border border-ink bg-white px-5 text-sm font-semibold text-ink transition hover:bg-stone-50 focus:outline-none focus:ring-4 focus:ring-stone-200"
                >
                  Back
                </button>

                <button
                  type="submit"
                  className="flex h-12 items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-wine/20"
                >
                  Continue to Review
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </>
        )}
        {/* STEP 5 - REVIEW */}
        {step === 5 && (
          <>
            <h2 className="font-display text-3xl font-semibold text-ink">
              Review Your Application
            </h2>

            <p className="mb-7 mt-2 text-sm leading-6 text-stone-500">
              Review all the information before submitting your restaurant
              application for admin approval.
            </p>

            <form onSubmit={handleFinalSubmit}>
              {/* Personal Details */}
              <section className="mb-5 rounded-xl border border-stone-200 bg-white">
                <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      Personal Details
                    </h3>
                    <p className="mt-1 text-xs text-stone-400">
                      Manager account information
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-semibold text-wine hover:text-ink"
                  >
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
                  <ReviewItem label="Full Name" value={application.name} />

                  <ReviewItem label="Email Address" value={application.email} />
                </div>
              </section>

              {/* Restaurant Information */}
              <section className="mb-5 rounded-xl border border-stone-200 bg-white">
                <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      Restaurant Information
                    </h3>
                    <p className="mt-1 text-xs text-stone-400">
                      Public-facing restaurant details
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-xs font-semibold text-wine hover:text-ink"
                  >
                    Edit
                  </button>
                </div>

                <div className="space-y-4 px-5 py-5">
                  <ReviewItem
                    label="Restaurant Name"
                    value={application.restaurantName}
                  />

                  <ReviewItem
                    label="Description"
                    value={application.restaurantDescription}
                    full
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ReviewItem
                      label="Cuisine Type"
                      value={application.cuisineType}
                    />

                    <ReviewItem
                      label="Restaurant Email"
                      value={application.restaurantEmail}
                    />

                    <ReviewItem
                      label="Restaurant Contact"
                      value={application.restaurantContact}
                    />

                    <ReviewItem
                      label="PIN / ZIP Code"
                      value={application.pinCode}
                    />
                  </div>

                  <ReviewItem
                    label="Restaurant Address"
                    value={`${application.address}, ${application.city}, ${application.state}`}
                    full
                  />
                </div>
              </section>

              {/* Documents */}
              <section className="mb-5 rounded-xl border border-stone-200 bg-white">
                <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      Business Documents
                    </h3>
                    <p className="mt-1 text-xs text-stone-400">
                      Compliance and verification documents
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-xs font-semibold text-wine hover:text-ink"
                  >
                    Edit
                  </button>
                </div>

                <div className="space-y-3 px-5 py-5">
                  <ReviewDocument
                    label="FSSAI License / Food Safety"
                    file={documents.fssaiLicense}
                    required
                  />

                  <ReviewDocument
                    label="Business Registration Certificate"
                    file={documents.businessRegistration}
                    required
                  />

                  <ReviewDocument
                    label="GST / Tax Certificate"
                    file={documents.gstCertificate}
                  />

                  <ReviewDocument
                    label="Owner Identity Proof"
                    file={documents.ownerIdentity}
                    required
                  />

                  <ReviewDocument
                    label="Restaurant Banner Image"
                    file={documents.brandingImages}
                    required
                  />
                </div>
              </section>

              {/* Operating Hours */}
              <section className="mb-5 rounded-xl border border-stone-200 bg-white">
                <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      Operating Hours
                    </h3>
                    <p className="mt-1 text-xs text-stone-400">
                      Weekly restaurant schedule
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="text-xs font-semibold text-wine hover:text-ink"
                  >
                    Edit
                  </button>
                </div>

                <div className="space-y-2 px-5 py-5">
                  {Object.entries(hours).map(([day, schedule]) => (
                    <div
                      key={day}
                      className="flex items-center justify-between rounded-lg bg-stone-50 px-4 py-3"
                    >
                      <span className="text-sm font-medium capitalize text-ink">
                        {day}
                      </span>

                      {schedule.enabled ? (
                        <span className="text-sm text-stone-600">
                          {schedule.open} – {schedule.close}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-stone-400">
                          Closed
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Capacity */}
              <section className="mb-5 rounded-xl border border-stone-200 bg-white">
                <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      Seating & Capacity
                    </h3>
                    <p className="mt-1 text-xs text-stone-400">
                      Restaurant floor information
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="text-xs font-semibold text-wine hover:text-ink"
                  >
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
                  <ReviewItem
                    label="Total Seating Capacity"
                    value={`${capacity} seats`}
                  />

                  <ReviewItem
                    label="Dining Tables"
                    value={`${tables} tables`}
                  />
                </div>
              </section>

              {/* Confirmation */}
              <div className="mb-6 flex gap-3 rounded-xl bg-stone-50 p-4">
                <ShieldCheck size={19} className="mt-0.5 shrink-0 text-wine" />

                <div>
                  <p className="text-sm font-semibold text-ink">
                    Ready to submit?
                  </p>

                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    Your application will be sent to the DineBook administration
                    team for verification. You will be able to access the
                    manager portal after your application is approved.
                  </p>
                </div>
              </div>

              <Notice message={error} />

              {/* Navigation */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex h-12 items-center justify-center rounded-lg border border-ink bg-white px-5 text-sm font-semibold text-ink transition hover:bg-stone-50 focus:outline-none focus:ring-4 focus:ring-stone-200"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-12 items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-wine/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit Application"}

                  {!submitting && <ArrowRight size={16} />}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
      <ImageCropDialog
        file={pendingBanner}
        onCancel={() => setPendingBanner(null)}
        onCropped={saveCroppedBanner}
      />
    </ManagerAuthLayout>
  );
}
