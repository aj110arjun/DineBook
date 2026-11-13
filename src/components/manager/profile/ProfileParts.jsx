import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";

export function useImagePreview(file) {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) { setPreview(""); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return preview;
}

export function ProfileAvatar({ name, src }) {
  const [failed, setFailed] = useState(null);
  return <div className="manager-profile-photo">
    {src && failed !== src ? <img src={src} alt={`${name} profile`} onError={() => setFailed(src)} /> : <UserRound size={42} aria-label="Default profile avatar" />}
  </div>;
}

export function ProfileField({ id, label, error, hint, multiline = false, ...props }) {
  const Control = multiline ? "textarea" : "input";
  return <div className={`manager-profile-field ${multiline ? "is-wide" : ""}`}>
    <label htmlFor={id}>{label}</label>
    <Control id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} {...props} />
    {hint && <small id={`${id}-hint`}>{hint}</small>}
    {error && <small className="manager-profile-field-error" role="alert" id={`${id}-error`}>{error}</small>}
  </div>;
}

export function Detail({ label, children }) {
  return <div><dt>{label}</dt><dd>{children ?? "Not provided"}</dd></div>;
}
