import { Navigate, Route, Routes } from "react-router-dom";
import CustomerChangePasswordPage from "./pages/customer/CustomerChangePasswordPage.jsx";
import CustomerLoginPage from "./pages/customer/CustomerLoginPage.jsx";
import CustomerRecoveryPage from "./pages/customer/CustomerRecoveryPage.jsx";
import CustomerRegisterPage from "./pages/customer/CustomerRegisterPage.jsx";
import CustomerLandingPage from "./pages/customer/CustomerLandingPage.jsx";
import CustomerEmailVerificationPage from "./pages/customer/CustomerEmailVerificationPage.jsx";
import CustomerRestaurantDetailsPage from "./pages/customer/CustomerRestaurantDetailsPage.jsx";
import CustomerRestaurantListingPage from "./pages/customer/CustomerRestaurantListingPage.jsx";
import GuestOnlyRoute from "./components/auth/GuestOnlyRoute.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import AdminProtectedRoute from "./components/auth/AdminProtectedRoute.jsx";
import AdminLoginPage from "./pages/admin/AdminLoginPage.jsx";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage.jsx";
import AdminRestaurantsPage from "./pages/admin/AdminRestaurantsPage.jsx";
import AdminRestaurantDetailsPage from "./pages/admin/AdminRestaurantDetailsPage.jsx";
import AdminRequestsPage from "./pages/admin/AdminRequestsPage.jsx";
import AdminManagerRequestDetailsPage from "./pages/admin/AdminManagerRequestDetailsPage.jsx";
import ManagerRegisterPage from "./pages/manager/ManagerRegisterPage.jsx";
import ManagerLoginPage from "./pages/manager/ManagerLoginPage.jsx";
import ManagerDashboardPage from "./pages/manager/ManagerDashboardPage.jsx";
import ManagerProtectedRoute from "./components/auth/ManagerProtectedRoute.jsx";
import ManagerPendingPage from "./pages/manager/ManagerPendingPage.jsx";
import ManagerStaffPage from "./pages/manager/ManagerStaffPage.jsx";
import ManagerMenuPage from "./pages/manager/ManagerMenuPage.jsx";
import ManagerFloorsPage from "./pages/manager/ManagerFloorsPage.jsx";
import ChefLoginPage from "./pages/chef/ChefLoginPage.jsx";
import ChefDashboardPage from "./pages/chef/ChefDashboardPage.jsx";
import ChefChangePasswordPage from "./pages/chef/ChefChangePasswordPage.jsx";
import ChefProtectedRoute from "./components/auth/ChefProtectedRoute.jsx";
import PortalGuestOnlyRoute from "./components/auth/PortalGuestOnlyRoute.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/customer" replace />} />
        <Route path="/customer" element={<CustomerLandingPage />} />
        <Route
          path="/customer/restaurants"
          element={<CustomerRestaurantListingPage />}
        />
        <Route
          path="/customer/restaurants/:restaurantId/:section?"
          element={
            <ProtectedRoute>
              <CustomerRestaurantDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/login"
          element={
            <GuestOnlyRoute>
              <CustomerLoginPage />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/customer/register"
          element={
            <GuestOnlyRoute>
              <CustomerRegisterPage />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/customer/verify-email"
          element={<CustomerEmailVerificationPage />}
        />
        <Route path="/customer/recovery" element={<CustomerRecoveryPage />} />
        <Route
          path="/admin/recovery"
          element={<CustomerRecoveryPage role="admin" />}
        />
        <Route
          path="/manager/recovery"
          element={<CustomerRecoveryPage role="manager" />}
        />
        <Route
          path="/chef/recovery"
          element={<CustomerRecoveryPage role="chef" />}
        />
        <Route
          path="/customer/change-password"
          element={<CustomerChangePasswordPage />}
        />
        <Route path="*" element={<Navigate to="/customer/login" replace />} />

        <Route
          path="/admin/login"
          element={
            <PortalGuestOnlyRoute
              sessionPath="/api/auth/admin/me"
              redirectTo="/admin/dashboard"
              portalName="administrator"
            >
              <AdminLoginPage />
            </PortalGuestOnlyRoute>
          }
        />
        <Route
          path="/admin"
          element={<Navigate to="/admin/dashboard" replace />}
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboardPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/restaurants"
          element={
            <AdminProtectedRoute>
              <AdminRestaurantsPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/restaurants/:restaurantId"
          element={
            <AdminProtectedRoute>
              <AdminRestaurantDetailsPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/requests"
          element={
            <AdminProtectedRoute>
              <AdminRequestsPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/requests/:requestId"
          element={
            <AdminProtectedRoute>
              <AdminManagerRequestDetailsPage />
            </AdminProtectedRoute>
          }
        />
        <Route path="/manager/register" element={<ManagerRegisterPage />} />
        <Route
          path="/manager/login"
          element={
            <PortalGuestOnlyRoute
              sessionPath="/api/auth/manager/me"
              redirectTo="/manager/dashboard"
              portalName="manager"
            >
              <ManagerLoginPage />
            </PortalGuestOnlyRoute>
          }
        />
        <Route
          path="/manager"
          element={<Navigate to="/manager/dashboard" replace />}
        />
        <Route
          path="/manager/dashboard"
          element={
            <ManagerProtectedRoute>
              <ManagerDashboardPage />
            </ManagerProtectedRoute>
          }
        />
        <Route path="/manager/pending" element={<ManagerPendingPage />} />

        <Route
          path="/manager/staff"
          element={
            <ManagerProtectedRoute>
              <ManagerStaffPage />
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="/manager/menu"
          element={
            <ManagerProtectedRoute>
              <ManagerMenuPage />
            </ManagerProtectedRoute>
          }
        />
        <Route path="/manager/tables" element={<ManagerProtectedRoute><ManagerFloorsPage /></ManagerProtectedRoute>} />
        <Route path="/manager/floors" element={<Navigate to="/manager/tables" replace />} />
        <Route
          path="/chef"
          element={<Navigate to="/chef/dashboard" replace />}
        />
        <Route
          path="/chef/login"
          element={
            <PortalGuestOnlyRoute
              sessionPath="/api/chef/me"
              redirectTo="/chef/dashboard"
              portalName="chef"
            >
              <ChefLoginPage />
            </PortalGuestOnlyRoute>
          }
        />
        <Route
          path="/chef/dashboard"
          element={
            <ChefProtectedRoute>
              <ChefDashboardPage />
            </ChefProtectedRoute>
          }
        />
        <Route
          path="/chef/change-password"
          element={
            <ChefProtectedRoute>
              <ChefChangePasswordPage />
            </ChefProtectedRoute>
          }
        />
      </Routes>
      <ThemeToggle />
    </>
  );
}
