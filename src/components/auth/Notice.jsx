export default function Notice({ message, type = 'error' }) {
  if (!message) return null;
  return <div className={`notice show ${type}`} role="status" aria-live="polite">{message}</div>;
}
