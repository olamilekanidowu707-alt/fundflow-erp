import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FundFlow ERP',
  description: 'Internal fund request and approval management system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
