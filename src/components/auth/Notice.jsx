export default function Notice({ message, type = 'error' }) {
  if (!message) return null;
  return <div className={`my-4 rounded-lg border px-4 py-3 text-sm leading-6 ${type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`} role={type === 'success' ? 'status' : 'alert'} aria-live={type === 'success' ? 'polite' : 'assertive'}>{message}</div>;
}
