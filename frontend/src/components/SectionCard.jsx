export default function SectionCard({ title, children, actionLabel, onAction }) {
  return (
    <section className="section-card">
      <div className="section-header">
        <h3>{title}</h3>
        {actionLabel ? (
          <button className="ghost small" type="button" onClick={onAction}>{actionLabel}</button>
        ) : null}
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}
