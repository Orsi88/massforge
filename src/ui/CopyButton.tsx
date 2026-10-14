import { useState } from 'react'

export function CopyButton({
  label = 'Copiar',
  onCopy,
}: {
  label?: string
  onCopy: () => void | Promise<void>
}) {
  const [done, setDone] = useState(false)

  return (
    <button
      type="button"
      className="copy"
      title={done ? 'Copiado' : label}
      aria-label={done ? 'Copiado' : label}
      onClick={async () => {
        await onCopy()
        setDone(true)
        window.setTimeout(() => setDone(false), 1200)
      }}
    >
      {done ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="12" height="12" rx="2.5" />
          <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
        </svg>
      )}
    </button>
  )
}
