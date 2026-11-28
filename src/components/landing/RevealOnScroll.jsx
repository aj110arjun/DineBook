import { useEffect, useRef, useState } from "react";

export default function RevealOnScroll({
  as: Element = "div",
  children,
  className = "",
  delay = 0,
  ...props
}) {
  const element = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof IntersectionObserver === "undefined"
    ) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" },
    );
    if (element.current) observer.observe(element.current);
    return () => observer.disconnect();
  }, []);

  return (
    <Element
      {...props}
      ref={element}
      className={`landing-reveal${visible ? " is-visible" : ""} ${className}`}
      style={{ ...props.style, "--landing-reveal-delay": `${delay}ms` }}
    >
      {children}
    </Element>
  );
}
