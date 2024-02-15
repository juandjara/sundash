import { ArrowPathIcon } from "@heroicons/react/20/solid"
import { StopIcon, ArrowDownTrayIcon, ArrowLeftIcon, ArrowUpTrayIcon, CloudArrowDownIcon, DocumentIcon, PlayIcon } from "@heroicons/react/24/outline"
import { json, type LoaderArgs } from "@remix-run/node"
import { Form, Link, useLoaderData, useRevalidator } from "@remix-run/react"
import clsx from "clsx"
import path from 'path'
import { useEffect, useState } from "react"
import { useEventSource } from "remix-utils"
import AppCard from "~/components/AppCard"
import LogDisplay from "~/components/LogDisplay"
import Layout from "~/components/layout"
import { getComposeLogs, getProjectFromKey, handleComposeOperation } from "~/lib/compose.server"
import { type ContainerState } from "~/lib/docker.server"
import { ComposeLabels, SundashLabels, defaultLogo } from "~/lib/docker.util"
import { readConfigFolder } from "~/lib/library.server"
import { buttonCN } from "~/lib/styles"

export async function loader({ request, params }: LoaderArgs) {
  const key = params.project!
  const project = await getProjectFromKey(key)
  const logs = project ? await getComposeLogs(project) : ''
  const { searchParams } = new URL(request.url)
  const urlService = searchParams.get('service')
  const urlFile = searchParams.get('file')

  const library = await readConfigFolder()
  const libraryProject = library.find((l) => l.key === key)

  if (!project && !libraryProject) {
    throw new Response('Project not found', { status: 404 })
  }

  const ymlFiles = libraryProject?.ymlFiles.filter((f) => {
    if (urlFile) {
      return f.path === urlFile
    }
    if (urlService) {
      return Object.keys(f.content.services).includes(urlService)
    }
    return true
  }) || []

  const envFiles = Array.from(new Set([
    libraryProject?.envFile?.path,
    ...project?.envFiles.map((file) => path.relative(project?.dir, file)) || [],
  ].filter(Boolean)))
  const configFiles = Array.from(new Set([
    ...ymlFiles.map((file) => file.path) || [],
    ...project?.configFiles.map((file) => path.relative(project.dir, file)) || [],
  ].filter(Boolean)))

  const containerServiceMap = Object.fromEntries(
    project?.containers.map((container) => [
      container.Labels[ComposeLabels.SERVICE],
      container
    ]) || []
  )

  let services = [] as {
    key: string
    logo: string
    title: string
    state: ContainerState
    status: string
    enabled: boolean
  }[]
  
  const shouldExpandServices = libraryProject?.ymlFiles.length === 1

  if (libraryProject) {
    services = ymlFiles.map((yml) => {
      return Object.entries(yml.content.services)
        .filter(([key, value], i) => {
          if (shouldExpandServices) {
            return true
          }
          if (urlService) {
            return key === urlService
          }

          return value?.labels?.[SundashLabels.MAIN] === 'true' || i === 0
        })
        .map(([key, value]) => {
          const title = value?.labels?.[SundashLabels.TITLE] || key
          const logo = value?.labels?.[SundashLabels.LOGO] || defaultLogo(key)
          const state = containerServiceMap[key]?.State
          const status = containerServiceMap[key]?.Status
          const enabled = yml.meta.enabled
          return {
            key,
            logo,
            title,
            state,
            status,
            enabled,
          }
        })
    })
    .flat()
  }
  if (!libraryProject && project) {
    services = project.containers.map((container) => {
      const key = container.Labels[ComposeLabels.SERVICE]
      const title = container.Labels[SundashLabels.TITLE] || key
      const logo = container.Labels[SundashLabels.LOGO] || defaultLogo(title)
      const state = container.State
      const status = container.Status
      return {
        key,
        logo,
        title,
        state,
        status,
        enabled: true,
      }
    })
  }

  return {
    logs,
    project: {
      key,
      dir: project?.dir || libraryProject?.folder || '',
      configFiles,
      envFiles,
      services,
    }
  }
}

export async function action({ request, params }: LoaderArgs) {
  const key = params.project!
  const project = await getProjectFromKey(key)
  if (!project) {
    throw new Response('Project not found', { status: 404 })
  }

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
  const { project, logs: initialLogs } = useLoaderData<typeof loader>()
  const logs = useLogs(project.key, initialLogs)
  const isRunning = project.services.some((s) => s.state === 'running')
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
            <h3 className="text-xl font-semibold flex-grow mb-2">
              Services
            </h3>
            {project.services.length === 0 && (
              <p className="text-gray-500">No services found</p>
            )}
            <ul className="flex flex-wrap items-center justify-center md:justify-start gap-4 my-4">
              {project.services.map((s) => (
                <AppCard
                  link={`/projects/${project.key}?service=${s.key}`}
                  key={s.key}
                  logo={s.logo}
                  title={s.title}
                  enabled={s.enabled}
                  state={s.state}
                  status={s.status}
                />
              ))}
            </ul>
          </section>
          <section className="mt-9 mb-3 md:px-2">
            <h3 className="text-xl font-semibold flex-grow mb-2">Config files</h3>
            <ul className="columns-2">
              {project.configFiles.map((file, i) => (
                <li key={file}>
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
              <ul className="columns-2">
                {project.envFiles.map((file, i) => (
                  <li key={file}>
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
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold flex-grow">Logs</h3>
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
