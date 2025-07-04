'use client'

import { usePathname } from 'next/navigation'
import Navigation from './Navigation'

export default function LayoutWithNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNav = pathname === '/login' || pathname === '/'
  return (
    <>
      {!hideNav && <Navigation />}
      <main className="min-h-screen">{children}</main>
    </>
  )
} 