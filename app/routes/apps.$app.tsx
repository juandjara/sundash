import { ArrowLeftIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid"
import { PencilIcon, MinusCircleIcon, PlusCircleIcon, ArrowDownTrayIcon, ArrowPathIcon, ArrowUpTrayIcon, CloudArrowDownIcon, StopIcon, TrashIcon } from "@heroicons/react/24/outline"
import { json, type ActionArgs, type LoaderArgs } from "@remix-run/node"
import { Form, Link, useActionData, useLoaderData, useNavigation, useRevalidator } from "@remix-run/react"
import clsx from "clsx"
import { useEffect, useState } from "react"
import { useEventSource } from "remix-utils"
import LogDisplay from "~/components/LogDisplay"
import Logo from "~/components/Logo"
import Layout from "~/components/layout"
import type { ComposeJSONExtra } from "~/lib/apps"
import { getApp, getStateColor, getStateTitle } from "~/lib/apps"
import type { RuntimeState } from "~/lib/docker.server"
import { getLogs, handleDockerOperation, readComposeFile, streamLogs } from "~/lib/docker.server"
import { buttonCN } from "~/lib/styles"

export async function loader({ params }: LoaderArgs) {
  const filename = params.app!
  try {
    const yaml = await readComposeFile(filename)
    const app = await getApp(filename, yaml)
    const logs = await getLogs(app.key)
    streamLogs(app.key)
    return { app, logs }
  } catch (err) {
    throw new Response(null, { status: 500, statusText: String((err as Error).message) })
  }
}

export async function action({ request }: ActionArgs) {
  const fd = await request.formData()
  const op = fd.get('op') as any
  try {
    const res = await handleDockerOperation({
      op,
      key: fd.get('key') as string,
      filename: fd.get('filename') as string,
      state: fd.get('state') as RuntimeState
    })
  
    return json({ msg: res })
  } catch (err) {
    if (err instanceof Response) {
      throw err
    }

    const msg = String((err as Error).message)
    return json({ error: msg })
  }
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

function useLogs(initial: string) {
  const [logs, setLogs] = useState(initial.split('\n'))
  const lastLog = useEventSource(`/api/logs`, { event: 'log' })
  useEffect(() => {
    if (lastLog) {
      setLogs((prev) => [...prev, lastLog])
    }
  }, [lastLog])
  return logs
}

export default function AppDetail() {
  const { app, logs: initialLogs } = useLoaderData() as { app: ComposeJSONExtra; logs: string }
  const revalidator = useRevalidator()
  const events = useEventLog()
  const logs = useLogs(initialLogs)
  const transition = useNavigation()
  const busy = transition.state !== 'idle'
  const actionData = useActionData()

  function getAppURL() {
    const key = Object.keys(app.services)[0]
    const service = app.services[key] || {}
    const labelURL = (service.labels || {})['caddy']
    if (labelURL) {
      return labelURL
    }

    const portParts = service.ports?.[0] && service.ports[0].split(':')
    const port = portParts && Number(portParts[portParts.length - 1].replace('/tcp', '').replace('/udp', ''))
    return `http://localhost:${port || 80}`
  }

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
      <Form method="POST">
        <input type="hidden" name="key" value={app.key} />
        <input type="hidden" name="filename" value={app.filename} />
        <input type="hidden" name="state" value={app.runtime?.state} />
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <Logo
            src={app.logo}
            className="w-12 h-12 rounded-full bg-gray-100"
          />
          <div>
            <p className="text-2xl font-semibold flex-grow">{app.title}</p>
            <p className="text-sm text-zinc-500">{app.filename}</p>
          </div>
          <div className="flex-grow"></div>
          <div className="flex flex-wrap justify-start gap-2">
            <Link to={`/edit?source=file&filename=${app.filename}`}>
              <button
                type="button"
                className={clsx(buttonCN.normal, buttonCN.outline, buttonCN.iconLeft)}
              >
                <PencilIcon className="w-5 h-5" />
                <p>Edit</p>
              </button>
            </Link>
            {app.filename !== 'docker-compose.yml'
              ? (
                app.enabled ? (
                  <button
                    aria-disabled={busy}
                    name="op"
                    value="disable"
                    className={clsx(buttonCN.normal, buttonCN.outline, buttonCN.iconLeft)}
                  >
                    <MinusCircleIcon className="w-5 h-5" />
                    <p>Disable</p>
                  </button>
                ) : (
                  <button
                    aria-disabled={busy}
                    name="op"
                    value="enable"
                    className={clsx(buttonCN.normal, buttonCN.outline, buttonCN.iconLeft)}
                  >
                    <PlusCircleIcon className="w-5 h-5" />
                    <p>Enable</p>
                  </button>
                )
              ) : null}
            <button
              aria-disabled={busy}
              name="op"
              value="delete"
              onClick={(ev) => {
                if (!confirm(`${app.filename} will be removed from disk and from .env file. Are you sure? This action cannot be undone.`)) {
                  ev.preventDefault()
                  ev.stopPropagation()
                }
              }}
              className={clsx(buttonCN.normal, buttonCN.delete, 'border-2 border-red-200', buttonCN.iconLeft)}
            >
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
      {actionData?.error ? (
        <LogDisplay className="mb-4 text-red-800 bg-red-100" text={actionData.error} />
      ) : (
        <LogDisplay className="mb-4" text={events.join('\n')} />
      )}
      <hr />
      <div className="my-4">
        <div className="flex flex-wrap items-start gap-6">
          <div>
            <p>
              <small className="text-gray-500">State: </small>
            </p>
            <div className="flex items-center gap-2">
              <div className={clsx(
                getStateColor(app),
                'w-3 h-3 rounded-full'
              )}></div>
              <p>{getStateTitle(app)}</p>
            </div>
          </div>
          {app.runtime?.status ? (
            <div>
              <p>
                <small className="text-gray-500">Status: </small>
              </p>
              <p>{app.runtime?.status}</p>
            </div>
          ) : null}
          <div className="flex-grow"></div>
            <Link
              to={getAppURL()}
              aria-disabled={app.runtime?.state !== 'up'}
              className={clsx(buttonCN.normal, buttonCN.primary, buttonCN.iconLeft)}
            >
              <ArrowTopRightOnSquareIcon className="w-5 h-5" />
              <p>Open app</p>
            </Link>
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
          <LogDisplay text={logs.join('\n')} />
        </div>
      </div>
    </Layout>
  )
}
