import { Navigate, Route, Routes } from "react-router-dom";
import CustomerChangePasswordPage from "./pages/customer/CustomerChangePasswordPage.jsx";
import CustomerLoginPage from "./pages/customer/CustomerLoginPage.jsx";
import CustomerRecoveryPage from "./pages/customer/CustomerRecoveryPage.jsx";
import CustomerRegisterPage from "./pages/customer/CustomerRegisterPage.jsx";
import CustomerLandingPage from "./pages/customer/CustomerLandingPage.jsx";
import CustomerEmailVerificationPage from "./pages/customer/CustomerEmailVerificationPage.jsx";
import GuestOnlyRoute from "./components/auth/GuestOnlyRoute.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import AdminProtectedRoute from "./components/auth/AdminProtectedRoute.jsx";
import AdminLoginPage from "./pages/admin/AdminLoginPage.jsx";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage.jsx";
import AdminRestaurantsPage from "./pages/admin/AdminRestaurantsPage.jsx";
import AdminRequestsPage from "./pages/admin/AdminRequestsPage.jsx";
import ManagerRegisterPage from "./pages/manager/ManagerRegisterPage.jsx";
import ManagerLoginPage from "./pages/manager/ManagerLoginPage.jsx";
import ManagerDashboardPage from "./pages/manager/ManagerDashboardPage.jsx";
import ManagerProtectedRoute from "./components/auth/ManagerProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/customer" replace />} />
      <Route path="/customer" element={<CustomerLandingPage />} />
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
        path="/customer/change-password"
        element={<CustomerChangePasswordPage />}
      />
      <Route path="*" element={<Navigate to="/customer/login" replace />} />

      <Route
        path="/admin/login"
        element={
          <GuestOnlyRoute>
            <AdminLoginPage />
          </GuestOnlyRoute>
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
        path="/admin/requests"
        element={
          <AdminProtectedRoute>
            <AdminRequestsPage />
          </AdminProtectedRoute>
        }
      />
      <Route path="/manager/register" element={<ManagerRegisterPage />} />
      <Route path="/manager/login" element={<ManagerLoginPage />} />
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
    </Routes>
  );
}
