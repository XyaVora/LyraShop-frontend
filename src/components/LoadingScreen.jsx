// src/components/LoadingScreen.jsx
export function LoadingScreen() {
  return (
    <div className="loader-screen">
      <div className="loader-logo">LYRA</div>
      <div className="loader-bar" />
      <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 12 }}>
        Loading...
      </div>
    </div>
  );
}
