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
import GlobalSpinner from "./components/GlobalSpinner"

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
        <GlobalSpinner />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}

function ErrorLayout({ error }: { error: Error }) {
  console.error(error)
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

type HTTPError = Pick<Response, 'status' | 'statusText'> & { data: string | { message: string } }

function HttpErrorLayout({ error }: { error: HTTPError }) {
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

function isDockerError(error: any): error is { exitCode: number, err: string; out: string } {
  return typeof error === 'object' && error !== null && 'exitCode' in error && 'err' in error && 'out' in error
}

// TODO: maybe this should be configurable ??
const DOCKER_SOCK = '/var/run/docker.sock'

function isNoDockerSockError(error: any): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT' && error.syscall === 'connect' && error.address === DOCKER_SOCK
}

export function ErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return <HttpErrorLayout error={error as HTTPError} />
  } else if (isDockerError(error)) {
    return <HttpErrorLayout error={{ status: 500, statusText: 'Docker Error', data: error.err }} />
  } else if (isNoDockerSockError(error)) {
    return <HttpErrorLayout error={{ status: 500, statusText: 'Docker Error', data: `Cannot connect to the Docker daemon at ${DOCKER_SOCK}. Is the docker daemon running?` }} />
  } else if (error instanceof Error) {
    return <ErrorLayout error={error} /> 
  } else {
    return (
      <html>
        <head>
          <title>Oh no!</title>
          <Meta />
          <Links />
        </head>
        <body className="p-3 max-w-prose mx-auto py-8">
          <div>
            <h1 className="text-2xl mb-2 text-red-500">Unknown Error</h1>
            <pre className="p-2 rounded-md border border-red-500">{JSON.stringify(error)}</pre>
          </div>
        </body>
      </html>
    )
  }
}
