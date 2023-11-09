import { ArrowLeftIcon } from "@heroicons/react/20/solid"
import { PencilIcon, MinusCircleIcon, PlusCircleIcon, ArrowDownTrayIcon, ArrowPathIcon, ArrowUpTrayIcon, CloudArrowDownIcon, PlayIcon, StopIcon, TrashIcon } from "@heroicons/react/24/outline"
import type { LoaderArgs } from "@remix-run/node"
import { Link, useLoaderData } from "@remix-run/react"
import clsx from "clsx"
import Logo from "~/components/Logo"
import Layout from "~/components/layout"
import type { ComposeJSONExtra} from "~/lib/apps"
import { getApp, getStateTitle } from "~/lib/apps"
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
      <Link to='/apps'>
        <button className={clsx('mb-4 text-zinc-500', buttonCN.small, buttonCN.transparent, buttonCN.iconLeft)}>
          <ArrowLeftIcon className="w-5 h-5" />
          <p>Back to app list</p>
        </button>
      </Link>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Logo
          src={app.logo}
          className="w-12 h-12 rounded-full bg-gray-100"
        />
        <p className="text-2xl font-semibold flex-grow">{app.title}</p>
        <div className="flex-grow"></div>
        <div className="flex flex-wrap justify-start gap-2">
          {app.enabled ? (
            <button className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
              <MinusCircleIcon className="w-5 h-5" />
              <p>Disable</p>
            </button>
          ) : (
            <button className={clsx(buttonCN.normal, buttonCN.outline, buttonCN.iconLeft)}>
              <PlusCircleIcon className="w-5 h-5" />
              <p>Enable</p>
            </button>
          )}
          <button className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
            <PencilIcon className="w-5 h-5" />
            <p>Edit</p>
          </button>
        </div>
      </div>
      <hr />
      <div className="flex flex-wrap justify-end gap-2 my-6">
        <button className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
          <PlayIcon className="w-5 h-5" />
          <p>Start</p>
        </button>
        <button className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
          <StopIcon className="w-5 h-5" />
          <p>Stop</p>
        </button>
        <button className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
          <ArrowPathIcon className="w-5 h-5" />
          <p>Restart</p>
        </button>
        <button className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
          <TrashIcon className="w-5 h-5" />
          <p>Kill</p>
        </button>
        <button className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
          <ArrowUpTrayIcon className="w-5 h-5" />
          <p>Up</p>
        </button>
        <button className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
          <ArrowDownTrayIcon className="w-5 h-5" />
          <p>Down</p>
        </button>
        <button className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
          <CloudArrowDownIcon className="w-5 h-5" />
          <p>Pull</p>
        </button>
      </div>
      <hr />
      <div className="my-4">
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
