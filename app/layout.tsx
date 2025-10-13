import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Content Forge',
  description: 'AI 기반 콘텐츠 제작 도구',
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