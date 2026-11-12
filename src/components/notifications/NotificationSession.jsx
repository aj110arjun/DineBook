import { createContext, useContext, useId } from "react";
import NotificationToasts from "./NotificationToasts.jsx";

const NotificationScope = createContext(null);

export function useNotificationScope() {
  return useContext(NotificationScope);
}

export default function NotificationSession({ children }) {
  // Query keys follow the authenticated portal instance, even though requests
  // use the same cookie and endpoint across portals.
  const scope = useId();
  return (
    <NotificationScope.Provider value={scope}>
      <NotificationToasts scope={scope} />
      {children}
    </NotificationScope.Provider>
  );
}
