import { useEffect, useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';

export function FormField({
  id,
  label,
  type = 'text',
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
  const [localError, setLocalError] = useState('');
  const visibleError = error || localError;
  const errorId = visibleError ? `${id}-error` : undefined;

  useEffect(() => {
    if (error !== undefined) setLocalError('');
  }, [error]);

  function validateInput(input) {
    if (input.validity.valueMissing) return `${label} is required.`;
    if (required && ['text', 'tel', 'password', 'email'].includes(type) && !input.value.trim()) return `${label} is required.`;
    if (input.validity.typeMismatch && type === 'email') return 'Enter a valid email address.';
    if (input.validity.tooShort) return `${label} must be at least ${minLength} characters.`;
    if (input.validity.tooLong) return `${label} must be ${maxLength} characters or fewer.`;
    if (input.validity.rangeUnderflow) return `${label} must be at least ${input.min}.`;
    if (input.validity.rangeOverflow) return `${label} must be no more than ${input.max}.`;
    if (input.validity.patternMismatch) return patternMessage || `Enter a valid ${label.toLowerCase()}.`;
    return '';
  }

  function handleChange(event) {
    if (localError) setLocalError(validateInput(event.currentTarget));
    onChange?.(event);
  }

  function handleBlur(event) {
    setLocalError(validateInput(event.currentTarget));
    onBlur?.(event);
  }

  function handleInvalid(event) {
    event.preventDefault();
    setLocalError(validateInput(event.currentTarget) || `Check ${label.toLowerCase()}.`);
  }
  return (
    <div className="mb-4">
      <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-medium text-ink">{label}</span>
      <span className={`flex h-12 items-center gap-3 rounded-lg border bg-white px-3.5 text-stone-400 transition focus-within:ring-2 ${visibleError ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-100' : 'border-stone-200 focus-within:border-wine focus-within:ring-wine/10'}`}>
        {Icon && <Icon size={16} aria-hidden="true" />}
        <input
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-stone-400 focus:ring-0"
          id={id}
          name={id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          min={min}
          max={max}
          step={step}
          pattern={pattern}
          required={required}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onInvalid={handleInvalid}
          aria-invalid={Boolean(visibleError)}
          aria-describedby={errorId}
        />
        {trailing}
      </span>
      </label>
      {visibleError && <p id={errorId} className="mt-1.5 text-xs font-medium text-red-600" role="alert">{visibleError}</p>}
    </div>
  );
}

export function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  const ToggleIcon = visible ? EyeOff : Eye;

  return (
    <FormField
      {...props}
      type={visible ? 'text' : 'password'}
      icon={LockKeyhole}
      trailing={(
        <button
          className="grid h-8 w-8 place-items-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-ink"
          type="button"
          onClick={() => setVisible(current => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <ToggleIcon size={16} />
        </button>
      )}
    />
  );
}
