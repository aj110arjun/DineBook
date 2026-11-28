import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AppExperience, { AppErrorBoundary } from "./components/AppExperience.jsx";
import ConfirmDialogHost from "./components/ConfirmDialogHost.jsx";
import AppProviders from "./app/providers/AppProviders.jsx";
import "./assets/css/index.css";
import "./assets/css/styles.css";
import "./assets/css/design-system.css";
import "./assets/css/layout-refresh.css";
import "./assets/css/ux-improvements.css";
import "./assets/css/ui-experience.css";
import "./assets/css/AdminFilters.css";
import "./assets/css/AdminRequestsPage.css";
import "./assets/css/AdminRestaurantsPage.css";
import "./assets/css/AdminRestaurantDetailsPage.css";

try {
  document.documentElement.dataset.theme = window.localStorage.getItem("dinebook-theme") === "dark" ? "dark" : "light";
} catch {
  document.documentElement.dataset.theme = "light";
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProviders>
        <AppExperience />
        <AppErrorBoundary>
          <App />
          <ConfirmDialogHost />
        </AppErrorBoundary>
    </AppProviders>
  </React.StrictMode>,
);
