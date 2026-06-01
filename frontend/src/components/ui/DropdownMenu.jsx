import { useEffect, useRef, useState } from "react";

export default function DropdownMenu({ trigger, items = [], align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="dropdown" ref={ref}>
      <button className="ui-button ui-button--secondary ui-button--sm" type="button" onClick={() => setOpen((value) => !value)}>
        {trigger}
      </button>
      {open ? (
        <div className={["dropdown-menu", `dropdown-menu--${align}`].join(" ")}>
          {items.map((item) => (
            <button
              key={item.label}
              className={["dropdown-item", item.tone === "danger" ? "dropdown-item--danger" : ""].filter(Boolean).join(" ")}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onSelect?.();
              }}
            >
              <span>{item.label}</span>
              {item.description ? <small>{item.description}</small> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}