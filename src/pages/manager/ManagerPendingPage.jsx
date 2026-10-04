import { Clock3, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import ManagerAuthLayout from "../../components/auth/ManagerAuthLayout.jsx";

export default function ManagerPendingPage() {
  return (
    <ManagerAuthLayout>
      <div className="flex min-h-[620px] items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-wine/10 text-wine">
            <Clock3 size={38} strokeWidth={1.8} />
          </div>

          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-wine">
            Application Submitted
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Waiting for Admin Approval
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-gray-600 sm:text-base">
            Your manager registration and restaurant application have been
            successfully submitted. Our admin team will review your details and
            documents before approving your account.
          </p>

          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-wine/10 text-wine">
                <ShieldCheck size={20} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-ink">
                  What happens next?
                </h2>

                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Once your application is reviewed and approved, you can use
                  your manager credentials to sign in and access your dashboard.
                </p>
              </div>
            </div>
          </div>

          <Link
            to="/manager/login"
            className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-lg bg-wine px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-wine/20 sm:w-auto sm:min-w-[220px]"
          >
            Go to Manager Login
          </Link>

          <p className="mt-5 text-xs text-gray-500">
            Your account will remain inactive until an administrator approves
            your application.
          </p>
        </div>
      </div>
    </ManagerAuthLayout>
  );
}
