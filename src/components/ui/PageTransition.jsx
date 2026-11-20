import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function PageTransition({
  as: Element = "div",
  className = "",
  children,
  ...props
}) {
  const { pathname } = useLocation();
  const element = useRef(null);
  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !element.current?.animate
    )
      return;
    const animation = element.current.animate(
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 220, easing: "ease-out" },
    );
    return () => animation.cancel();
  }, [pathname]);
  return (
    <Element
      {...props}
      ref={element}
      className={`db-page-transition ${className}`}
    >
      {children}
    </Element>
  );
}
