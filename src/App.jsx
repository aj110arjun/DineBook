import CustomerShell from "./components/ui/CustomerShell.jsx";
import PortalShell from "./components/ui/PortalShell.jsx";
import { ManagerFrame } from "./components/manager/ManagerLayout.jsx";
import { ChefFrame } from "./components/chef/ChefLayout.jsx";
import { AdminFrame } from "./components/admin/AdminLayout.jsx";
import { Navigate, Route, Routes } from "react-router-dom";
import { NotFoundPage } from "./components/AppExperience.jsx";
import CustomerChangePasswordPage from "./features/customer/CustomerChangePasswordPage.jsx";
import CustomerLoginPage from "./features/customer/CustomerLoginPage.jsx";
import CustomerRecoveryPage from "./features/customer/CustomerRecoveryPage.jsx";
import CustomerRegisterPage from "./features/customer/CustomerRegisterPage.jsx";
import CustomerLandingPage from "./features/customer/CustomerLandingPage.jsx";
import CustomerEmailVerificationPage from "./features/customer/CustomerEmailVerificationPage.jsx";
import CustomerRestaurantDetailsPage from "./features/customer/CustomerRestaurantDetailsPage.jsx";
import CustomerReservationPage from "./features/customer/CustomerReservationPage.jsx";
import CustomerRestaurantListingPage from "./features/customer/CustomerRestaurantListingPage.jsx";
import CustomerProfilePage from "./features/customer/CustomerProfilePage.jsx";
import CustomerSettingsPage from "./features/customer/CustomerSettingsPage.jsx";
import { useAccountPreferences } from "./components/preferences/AccountPreferences.jsx";
import CustomerSavedRestaurantsPage from "./features/customer/CustomerSavedRestaurantsPage.jsx";
import CustomerWalletPage from "./features/customer/CustomerWalletPage.jsx";
import CustomerReservationsPage from "./features/customer/CustomerReservationsPage.jsx";
import CustomerReservationDetailsPage from "./features/customer/CustomerReservationDetailsPage.jsx";
import CustomerTransactionsPage from "./features/customer/CustomerTransactionsPage.jsx";
import CustomerTransactionDetailsPage from "./features/customer/CustomerTransactionDetailsPage.jsx";
import GuestOnlyRoute from "./components/auth/GuestOnlyRoute.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import AdminProtectedRoute from "./components/auth/AdminProtectedRoute.jsx";
import AdminTransactionDetailsPage from "./features/admin/AdminTransactionDetailsPage.jsx";
import AdminTransactionsPage from "./features/admin/AdminTransactionsPage.jsx";
import AdminLoginPage from "./features/admin/AdminLoginPage.jsx";
import AdminDashboardPage from "./features/admin/AdminDashboardPage.jsx";
import AdminRestaurantsPage from "./features/admin/AdminRestaurantsPage.jsx";
import AdminRestaurantDetailsPage from "./features/admin/AdminRestaurantDetailsPage.jsx";
import AdminRequestsPage from "./features/admin/AdminRequestsPage.jsx";
import AdminManagerRequestDetailsPage from "./features/admin/AdminManagerRequestDetailsPage.jsx";
import AdminOffersPage from "./features/admin/AdminOffersPage.jsx";
import ManagerRegisterPage from "./features/manager/ManagerRegisterPage.jsx";
import ManagerLoginPage from "./features/manager/ManagerLoginPage.jsx";
import ManagerDashboardPage from "./features/manager/ManagerDashboardPage.jsx";
import ManagerSettingsPage from "./features/manager/ManagerSettingsPage.jsx";
import ManagerProfilePage from "./features/manager/ManagerProfilePage.jsx";
import ManagerRestaurantLocationPage from "./features/manager/ManagerRestaurantLocationPage.jsx";
import ManagerProtectedRoute from "./components/auth/ManagerProtectedRoute.jsx";
import ManagerPendingPage from "./features/manager/ManagerPendingPage.jsx";
import ManagerStaffPage from "./features/manager/ManagerStaffPage.jsx";
import ManagerMenuPage from "./features/manager/ManagerMenuPage.jsx";
import ManagerFloorsPage from "./features/manager/ManagerFloorsPage.jsx";
import ManagerReservationsPage from "./features/manager/ManagerReservationsPage.jsx";
import ChefLoginPage from "./features/chef/ChefLoginPage.jsx";
import ChefDashboardPage from "./features/chef/ChefDashboardPage.jsx";
import ChefSettingsPage from "./features/chef/ChefSettingsPage.jsx";
import ChefProfilePage from "./features/chef/ChefProfilePage.jsx";
import ChefMenuPage from "./features/chef/ChefMenuPage.jsx";
import ChefChangePasswordPage from "./features/chef/ChefChangePasswordPage.jsx";
import ChefProtectedRoute from "./components/auth/ChefProtectedRoute.jsx";
import PortalGuestOnlyRoute from "./components/auth/PortalGuestOnlyRoute.jsx";
import OrdersPage from "./features/shared/OrdersPage.jsx";
import ManagerOrderDetailsPage from "./features/manager/ManagerOrderDetailsPage.jsx";
import ManagerSpotOrderPage from "./features/manager/ManagerSpotOrderPage.jsx";
import ManagerOperatingHoursPage from "./features/manager/ManagerOperatingHoursPage.jsx";
import ManagerOffersPage from "./features/manager/ManagerOffersPage.jsx";
import ChefServiceHoursPage from "./features/chef/ChefServiceHoursPage.jsx";
import ManagerPaymentsPage from "./features/manager/ManagerPaymentsPage.jsx";
import ManagerReviewsPage from "./features/manager/ManagerReviewsPage.jsx";
import AdminReviewModerationPage from "./features/admin/AdminReviewModerationPage.jsx";
import {AdminRevenuePage, ChefRevenuePage, ManagerRevenuePage} from "./features/shared/RevenueWalletPage.jsx";
import AdminProfilePage from "./features/admin/AdminProfilePage.jsx"
import AdminSettingsPage from "./features/admin/AdminSettingsPage.jsx";


export default function App() {
  useAccountPreferences();
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/customer" replace />} />
        <Route element={<CustomerShell />}>
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
        </Route>
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
        <Route element={<AdminProtectedRoute />}><Route element={<PortalShell Frame={AdminFrame} />}>
        <Route
          path="/admin/dashboard"
          element={
            <AdminDashboardPage />
          }
        />
        <Route
          path="/admin/restaurants"
          element={
            <AdminRestaurantsPage />
          }
        />
        <Route
          path="/admin/restaurants/:restaurantId"
          element={
            <AdminRestaurantDetailsPage />
          }
        />
        <Route
          path="/admin/orders"
          element={
            <Navigate to="/admin/dashboard" replace />
          }
        />
        <Route
          path="/admin/offers"
          element={
            <AdminOffersPage />
          }
        />
        <Route
          path="/admin/transactions/:restaurantId/:transactionId"
          element={<AdminTransactionDetailsPage />}
        />
        <Route
          path="/admin/transactions"
          element={<AdminTransactionsPage />}
        />
        <Route
          path="/admin/revenue"
          element={
            <AdminRevenuePage />
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <AdminReviewModerationPage />
          }
        />
        <Route
          path="/admin/requests"
          element={
            <AdminRequestsPage />
          }
        />
        <Route
          path="/admin/requests/:requestId"
          element={
            <AdminManagerRequestDetailsPage />
          }
        />
        <Route
          path="/admin/profile"
          element={
            <AdminProfilePage />
          }
        />
        <Route
          path="/admin/settings"
          element={<AdminSettingsPage />}
        />
        </Route></Route>
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
        <Route element={<ManagerProtectedRoute />}><Route element={<PortalShell Frame={ManagerFrame} />}>
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
        <Route element={<ChefProtectedRoute />}><Route element={<PortalShell Frame={ChefFrame} />}>
          <Route path="/chef/dashboard" element={<ChefDashboardPage />} />
          <Route path="/chef/settings" element={<ChefSettingsPage />} />
          <Route path="/chef/profile" element={<ChefProfilePage />} />
          <Route path="/chef/orders" element={<OrdersPage mode="chef" />} />
          <Route path="/chef/menu" element={<ChefMenuPage />} />
          <Route path="/chef/menu/:foodId" element={<ChefMenuPage />} />
          <Route path="/chef/revenue" element={<ChefRevenuePage />} />
          <Route path="/chef/service-hours" element={<ChefServiceHoursPage />} />
          </Route>
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
