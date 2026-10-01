import { useEffect, useRef } from 'react';
import { API_BASE } from '../../lib/authApi.js';

export default function GoogleSignInButton({ onSuccess, onError, className = '' }) {
  const popup = useRef(null);
  const closeTimer = useRef(null);
  const callbacks = useRef({ onSuccess, onError });
  callbacks.current = { onSuccess, onError };

  useEffect(() => {
    function receiveResult(event) {
      if (event.origin !== window.location.origin || event.source !== popup.current || event.data?.type !== 'dinebook-google-auth') return;
      if (closeTimer.current) window.clearInterval(closeTimer.current);
      closeTimer.current = null;
      popup.current = null;
      if (event.data.status === 'success') callbacks.current.onSuccess?.();
      else if (event.data.status === 'unavailable') callbacks.current.onError?.('This Google account cannot sign in as a customer.');
      else callbacks.current.onError?.('Google sign-in could not be completed. Please try again.');
    }
    window.addEventListener('message', receiveResult);
    return () => {
      window.removeEventListener('message', receiveResult);
      if (closeTimer.current) window.clearInterval(closeTimer.current);
    };
  }, []);

  function openGoogleSignIn() {
    callbacks.current.onError?.('');
    const width = 520;
    const height = 680;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
    const authPopup = window.open(
      `${API_BASE}/api/auth/customer/google/login`,
      'dinebook-google-sign-in',
      `popup=yes,width=${width},height=${height},left=${left},top=${top}`,
    );
    if (!authPopup) {
      callbacks.current.onError?.('Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.');
      return;
    }
    popup.current = authPopup;
    authPopup.focus();
    if (closeTimer.current) window.clearInterval(closeTimer.current);
    closeTimer.current = window.setInterval(() => {
      if (popup.current?.closed) {
        window.clearInterval(closeTimer.current);
        closeTimer.current = null;
        popup.current = null;
        callbacks.current.onError?.('Google sign-in was closed before it finished.');
      }
    }, 500);
  }

  return (
    <button
      className={className || 'flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-stone-200 bg-white text-sm font-semibold text-ink shadow-sm transition hover:bg-stone-50 focus:outline-none focus:ring-4 focus:ring-wine/10'}
      type="button"
      onClick={openGoogleSignIn}
    >
      <span className="font-bold text-base" aria-hidden="true">G</span>
      Continue with Google
    </button>
  );
}
