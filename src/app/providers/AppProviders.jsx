import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";

import AccountPreferencesProvider from "../../components/preferences/AccountPreferences.jsx";
import { store } from "../../state/store.js";
import QueryProvider from "./QueryProvider.jsx";

/** Application-only composition. Features never import this module. */
export default function AppProviders({ children }) {
  return (
    <Provider store={store}>
      <QueryProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AccountPreferencesProvider>{children}</AccountPreferencesProvider>
        </BrowserRouter>
      </QueryProvider>
    </Provider>
  );
}
