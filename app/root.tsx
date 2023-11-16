import type { LinksFunction, V2_MetaFunction } from "@remix-run/node"
import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react"

import stylesheet from "~/tailwind.css"

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
]

export const meta: V2_MetaFunction = () => [{ title: "SunDASH" }]

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-zinc-100">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}

function ErrorLayout({ error }: { error: Error }) {
  return (
    <html>
      <head>
        <title>Oh no!</title>
        <Meta />
        <Links />
      </head>
      <body>
        <div className="max-w-2xl bg-red-50 text-red-800 rounded-xl my-8 mx-auto p-4">
          <h1 className="text-2xl font-bold text-red-600">Oops :c</h1>
          <h2 className="mt-1 text-xl font-bold text-red-600">There was an unexpected error</h2>
          <p className="my-2 text-lg">{error.message}</p>
          <pre className="overflow-auto max-w-full max-h-[400px]">{error.stack}</pre>
        </div>
      </body>
    </html>
  )
}
function HttpErrorLayout({ error }: { error: Error }) {
  if(!isRouteErrorResponse(error)) {
    return null
  }
  const { status, statusText, data } = error
  const title = `${status} ${statusText}`
  const message = typeof data === 'string' ? data : data?.message

  return (
    <html>
      <head>
        <title>Oh no!</title>
        <Meta />
        <Links />
      </head>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center text-slate-700 text-center">
          <p className="text-pink-500 text-7xl text-center">S</p>
          <div className="my-6">
            <p className="text-xl font-semibold">{title}</p>
            <p className="text-base">{message}</p>
          </div>
          <Link to="/" className="bg-pink-600 hover:bg-pink-500 text-white rounded-lg px-4 py-2">Take me home</Link>
        </div>
      </body>
    </html>
  )
}

export function ErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return <HttpErrorLayout error={error as any} />
  } else if (error instanceof Error) {
    return <ErrorLayout error={error} />
  } else {
    return (
      <div>
        <h1>Unknown Error</h1>
        <pre>{String(error)}</pre>
      </div>
    )
  }
}
