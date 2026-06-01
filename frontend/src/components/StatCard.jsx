export default function StatCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <h2 className="stat-value">{value}</h2>
      <p className="stat-hint">{hint}</p>
    </div>
  );
}
