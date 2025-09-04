import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Omni Admin",
  description: "Admin panel for Omni application"
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}