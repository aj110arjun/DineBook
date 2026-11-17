import { useEffect, useRef } from "react";

// An empty successful response is loaded content too. A ref avoids an extra render.
export default function useLoadingPhase(loading, hasData, error) {
  const settled = useRef(false);
  const previous = useRef(loading);
  useEffect(() => {
    if (error && !hasData) settled.current = false;
    else if (hasData || (previous.current && !loading)) settled.current = true;
    previous.current = loading;
  }, [loading, hasData, error]);
  const initialLoading = loading && !hasData && !settled.current;
  return { initialLoading, refreshing: loading && !initialLoading };
}
