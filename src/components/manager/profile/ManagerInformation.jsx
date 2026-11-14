import AccountInformation from "../../profile/AccountInformation.jsx";

export default function ManagerInformation({ manager, ...props }) {
  return <AccountInformation account={manager} role="manager" {...props} />;
}
