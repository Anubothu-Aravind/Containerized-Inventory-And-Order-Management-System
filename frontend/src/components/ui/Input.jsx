export default function Input({ label, hint, error, className = "", ...props }) {
  return (
    <label className={["field", className].filter(Boolean).join(" ")}>
      {label ? <span className="field-label">{label}</span> : null}
      <input className="ui-input" {...props} />
      {hint ? <span className="field-hint">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}