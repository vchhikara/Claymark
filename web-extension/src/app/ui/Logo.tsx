export function Logo({ size = 64 }: { size?: number }) {
  const id = `cm-logo-g-${size}`
  return (
    <svg className="cm-logo" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Claymark">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e3906f" />
          <stop offset="1" stopColor="#c8542d" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${id})`} />
      <path d="M43.5 23.2 A13.5 13.5 0 1 0 43.5 40.8" fill="none" stroke="#fff" strokeWidth="7.5" />
    </svg>
  )
}
