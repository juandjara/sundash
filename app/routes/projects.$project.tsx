import { ArrowPathIcon } from "@heroicons/react/20/solid"
import { StopIcon, ArrowDownTrayIcon, ArrowLeftIcon, ArrowUpTrayIcon, CloudArrowDownIcon, DocumentIcon, PlayIcon } from "@heroicons/react/24/outline"
import { json, type LoaderArgs } from "@remix-run/node"
import { Form, Link, useLoaderData, useRevalidator } from "@remix-run/react"
import clsx from "clsx"
import path from 'path'
import { useEffect, useState } from "react"
import { useEventSource } from "remix-utils"
import LogDisplay from "~/components/LogDisplay"
import Logo from "~/components/Logo"
import Tooltip from "~/components/Tooltip"
import Layout from "~/components/layout"
import { getComposeLogs, getProjectFromKey, handleComposeOperation, type Project } from "~/lib/compose.server"
import { getLogoFromContainer, getStateColor, getTitleFromContainer } from "~/lib/docker.util"
import { buttonCN } from "~/lib/styles"

export async function loader({ params }: LoaderArgs) {
  const key = params.project!
  const project = await getProjectFromKey(key)
  const logs = await getComposeLogs(project)

  return {
    logs,
    project: {
      ...project,
      configFiles: project.configFiles.map((file) => path.relative(project.dir, file)),
      envFiles: project.envFiles.map((file) => path.relative(project.dir, file)),
    }
  }
}

export async function action({ request, params }: LoaderArgs) {
  const key = params.project!
  const project = await getProjectFromKey(key)

  const fd = await request.formData()
  const op = fd.get('op') as any

  try {
    const res = await handleComposeOperation(project, op)
    return json({ msg: res })
  } catch (err) {
    if (err instanceof Response) {
      throw err
    }

    const msg = String((err as Error).message)
    return json({ error: msg })
  }
}

function useLogs(id: string, initialLogs = '') {
  const [logs, setLogs] = useState(initialLogs.split('\n'))
  const lastLog = useEventSource(`/api/logs?id=${id}`, { event: `log:${id}` })
  useEffect(() => {
    if (lastLog) {
      setLogs((prev) => [...prev, lastLog])
    }
  }, [lastLog])
  return logs
}

export default function ProjectDetail() {
  const { project, logs: initialLogs } = useLoaderData() as { project: Project; logs: string }
  const logs = useLogs(project.key, initialLogs)
  const isRunning = project.containers.some((container) => container.State === 'running')
  const revalidator = useRevalidator()

  return (
    <Layout>
      <Link to='/apps'>
        <button type="button" className={clsx('mb-4 text-zinc-500', buttonCN.small, buttonCN.transparent, buttonCN.iconLeft)}>
          <ArrowLeftIcon className="w-5 h-5" />
          <p>Back to app list</p>
        </button>
      </Link>
      <section className="flex flex-wrap gap-2 align-baseline my-4 md:px-2">
        <p className="capitalize text-2xl font-semibold flex-grow">{project.key}</p>
        <Form method='POST' className="flex flex-wrap items-center gap-2">
          <button name="op" value="up" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
            <ArrowUpTrayIcon className="w-5 h-5" />
            <p>Up</p>
          </button>
          <button name="op" value="down" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
            <ArrowDownTrayIcon className="w-5 h-5" />
            <p>Down</p>
          </button>
          <button name="op" value="pull" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
            <CloudArrowDownIcon className="w-5 h-5" />
            <p>Pull</p>
          </button>
          <button name="op" value="restart" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
            <ArrowPathIcon className="w-5 h-5" />
            <p>Restart</p>
          </button>
          {isRunning ? (
            <button name="op" value="stop" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
              <StopIcon className="w-5 h-5" />
              <p>Stop</p>
            </button>
          ) : (
            <button name="op" value="start" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
              <PlayIcon className="w-5 h-5" />
              <p>Start</p>
            </button>
          )}
        </Form>
      </section>
      <div className="flex flex-wrap">
        <div className="flex-auto basis-1/2">
          <section className="md:px-2">
            <h3 className="text-xl font-semibold flex-grow mb-2">Containers</h3>
            <ul className="flex flex-wrap items-center justify-center md:justify-start gap-4 my-4">
              {project.containers.map((container) => (
                <ContainerCard container={container} key={container.Id} />
              ))}
            </ul>
          </section>
          <section className="mt-6 mb-3 md:px-2">
            <h3 className="text-xl font-semibold flex-grow mb-2">Config files</h3>
            <ul>
              {project.configFiles.map((file, i) => (
                <li key={file} className="flex">
                  <Link
                    to={`/projects/${project.key}/edit?i=${i}&type=config`}
                    className="flex gap-2 py-1 pr-2 items-center rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <DocumentIcon className="w-8 h-8 text-gray-400 flex-shrink-0" />
                    <p className="text-gray-600 flex-grow">{file}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          {project.envFiles.length > 0 && (
            <section className="my-6 md:px-2">
              <h3 className="text-xl font-semibold flex-grow mb-2">Env files</h3>
              <ul>
                {project.envFiles.map((file, i) => (
                  <li key={file} className="flex">
                    <Link
                      to={`/projects/${project.key}/edit?i=${i}&type=env`}
                      className="flex gap-2 py-1 pr-2 items-center rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <DocumentIcon className="w-8 h-8 text-gray-400 flex-shrink-0" />
                      <p className="text-gray-600">{file}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <div className="flex-auto min-w-0 basis-1/2">
          <div className="flex items-end justify-between mb-2">
            <h3 className="text-xl font-semibold flex-grow mb-4">Logs</h3>
            <button
              aria-disabled={revalidator.state === 'loading'}
              onClick={() => revalidator.revalidate()}
              className={clsx(buttonCN.small, buttonCN.normal, buttonCN.icon)}
            >
              <ArrowPathIcon className="w-5 h-5 text-pink-500" />
            </button>
          </div>
          <LogDisplay text={logs.join('\n')} />
        </div>
      </div>
    </Layout>
  )
}

function ContainerCard({ container }: { container: Project['containers'][number] }) {
  return (
    <li
      className={clsx(
        'shadow hover:shadow-md transition-shadow',
        'bg-white relative group flex flex-col place-items-center border border-zinc-200 py-3 rounded-xl w-40'
      )}
    >
      <Link to={`/containers/${container.Id}`} className="absolute inset-0">
        <span className="sr-only">{getTitleFromContainer(container)}</span>
      </Link>
      <div className="absolute top-2 left-2">              
        <Tooltip title={container.Status}>
          <div className={clsx(
            getStateColor(container.State),
            'w-4 h-4 rounded-full'
          )}></div>
        </Tooltip>
      </div>
      <Logo
        src={getLogoFromContainer(container)}
        alt='app logo'
        className="pointer-events-none w-20 h-20 block object-contain p-0.5 group-hover:scale-125 duration-300 transition-transform transform"
      />
      <p className="not-sr-only truncate max-w-full px-2 text-center mt-2">{getTitleFromContainer(container)}</p>
    </li>
  )
}
