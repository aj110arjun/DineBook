import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

export function FormField({
  id,
  label,
  type = "text",
  placeholder,
  autoComplete,
  icon: Icon,
  minLength,
  maxLength,
  min,
  max,
  step,
  pattern,
  patternMessage,
  required = true,
  trailing,
  value,
  onChange,
  onBlur,
  error,
}) {
  const visibleError = error;
  const errorId = visibleError ? `${id}-error` : undefined;

  return (
    <div className="mb-4" data-validation-container>
      <label className="block" htmlFor={id}>
        <span className="mb-2 block text-sm font-medium text-ink">{label}</span>
        <span
          className={`auth-field-control flex h-12 items-center gap-3 rounded-lg border bg-white px-3.5 text-stone-400 transition ${visibleError ? "border-red-400" : "border-stone-200"}`}
        >
          {Icon && <Icon size={16} aria-hidden="true" />}
          <input
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-stone-400 focus:ring-0"
            id={id}
            name={id}
            aria-label={label}
            type={type}
            placeholder={placeholder}
            autoComplete={autoComplete}
            minLength={minLength}
            maxLength={maxLength}
            min={min}
            max={max}
            step={step}
            pattern={pattern}
            data-pattern-message={patternMessage}
            required={required}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            aria-invalid={Boolean(visibleError)}
            aria-describedby={errorId}
          />
          {trailing}
        </span>
      </label>
      {visibleError && (
        <p
          id={errorId}
          className="mt-1.5 text-xs font-medium text-red-600"
          role="alert"
        >
          {visibleError}
        </p>
      )}
    </div>
  );
}

export function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  const ToggleIcon = visible ? EyeOff : Eye;

  return (
    <FormField
      {...props}
      type={visible ? "text" : "password"}
      icon={LockKeyhole}
      trailing={
        <button
          className="password-toggle grid h-8 w-8 place-items-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-ink"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          <ToggleIcon size={16} />
        </button>
      }
    />
  );
}
