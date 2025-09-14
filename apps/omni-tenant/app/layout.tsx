import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Omni Client",
  description: "Client application for Omni",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
