import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { store } from "./state/store.js";
import AppExperience, { AppErrorBoundary } from "./components/AppExperience.jsx";
import ConfirmDialogHost from "./components/ConfirmDialogHost.jsx";
import CustomerPreferencesProvider from "./components/customer/CustomerPreferences.jsx";
import "./assets/css/index.css";
import "./assets/css/styles.css";
import "./assets/css/design-system.css";
import "./assets/css/layout-refresh.css";
import "./assets/css/ux-improvements.css";

try {
  document.documentElement.dataset.theme = window.localStorage.getItem("dinebook-theme") === "dark" ? "dark" : "light";
} catch {
  document.documentElement.dataset.theme = "light";
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AppExperience />
        <AppErrorBoundary>
          <CustomerPreferencesProvider><App /></CustomerPreferencesProvider>
          <ConfirmDialogHost />
        </AppErrorBoundary>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
