import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import CustomerAiWidget from "./CustomerAiWidget.jsx";

const AUTH_PAGES = new Set(["login", "register", "recovery", "verify-email", "change-password"]);

export default function CustomerAiSupport() {
  const { pathname } = useLocation();
  const user = useSelector((state) => state.customerSession.user);
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "customer" || AUTH_PAGES.has(segments[1])) return null;
  if (user?.role && user.role !== "CUSTOMER") return null;
  return <CustomerAiWidget key={user?.id || "guest"} user={user} />;
}
