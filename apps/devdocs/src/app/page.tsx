import Link from "next/link"

export default function HomePage() {
  return (
    <main className="flex h-screen flex-col items-center justify-center">
      <h1 className="mb-4 text-2xl font-bold">Omni Development Docs</h1>
      <div className="flex gap-4">
        <Link href="/docs" className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
          View Documentation
        </Link>
      </div>
    </main>
  )
}
