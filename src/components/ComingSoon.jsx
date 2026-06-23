// Temporary placeholder — replace with real screen when ready
export default function ComingSoon({ name }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "60vh", color: "#6b7280", gap: 8,
    }}>
      <h2 style={{ margin: 0, color: "#1f2937" }}>{name}</h2>
      <p style={{ margin: 0 }}>Screen coming soon…</p>
    </div>
  );
}