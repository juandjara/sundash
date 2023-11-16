import { ArrowDownCircleIcon, ArrowLeftIcon } from "@heroicons/react/20/solid"
import { PencilIcon, MinusCircleIcon, PlusCircleIcon, ArrowDownTrayIcon, ArrowPathIcon, ArrowUpTrayIcon, CloudArrowDownIcon, StopIcon, TrashIcon } from "@heroicons/react/24/outline"
import { json, type ActionArgs, type LoaderArgs } from "@remix-run/node"
import { Form, Link, useLoaderData, useNavigation, useRevalidator } from "@remix-run/react"
import clsx from "clsx"
import { useEffect, useRef, useState } from "react"
import { useEventSource } from "remix-utils"
import Logo from "~/components/Logo"
import Layout from "~/components/layout"
import type { ComposeJSONExtra} from "~/lib/apps"
import { getApp, getStateTitle } from "~/lib/apps"
import { getLogs, handleDockerOperation } from "~/lib/docker.server"
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

export async function action({ request }: ActionArgs) {
  const fd = await request.formData()
  const op = fd.get('op') as any
  const res = await handleDockerOperation({
    op,
    key: fd.get('key') as string,
    filename: fd.get('filename') as string,
  })

  return json({ msg: res })
}

function useEventLog() {
  const [logs, setLogs] = useState([] as string[])
  const lastLog = useEventSource(`/api/events`, { event: 'message' })
  useEffect(() => {
    if (lastLog) {
      setLogs((prev) => [...prev, lastLog])
    }
  }, [lastLog])
  return logs
}

export default function AppDetail() {
  const { app, logs } = useLoaderData() as { app: ComposeJSONExtra; logs: string }
  const revalidator = useRevalidator()
  const events = useEventLog()
  const transition = useNavigation()
  const busy = transition.state !== 'idle'

  if (!app) {
    return null
  }

  return (
    <Layout>
      <Link to='/apps'>
        <button type="button" className={clsx('mb-4 text-zinc-500', buttonCN.small, buttonCN.transparent, buttonCN.iconLeft)}>
          <ArrowLeftIcon className="w-5 h-5" />
          <p>Back to app list</p>
        </button>
      </Link>
      <Form method="POST" className="">
        <input type="hidden" name="key" value={app.key} />
        <input type="hidden" name="filename" value={app.filename} />
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <Logo
            src={app.logo}
            className="w-12 h-12 rounded-full bg-gray-100"
          />
          <p className="text-2xl font-semibold flex-grow">{app.title}</p>
          <div className="flex-grow"></div>
          <div className="flex flex-wrap justify-start gap-2">
            <Link className="opacity-50 pointer-events-none" to={`/apps/${app.filename}/edit`}>
              <button type="button" className={clsx(buttonCN.normal, buttonCN.outline, buttonCN.iconLeft)}>
                <PencilIcon className="w-5 h-5" />
                <p>Edit</p>
              </button>
            </Link>
            {app.enabled ? (
              <button name="op" value="disable" className={clsx(buttonCN.normal, buttonCN.outline, buttonCN.iconLeft)}>
                <MinusCircleIcon className="w-5 h-5" />
                <p>Disable</p>
              </button>
            ) : (
              <button name="op" value="enable" className={clsx(buttonCN.normal, buttonCN.outline, buttonCN.iconLeft)}>
                <PlusCircleIcon className="w-5 h-5" />
                <p>Enable</p>
              </button>
            )}
            <button name="op" value="delete" className={clsx(buttonCN.normal, buttonCN.delete, 'border-2 border-red-200', buttonCN.iconLeft)}>
              <TrashIcon className="w-5 h-5" />
              <p>Delete</p>
            </button>
          </div>
        </div>
        <hr />
        <div className={clsx(
          { 'opacity-40 pointer-events-none': !app.enabled || busy },
          'flex flex-wrap justify-end gap-2 my-6'
        )}>
          <button name="op" value="up" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
            <ArrowUpTrayIcon className="w-5 h-5" />
            <p>Up</p>
          </button>
          <button name="op" value="down" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
            <ArrowDownTrayIcon className="w-5 h-5" />
            <p>Down</p>
          </button>
          <button name="op" value="restart" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
            <ArrowPathIcon className="w-5 h-5" />
            <p>Restart</p>
          </button>
          <button name="op" value="stop" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
            <StopIcon className="w-5 h-5" />
            <p>Stop</p>
          </button>
          <button name="op" value="kill" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
            <TrashIcon className="w-5 h-5" />
            <p>Kill</p>
          </button>
          <button name="op" value="pull" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
            <CloudArrowDownIcon className="w-5 h-5" />
            <p>Pull</p>
          </button>
        </div>
      </Form>
      <LogDisplay className="mb-4" text={events.join('\n')} />
      <hr />
      <div className="my-4">
        <div className="flex flex-wrap items-start gap-6">
          <div>
            <p>
              <small className="text-gray-500">State: </small>
            </p>
            <p>{getStateTitle(app)}</p>
          </div>
          {app.runtime?.status ? (
            <div>
              <p>
                <small className="text-gray-500">Status: </small>
              </p>
              <p>{app.runtime?.status}</p>
            </div>
          ) : null}
          {app.runtime?.created ? (  
            <div>
              <p>
                <small className="text-gray-500">Created at: </small>
              </p>
              <p>{app.runtime?.created}</p>
            </div>
          ) : null}
        </div>
        <div className="mt-4">
          <div className="flex items-end justify-between mb-2">
            <p className="text-sm text-zinc-500">Logs</p>
            <button
              aria-disabled={revalidator.state === 'loading'}
              onClick={() => revalidator.revalidate()}
              className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}
            >
              <ArrowPathIcon className="w-5 h-5" />
              <p>Reload</p>
            </button>
          </div>
          <LogDisplay text={logs} />
        </div>
      </div>
    </Layout>
  )
}

function LogDisplay({ text, className = '' }: { text: string; className?: string }) {
  const logsRef = useRef<HTMLPreElement>(null)

  function scrollToBottom() {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }

  if (!text) {
    return null
  }

  return (
    <div className={clsx(className, 'relative')}>
      <pre ref={logsRef} className="overflow-auto max-h-[500px] p-3 bg-zinc-100 rounded-md">{text}</pre>
      <button
        title='Scroll to bottom'
        onClick={scrollToBottom}
        className={clsx('absolute bottom-2 right-2 hover:bg-white', buttonCN.normal, buttonCN.icon)}
      >
        <ArrowDownCircleIcon className="w-6 h-6" />
      </button>
    </div>
  )
}
