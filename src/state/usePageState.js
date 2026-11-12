import { useId, useLayoutEffect, useMemo, useRef } from "react";
import { useSelector, useStore } from "react-redux";
import { closePage, openPage, updatePageField } from "./pages.js";

export function usePageState(page, initialize) {
  const id = useId();
  const scope = `${page}/${id}`;
  const store = useStore();
  const initial = useRef(null);
  if (initial.current === null) initial.current = initialize();

  const values = useSelector((state) => state.pages[scope] ?? initial.current);

  useLayoutEffect(() => {
    store.dispatch(openPage({ scope, values: initial.current }));
    return () => {
      store.dispatch(closePage(scope));
    };
  }, [scope, store]);

  const setters = useMemo(() => {
    function setField(field, next) {
      // A request or timer may finish after its page has been removed.
      const current = store.getState().pages[scope];
      if (!current) return;

      const value = typeof next === "function" ? next(current[field]) : next;
      if (!Object.is(current[field], value)) {
        store.dispatch(updatePageField({ scope, field, value }));
      }
    }

    return Object.fromEntries(
      Object.keys(initial.current).map((field) => [
        field,
        (next) => setField(field, next),
      ]),
    );
  }, [scope, store]);

  return [values, setters];
}
