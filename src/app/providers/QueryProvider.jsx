import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const Devtools = import.meta.env.DEV
  ? lazy(() => import("@tanstack/react-query-devtools").then((module) => ({ default: module.ReactQueryDevtools })))
  : null;

function shouldRetry(failureCount, error) {
  if (error?.status >= 400 && error?.status < 500) return false;
  return failureCount < 2;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: { retry: false },
    },
  });
}

// Deliberately shared: authentication helpers clear this client after logout so
// a later account cannot render data cached for the previous cookie session.
export const queryClient = createQueryClient();

export default function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {Devtools ? <Suspense fallback={null}><Devtools initialIsOpen={false} /></Suspense> : null}
    </QueryClientProvider>
  );
}
