import { Navigate, Route, Routes } from "react-router-dom";
import { NotFoundPage } from "./components/AppExperience.jsx";
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
import CustomerSettingsPage from "./pages/customer/CustomerSettingsPage.jsx";
import { useAccountPreferences } from "./components/preferences/AccountPreferences.jsx";
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
import ManagerSettingsPage from "./pages/manager/ManagerSettingsPage.jsx";
import ManagerProfilePage from "./pages/manager/ManagerProfilePage.jsx";
import ManagerRestaurantLocationPage from "./pages/manager/ManagerRestaurantLocationPage.jsx";
import ManagerProtectedRoute from "./components/auth/ManagerProtectedRoute.jsx";
import ManagerPendingPage from "./pages/manager/ManagerPendingPage.jsx";
import ManagerStaffPage from "./pages/manager/ManagerStaffPage.jsx";
import ManagerMenuPage from "./pages/manager/ManagerMenuPage.jsx";
import ManagerFloorsPage from "./pages/manager/ManagerFloorsPage.jsx";
import ManagerReservationsPage from "./pages/manager/ManagerReservationsPage.jsx";
import ChefLoginPage from "./pages/chef/ChefLoginPage.jsx";
import ChefDashboardPage from "./pages/chef/ChefDashboardPage.jsx";
import ChefSettingsPage from "./pages/chef/ChefSettingsPage.jsx";
import ChefProfilePage from "./pages/chef/ChefProfilePage.jsx";
import ChefMenuPage from "./pages/chef/ChefMenuPage.jsx";
import ChefChangePasswordPage from "./pages/chef/ChefChangePasswordPage.jsx";
import ChefProtectedRoute from "./components/auth/ChefProtectedRoute.jsx";
import PortalGuestOnlyRoute from "./components/auth/PortalGuestOnlyRoute.jsx";
import OrdersPage from "./pages/shared/OrdersPage.jsx";
import ManagerOrderDetailsPage from "./pages/manager/ManagerOrderDetailsPage.jsx";
import ManagerSpotOrderPage from "./pages/manager/ManagerSpotOrderPage.jsx";
import ManagerOperatingHoursPage from "./pages/manager/ManagerOperatingHoursPage.jsx";
import ManagerOffersPage from "./pages/manager/ManagerOffersPage.jsx";
import ChefServiceHoursPage from "./pages/chef/ChefServiceHoursPage.jsx";
import ManagerPaymentsPage from "./pages/manager/ManagerPaymentsPage.jsx";
import ManagerReviewsPage from "./pages/manager/ManagerReviewsPage.jsx";
import AdminReviewModerationPage from "./pages/admin/AdminReviewModerationPage.jsx";
import {AdminRevenuePage, ChefRevenuePage, ManagerRevenuePage} from "./pages/shared/RevenueWalletPage.jsx";
import AdminProfilePage from "./pages/admin/AdminProfilePage.jsx"
import AdminSettingsPage from "./pages/admin/AdminSettingsPage.jsx";


export default function App() {
  useAccountPreferences();
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/customer" replace />} />
        <Route path="/customer" element={<CustomerLandingPage />} />
        <Route path="/customer/settings" element={<ProtectedRoute><CustomerSettingsPage /></ProtectedRoute>} />
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
        <Route 
          path="/admin/profile"
          element={
            <AdminProtectedRoute>
              <AdminProfilePage />
            </AdminProtectedRoute>
          } 
        />
        <Route
          path="/admin/settings"
          element={<AdminProtectedRoute><AdminSettingsPage /></AdminProtectedRoute>}
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
        <Route path="/manager/pending" element={<ManagerPendingPage />} />
        <Route element={<ManagerProtectedRoute />}>
          <Route path="/manager/dashboard" element={<ManagerDashboardPage />} />
          <Route path="/manager/settings" element={<ManagerSettingsPage />} />
          <Route path="/manager/profile" element={<ManagerProfilePage />} />
          <Route
            path="/manager/restaurant-location"
            element={<ManagerRestaurantLocationPage />}
          />
          <Route path="/manager/staff" element={<ManagerStaffPage />} />
          <Route path="/manager/menu" element={<ManagerMenuPage />} />
          <Route path="/manager/menu/:foodId" element={<ManagerMenuPage />} />
          <Route path="/manager/tables" element={<ManagerFloorsPage />} />
          <Route
            path="/manager/reservations"
            element={<ManagerReservationsPage />}
          />
          <Route
            path="/manager/operating-hours"
            element={<ManagerOperatingHoursPage />}
          />
          <Route
            path="/manager/orders"
            element={<Navigate to="/manager/reservations" replace />}
          />
          <Route path="/manager/spot-order" element={<ManagerSpotOrderPage />} />
          <Route path="/manager/payments" element={<ManagerPaymentsPage />} />
          <Route path="/manager/revenue" element={<ManagerRevenuePage />} />
          <Route path="/manager/offers" element={<ManagerOffersPage />} />
          <Route path="/manager/reviews" element={<ManagerReviewsPage />} />
          <Route
            path="/manager/payments/:transactionId"
            element={<ManagerPaymentsPage />}
          />
          <Route
            path="/manager/orders/:orderId"
            element={<ManagerOrderDetailsPage />}
          />
        </Route>
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
        <Route element={<ChefProtectedRoute />}>
          <Route path="/chef/dashboard" element={<ChefDashboardPage />} />
          <Route path="/chef/settings" element={<ChefSettingsPage />} />
          <Route path="/chef/profile" element={<ChefProfilePage />} />
          <Route path="/chef/orders" element={<OrdersPage mode="chef" />} />
          <Route path="/chef/menu" element={<ChefMenuPage />} />
          <Route path="/chef/menu/:foodId" element={<ChefMenuPage />} />
          <Route path="/chef/revenue" element={<ChefRevenuePage />} />
          <Route path="/chef/service-hours" element={<ChefServiceHoursPage />} />
          <Route
            path="/chef/change-password"
            element={<ChefChangePasswordPage />}
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
