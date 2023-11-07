import { Link } from "@remix-run/react"
import clsx from "clsx"
import { buttonCN } from "~/lib/styles"

export default function Layout({ children }: { children: React.ReactNode}) {
  return (
    <main className="p-3 container mx-auto h-full m-3 rounded-md bg-white">
      <header className="flex items-center gap-2 mb-8 flex-wrap">
        <h1 className="text-4xl font-bold text-pink-600 flex-grow">SunDASH</h1>
        <nav className="flex items-center gap-2">
          <Link to="/apps" className={clsx(buttonCN.outline, buttonCN.normal)}>Apps</Link>
          <Link to="/appstore" className={clsx(buttonCN.outline, buttonCN.normal)}>App Store</Link>
          <Link to="/config" className={clsx(buttonCN.outline, buttonCN.normal)}>Config</Link>
        </nav>
      </header>
      {children}
    </main>
  )
}
