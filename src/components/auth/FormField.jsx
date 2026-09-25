import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';

export function FormField({
  id,
  label,
  type = 'text',
  placeholder,
  autoComplete,
  icon: Icon,
  minLength,
  required = true,
  trailing,
  value,
  onChange,
}) {
  return (
    <label className="mb-4 block" htmlFor={id}>
      <span className="mb-2 block text-sm font-medium text-ink">{label}</span>
      <span className="flex h-12 items-center gap-3 rounded-lg border border-stone-200 bg-white px-3.5 text-stone-400 transition focus-within:border-wine focus-within:ring-2 focus-within:ring-wine/10">
        {Icon && <Icon size={16} aria-hidden="true" />}
        <input
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-stone-400 focus:ring-0"
          id={id}
          name={id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          value={value}
          onChange={onChange}
        />
        {trailing}
      </span>
    </label>
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
