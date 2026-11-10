import { useEffect, useRef, useState } from "react";

// Fade page content into view as it enters the viewport.
// Wraps a block and fades it in (slides up a little) the first time it scrolls into view.
// Use the `delay` prop (milliseconds) to make a row of cards appear one after another.
export default function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    // Very old browsers do not have IntersectionObserver, so just show the content.
    if (!element || !("IntersectionObserver" in window)) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect(); // only animate once
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`rw-reveal ${visible ? "is-visible" : ""} ${className}`} style={{ "--rw-delay": `${delay}ms` }}>
      {children}
    </div>
  );
}
