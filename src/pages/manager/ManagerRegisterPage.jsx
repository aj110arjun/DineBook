import { useState } from "react";
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
import { Link } from "react-router-dom";

import ManagerAuthLayout from "../../components/auth/ManagerAuthLayout.jsx";
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
  accept = ".pdf,.png,.jpg,.jpeg",
  image = false,
}) {
  const inputId = `document-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4">
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
  const [error, setError] = useState("");

  const [application, setApplication] = useState(initialApplication);
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
    friday: {
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
    setApplication((current) => ({
      ...current,
      [field]: value,
    }));
  }
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const ACCEPTED_DOCUMENT_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
  ];

  function handleDocumentChange(field, file) {
    setError("");

    if (!file) return;

    if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type)) {
      setError("Only PDF, PNG, and JPG files are accepted.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Each file must be 5 MB or smaller.");
      return;
    }

    setDocuments((current) => ({
      ...current,
      [field]: file,
    }));
  }

  function removeDocument(field) {
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
    if (!documents.fssaiLicense) {
      setError("Please upload your FSSAI License / Food Safety document.");
      return false;
    }

    if (!documents.businessRegistration) {
      setError("Please upload your Business Registration Certificate.");
      return false;
    }

    if (!documents.ownerIdentity) {
      setError("Please upload your Owner Identity Proof.");
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

  function handlePersonalContinue(event) {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) return;

    setError("");

    if (application.password !== application.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

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
  function handleFinalSubmit(event) {
    event.preventDefault();

    setError("");

    console.log("Complete manager application:", {
      application,
      documents,
      hours,
      capacity,
      tables,
      interiorMedia,
    });

    // Backend submission will be connected here next.
    console.log("Manager application submitted for admin review.");
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
                onChange={(event) => updateField("email", event.target.value)}
              />

              <PasswordField
                id="password"
                label="Password"
                placeholder="Create a password"
                autoComplete="new-password"
                minLength={8}
                required
                value={application.password}
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
                  onChange={(event) =>
                    updateField("restaurantDescription", event.target.value)
                  }
                  className="block w-full resize-none rounded-lg border border-stone-200 bg-white px-3.5 py-3 text-sm text-ink outline-none placeholder:text-stone-400 transition focus:border-wine focus:ring-2 focus:ring-wine/10"
                />
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
              <FormField
                id="address"
                label="Full Restaurant Address"
                type="text"
                placeholder="Enter your complete restaurant address"
                autoComplete="street-address"
                icon={MapPin}
                required
                value={application.address}
                onChange={(event) => updateField("address", event.target.value)}
              />

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

              {/* Google Maps Preview */}
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">
                    Google Maps Location Preview
                  </span>

                  <span className="text-xs font-medium text-wine">
                    Required
                  </span>
                </div>

                <div className="relative h-32 overflow-hidden rounded-lg border border-stone-200 bg-slate-200">
                  {/* Road layout */}
                  <div className="absolute left-0 right-0 top-1/2 h-5 -translate-y-1/2 bg-white/90" />
                  <div className="absolute bottom-0 left-1/2 top-0 w-5 -translate-x-1/2 bg-white/90" />

                  {/* Location marker */}
                  <div className="absolute left-1/2 top-1/2 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-wine shadow-md">
                    <span className="h-2 w-2 rounded-full bg-white" />
                  </div>

                  {/* Address label */}
                  <div className="absolute bottom-3 left-3 rounded-md bg-ink px-3 py-1.5 text-[10px] font-medium text-white shadow-sm">
                    {application.address || "Restaurant Location"}
                  </div>
                </div>

                <p className="mt-2 text-xs leading-5 text-stone-400">
                  Your restaurant location will be displayed here after the
                  address is entered.
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
              Upload scan copies of official merchant permits. PDF, PNG, JPG
              accepted (Max 5MB).
            </p>

            <form onSubmit={handleDocumentsContinue} noValidate>
              <DocumentCard
                title="FSSAI License / Food Safety"
                description="Upload your food safety or FSSAI license."
                required
                file={documents.fssaiLicense}
                onUpload={(file) => handleDocumentChange("fssaiLicense", file)}
                onRemove={() => removeDocument("fssaiLicense")}
              />

              <DocumentCard
                title="Business Registration Cert."
                description="No document uploaded yet"
                required
                file={documents.businessRegistration}
                onUpload={(file) =>
                  handleDocumentChange("businessRegistration", file)
                }
                onRemove={() => removeDocument("businessRegistration")}
              />

              <DocumentCard
                title="GST / Tax Certificate"
                description="Supports VAT / Local sales taxes"
                file={documents.gstCertificate}
                onUpload={(file) =>
                  handleDocumentChange("gstCertificate", file)
                }
                onRemove={() => removeDocument("gstCertificate")}
              />

              <DocumentCard
                title="Owner Identity Proof (ID)"
                description="Upload a government-issued identity document."
                required
                file={documents.ownerIdentity}
                onUpload={(file) => handleDocumentChange("ownerIdentity", file)}
                onRemove={() => removeDocument("ownerIdentity")}
              />

              <DocumentCard
                title="Restaurant Branding & Images"
                description="Include logos or high-resolution hall captures"
                file={documents.brandingImages}
                onUpload={(file) =>
                  handleDocumentChange("brandingImages", file)
                }
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
                  setError("Please enter the total seating capacity.");
                  return;
                }

                if (!tables.trim()) {
                  setError("Please enter the number of dining tables.");
                  return;
                }

                setError("");

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
                    value={capacity}
                    onChange={(event) => setCapacity(event.target.value)}
                  />

                  <FormField
                    id="tables"
                    label="No. of Dining Tables"
                    type="number"
                    placeholder="12"
                    required
                    value={tables}
                    onChange={(event) => setTables(event.target.value)}
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
                  Submit For Admin Review
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
                    label="Restaurant Branding & Images"
                    file={documents.brandingImages}
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
                  className="flex h-12 items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-wine/20"
                >
                  Submit Application
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </ManagerAuthLayout>
  );
}
