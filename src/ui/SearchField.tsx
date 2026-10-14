import type { InputHTMLAttributes, ReactNode } from 'react'

type SearchFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  children?: ReactNode
}

export function SearchField({ children, ...props }: SearchFieldProps) {
  return (
    <div className="search">
      <div className="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#676B66" strokeWidth="1.8" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input {...props} />
      </div>
      {children}
    </div>
  )
}
