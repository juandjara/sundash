import type { LoaderArgs } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import clsx from "clsx"
import Logo from "~/components/Logo"
import Layout from "~/components/layout"
import { ComposeJSONExtra, getApp, getStateTitle } from "~/lib/apps"
import { getLogs } from "~/lib/projects.server"
import { buttonCN } from "~/lib/styles"

export async function loader({ params }: LoaderArgs) {
  const filename = params.app!
  try {
    const app = await getApp(filename)
    const logs = await getLogs(app.key, app.filename)
    return { app, logs }
  } catch (err) {
    throw new Response(null, { status: 500, statusText: String((err as Error).message) })
  }
}

export default function AppDetail() {
  const { app, logs } = useLoaderData() as { app: ComposeJSONExtra; logs: any }
  if (!app) {
    return null
  }
  return (
    <Layout>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Logo
          src={app.logo}
          className="w-12 h-12 rounded-full bg-gray-100"
        />
        <p className="text-2xl font-semibold flex-grow">{app.title}</p>
        <div className="flex-grow"></div>
        <div className="flex flex-wrap justify-end gap-2">
          <button className={clsx(buttonCN.small, buttonCN.outline)}>Start</button>
          <button className={clsx(buttonCN.small, buttonCN.outline)}>Stop</button>
          <button className={clsx(buttonCN.small, buttonCN.outline)}>Restart</button>
          <button className={clsx(buttonCN.small, buttonCN.outline)}>Kill</button>
          <button className={clsx(buttonCN.small, buttonCN.outline)}>Up</button>
          <button className={clsx(buttonCN.small, buttonCN.outline)}>Down</button>
          <button className={clsx(buttonCN.small, buttonCN.outline)}>Pull</button>
        </div>
      </div>
      <div className="mb-4">
        <p>
          <small className="text-gray-500">State: </small>
          {' '}{getStateTitle(app)}
        </p>
        <p>
          <small className="text-gray-500">Status: </small>
          {' '}{app.runtime?.status}
        </p>
        <p>
          <small className="text-gray-500">Created at: </small>
          {' '}{app.runtime?.created}
        </p>
        <div className="mt-4">
          <p className="text-sm mb-2 text-zinc-500">Logs</p>
          <pre className="p-3 bg-zinc-100 rounded-md">{logs}</pre>
        </div>
      </div>
    </Layout>
  )
}
