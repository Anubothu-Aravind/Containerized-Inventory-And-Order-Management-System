import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Drawer({ open, title, description, children, footer, onClose, wide = false }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    if (!open) {
      return undefined;
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="drawer-shell" role="presentation" onMouseDown={onClose}>
      <aside className={["drawer", wide ? "drawer--wide" : ""].filter(Boolean).join(" ")} role="dialog" aria-modal="true" aria-labelledby="drawer-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h2 id="drawer-title">{title}</h2>
            {description ? <p className="dialog-description">{description}</p> : null}
          </div>
          <button className="ui-button ui-button--ghost ui-button--sm" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer ? <div className="drawer-footer">{footer}</div> : null}
      </aside>
    </div>,
    document.body,
  );
}