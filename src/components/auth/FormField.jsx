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
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <span className="input-wrap">
        {Icon && <Icon size={15} aria-hidden="true" />}
        <input
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
          className="toggle-password"
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
