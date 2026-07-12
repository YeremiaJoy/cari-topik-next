'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

interface Props {
  href: string
  /** true = aktif hanya saat path persis sama (bukan prefix). */
  end?: boolean
  className: string | ((state: { isActive: boolean }) => string)
  children: ReactNode
  'aria-label'?: string
}

/** Pengganti NavLink react-router: isActive dari usePathname. */
export default function NavLink({ href, end, className, children, ...rest }: Props) {
  const pathname = usePathname()
  const isActive = end ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  const resolved = typeof className === 'function' ? className({ isActive }) : className
  return (
    <Link href={href} className={resolved} {...rest}>
      {children}
    </Link>
  )
}
