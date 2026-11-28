import AdminLayout from "../../components/admin/AdminLayout.jsx";
import AdminRestaurantPaymentsPanel from "./AdminRestaurantPaymentsPanel.jsx";

export default function AdminTransactionsPage() {
  return (
    <AdminLayout title="Transactions">
      <AdminRestaurantPaymentsPanel />
    </AdminLayout>
  );
}
