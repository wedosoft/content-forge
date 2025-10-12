import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BlockNote Chat Rewriter',
  description: 'AI-powered text rewriting with BlockNote editor',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}