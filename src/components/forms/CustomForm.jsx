import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getFormErrors } from "../../lib/formValidation.js";
import "./CustomForm.css";

function FieldError({ field, message }) {
  const id = useId();
  const [anchor, setAnchor] = useState(null);

  useLayoutEffect(() => {
    const node = document.createElement("span");
    node.className = "custom-field-error-anchor";
    const container = field.closest("[data-validation-container]");
    const label = field.closest("label");
    if (container || label) (container || label).appendChild(node);
    else field.insertAdjacentElement("afterend", node);
    const previousInvalid = field.getAttribute("aria-invalid");
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", [field.getAttribute("aria-describedby"), id].filter(Boolean).join(" "));
    field.classList.add("custom-field-invalid");
    setAnchor(node);
    return () => {
      node.remove();
      field.classList.remove("custom-field-invalid");
      if (previousInvalid === null) field.removeAttribute("aria-invalid");
      else field.setAttribute("aria-invalid", previousInvalid);
      const remaining = (field.getAttribute("aria-describedby") || "").split(/\s+/).filter((token) => token && token !== id).join(" ");
      if (remaining) field.setAttribute("aria-describedby", remaining);
      else field.removeAttribute("aria-describedby");
    };
  }, [field, id]);

  return anchor ? createPortal(<span id={id} className="custom-field-error" role="alert">{message}</span>, anchor) : null;
}

export default function CustomForm({ children, onSubmit, onChange, onBlur, onReset, noValidate: _noValidate, ...props }) {
  const [errors, setErrors] = useState([]);
  const submitted = useRef(false);
  const touched = useRef(new Set());
  const fieldKeys = useRef(new WeakMap());
  const nextKey = useRef(0);

  function refresh(form) {
    setErrors(getFormErrors(form).filter(({ field }) => submitted.current || touched.current.has(field)));
  }

  function submit(event) {
    submitted.current = true;
    const next = event.nativeEvent.submitter?.formNoValidate ? [] : getFormErrors(event.currentTarget);
    setErrors(next);
    if (next.length) {
      event.preventDefault();
      next[0].field.focus();
      return;
    }
    onSubmit?.(event);
  }

  return (
    <form {...props} noValidate onSubmit={submit}
      onBlur={(event) => {
        if (event.target.willValidate) {
          touched.current.add(event.target);
          refresh(event.currentTarget);
        }
        onBlur?.(event);
      }}
      onChange={(event) => {
        refresh(event.currentTarget);
        onChange?.(event);
      }}
      onReset={(event) => {
        submitted.current = false;
        touched.current.clear();
        setErrors([]);
        onReset?.(event);
      }}
    >
      {children}
      {errors.map(({ field, message }) => {
        if (!fieldKeys.current.has(field)) fieldKeys.current.set(field, nextKey.current++);
        return <FieldError key={fieldKeys.current.get(field)} field={field} message={message} />;
      })}
    </form>
  );
}
