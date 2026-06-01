import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Dialog({ open, title, description, children, footer, onClose, wide = false }) {
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
    <div className="overlay" role="presentation" onMouseDown={onClose}>
      <div className={["dialog", wide ? "dialog--wide" : ""].filter(Boolean).join(" ")} role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-header">
          <div>
            <h2 id="dialog-title">{title}</h2>
            {description ? <p className="dialog-description">{description}</p> : null}
          </div>
          <button className="ui-button ui-button--ghost ui-button--sm" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer ? <div className="dialog-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}