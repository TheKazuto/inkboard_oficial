'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import BottomBar from './BottomBar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLanding = pathname === '/'

  return (
    <>
      {!isLanding && <Navbar />}
      <main className={isLanding ? '' : 'page-content pt-16'}>
        {children}
      </main>
      {!isLanding && <BottomBar />}
    </>
  )
}
