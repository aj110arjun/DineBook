import { Navigate, Route, Routes } from "react-router-dom";
import CustomerChangePasswordPage from "./pages/customer/CustomerChangePasswordPage.jsx";
import CustomerLoginPage from "./pages/customer/CustomerLoginPage.jsx";
import CustomerRecoveryPage from "./pages/customer/CustomerRecoveryPage.jsx";
import CustomerRegisterPage from "./pages/customer/CustomerRegisterPage.jsx";
import CustomerLandingPage from "./pages/customer/CustomerLandingPage.jsx";
import CustomerEmailVerificationPage from "./pages/customer/CustomerEmailVerificationPage.jsx";
import CustomerRestaurantDetailsPage from "./pages/customer/CustomerRestaurantDetailsPage.jsx";
import CustomerReservationPage from "./pages/customer/CustomerReservationPage.jsx";
import CustomerRestaurantListingPage from "./pages/customer/CustomerRestaurantListingPage.jsx";
import CustomerProfilePage from "./pages/customer/CustomerProfilePage.jsx";
import CustomerSavedRestaurantsPage from "./pages/customer/CustomerSavedRestaurantsPage.jsx";
import CustomerWalletPage from "./pages/customer/CustomerWalletPage.jsx";
import CustomerReservationsPage from "./pages/customer/CustomerReservationsPage.jsx";
import CustomerReservationDetailsPage from "./pages/customer/CustomerReservationDetailsPage.jsx";
import CustomerTransactionsPage from "./pages/customer/CustomerTransactionsPage.jsx";
import CustomerTransactionDetailsPage from "./pages/customer/CustomerTransactionDetailsPage.jsx";
import GuestOnlyRoute from "./components/auth/GuestOnlyRoute.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import AdminProtectedRoute from "./components/auth/AdminProtectedRoute.jsx";
import AdminTransactionDetailsPage from "./pages/admin/AdminTransactionDetailsPage.jsx";
import AdminTransactionsPage from "./pages/admin/AdminTransactionsPage.jsx";
import AdminLoginPage from "./pages/admin/AdminLoginPage.jsx";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage.jsx";
import AdminRestaurantsPage from "./pages/admin/AdminRestaurantsPage.jsx";
import AdminRestaurantDetailsPage from "./pages/admin/AdminRestaurantDetailsPage.jsx";
import AdminRequestsPage from "./pages/admin/AdminRequestsPage.jsx";
import AdminManagerRequestDetailsPage from "./pages/admin/AdminManagerRequestDetailsPage.jsx";
import AdminOffersPage from "./pages/admin/AdminOffersPage.jsx";
import ManagerRegisterPage from "./pages/manager/ManagerRegisterPage.jsx";
import ManagerLoginPage from "./pages/manager/ManagerLoginPage.jsx";
import ManagerDashboardPage from "./pages/manager/ManagerDashboardPage.jsx";
import ManagerRestaurantLocationPage from "./pages/manager/ManagerRestaurantLocationPage.jsx";
import ManagerProtectedRoute from "./components/auth/ManagerProtectedRoute.jsx";
import ManagerPendingPage from "./pages/manager/ManagerPendingPage.jsx";
import ManagerStaffPage from "./pages/manager/ManagerStaffPage.jsx";
import ManagerMenuPage from "./pages/manager/ManagerMenuPage.jsx";
import ManagerFloorsPage from "./pages/manager/ManagerFloorsPage.jsx";
import ManagerReservationsPage from "./pages/manager/ManagerReservationsPage.jsx";
import ChefLoginPage from "./pages/chef/ChefLoginPage.jsx";
import ChefDashboardPage from "./pages/chef/ChefDashboardPage.jsx";
import ChefMenuPage from "./pages/chef/ChefMenuPage.jsx";
import ChefChangePasswordPage from "./pages/chef/ChefChangePasswordPage.jsx";
import ChefProtectedRoute from "./components/auth/ChefProtectedRoute.jsx";
import PortalGuestOnlyRoute from "./components/auth/PortalGuestOnlyRoute.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import OrdersPage from "./pages/shared/OrdersPage.jsx";
import ManagerOrderDetailsPage from "./pages/manager/ManagerOrderDetailsPage.jsx";
import ManagerSpotOrderPage from "./pages/manager/ManagerSpotOrderPage.jsx";
import ManagerOperatingHoursPage from "./pages/manager/ManagerOperatingHoursPage.jsx";
import ManagerOffersPage from "./pages/manager/ManagerOffersPage.jsx";
import ChefServiceHoursPage from "./pages/chef/ChefServiceHoursPage.jsx";
import ManagerPaymentsPage from "./pages/manager/ManagerPaymentsPage.jsx";
import ManagerReviewsPage from "./pages/manager/ManagerReviewsPage.jsx";
import AdminReviewModerationPage from "./pages/admin/AdminReviewModerationPage.jsx";
import {
  AdminRevenuePage,
  ChefRevenuePage,
  ManagerRevenuePage,
} from "./pages/shared/RevenueWalletPage.jsx";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/customer" replace />} />
        <Route path="/customer" element={<CustomerLandingPage />} />
        <Route
          path="/customer/profile"
          element={
            <ProtectedRoute>
              <CustomerProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/saved-restaurants"
          element={
            <ProtectedRoute>
              <CustomerSavedRestaurantsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/profile/reviews"
          element={<Navigate to="/customer/profile" replace />}
        />
        <Route
          path="/customer/profile/wallet"
          element={
            <ProtectedRoute>
              <CustomerWalletPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/profile/transactions"
          element={
            <ProtectedRoute>
              <CustomerTransactionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/profile/transactions/:transactionType/:transactionId"
          element={
            <ProtectedRoute>
              <CustomerTransactionDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/profile/reservations"
          element={
            <ProtectedRoute>
              <CustomerReservationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/profile/reservations/:reservationId"
          element={
            <ProtectedRoute>
              <CustomerReservationDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/profile/orders"
          element={
            <ProtectedRoute>
              <OrdersPage mode="customer" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/restaurants"
          element={<CustomerRestaurantListingPage />}
        />
        <Route
          path="/customer/restaurants/:restaurantId/booking"
          element={
            <ProtectedRoute>
              <CustomerReservationPage />
            </ProtectedRoute>
          }
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
          path="/admin/orders"
          element={
            <AdminProtectedRoute>
              <Navigate to="/admin/dashboard" replace />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/offers"
          element={
            <AdminProtectedRoute>
              <AdminOffersPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/transactions/:restaurantId/:transactionId"
          element={<AdminProtectedRoute><AdminTransactionDetailsPage /></AdminProtectedRoute>}
        />
        <Route
          path="/admin/transactions"
          element={<AdminProtectedRoute><AdminTransactionsPage /></AdminProtectedRoute>}
        />
        <Route
          path="/admin/revenue"
          element={
            <AdminProtectedRoute>
              <AdminRevenuePage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <AdminProtectedRoute>
              <AdminReviewModerationPage />
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
          path="/manager/restaurant-location"
          element={
            <ManagerProtectedRoute>
              <ManagerRestaurantLocationPage />
            </ManagerProtectedRoute>
          }
        />

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
        <Route
          path="/manager/menu/:foodId"
          element={
            <ManagerProtectedRoute>
              <ManagerMenuPage />
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="/manager/tables"
          element={
            <ManagerProtectedRoute>
              <ManagerFloorsPage />
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="/manager/reservations"
          element={
            <ManagerProtectedRoute>
              <ManagerReservationsPage />
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="/manager/operating-hours"
          element={
            <ManagerProtectedRoute>
              <ManagerOperatingHoursPage />
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="/manager/orders"
          element={
            <ManagerProtectedRoute>
              <Navigate to="/manager/reservations" replace />
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="/manager/spot-order"
          element={
            <ManagerProtectedRoute>
              <ManagerSpotOrderPage />
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="/manager/payments"
          element={
            <ManagerProtectedRoute>
              <ManagerPaymentsPage />
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="/manager/revenue"
          element={
            <ManagerProtectedRoute>
              <ManagerRevenuePage />
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="/manager/offers"
          element={
            <ManagerProtectedRoute>
              <ManagerOffersPage />
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="/manager/reviews"
          element={
            <ManagerProtectedRoute>
              <ManagerReviewsPage />
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="/manager/payments/:transactionId"
          element={
            <ManagerProtectedRoute>
              <ManagerPaymentsPage />
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="/manager/orders/:orderId"
          element={
            <ManagerProtectedRoute>
              <ManagerOrderDetailsPage />
            </ManagerProtectedRoute>
          }
        />
        <Route
          path="/manager/floors"
          element={<Navigate to="/manager/tables" replace />}
        />
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
          path="/chef/orders"
          element={
            <ChefProtectedRoute>
              <OrdersPage mode="chef" />
            </ChefProtectedRoute>
          }
        />
        <Route
          path="/chef/menu"
          element={
            <ChefProtectedRoute>
              <ChefMenuPage />
            </ChefProtectedRoute>
          }
        />
        <Route
          path="/chef/menu/:foodId"
          element={
            <ChefProtectedRoute>
              <ChefMenuPage />
            </ChefProtectedRoute>
          }
        />
        <Route
          path="/chef/revenue"
          element={
            <ChefProtectedRoute>
              <ChefRevenuePage />
            </ChefProtectedRoute>
          }
        />
        <Route
          path="/chef/service-hours"
          element={
            <ChefProtectedRoute>
              <ChefServiceHoursPage />
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
