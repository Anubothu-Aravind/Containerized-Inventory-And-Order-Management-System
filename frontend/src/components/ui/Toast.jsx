import Badge from "./Badge.jsx";

export default function ToastStack({ toasts = [], onDismiss }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-relevant="additions removals">
      {toasts.map((toast) => (
        <div key={toast.id} className={["toast", `toast--${toast.variant || "neutral"}`].join(" ")}>
          <div>
            <div className="toast-row">
              <strong>{toast.title}</strong>
              {toast.variant ? <Badge tone={toast.variant}>{toast.variant}</Badge> : null}
            </div>
            {toast.description ? <p>{toast.description}</p> : null}
          </div>
          <button className="ui-button ui-button--ghost ui-button--sm" type="button" onClick={() => onDismiss(toast.id)}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}