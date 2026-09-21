/** Marca de la app: la mancuerna azul sobre fondo elevado. */
export function AppMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="grid place-items-center surface-hero shrink-0"
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
      aria-hidden="true"
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 64 64">
        <g fill="#4C8DFF">
          <rect x="23" y="29.8" width="18" height="4.4" rx="2.2" />
          <rect x="18.6" y="22.4" width="6" height="19.2" rx="2.3" />
          <rect x="39.4" y="22.4" width="6" height="19.2" rx="2.3" />
          <rect x="13.9" y="26.1" width="4.6" height="11.8" rx="1.9" />
          <rect x="45.5" y="26.1" width="4.6" height="11.8" rx="1.9" />
        </g>
      </svg>
    </span>
  )
}
