import { ArrowDownTrayIcon, ArrowLeftIcon, ArrowUpTrayIcon, CloudArrowDownIcon, DocumentIcon } from "@heroicons/react/24/outline"
import type { LoaderArgs } from "@remix-run/node"
import { Link, useLoaderData } from "@remix-run/react"
import clsx from "clsx"
import type Dockerode from "dockerode"
import Logo from "~/components/Logo"
import Tooltip from "~/components/Tooltip"
import Layout from "~/components/layout"
import { type ContainerState, getLogoFromContainer, getStateColor, type Project } from "~/lib/apps"
import { composeLogs, getAllContainers } from "~/lib/docker.server"
import { buttonCN } from "~/lib/styles"
import path from 'path'
import { ArrowPathIcon } from "@heroicons/react/20/solid"
import { useEffect, useState } from "react"
import { useEventSource } from "remix-utils"
import LogDisplay from "~/components/LogDisplay"

export async function loader({ params }: LoaderArgs) {
  const urlProject = params.project!
  const containers = await getAllContainers()
  const projectContainers = containers.filter((container) => container.Labels['com.docker.compose.project'] === urlProject)
  const first = projectContainers[0]

  if (!first) {
    throw new Response('Project not found', { status: 404 })
  }

  const dir = first.Labels['com.docker.compose.project.working_dir']
  const configFiles = (first.Labels['com.docker.compose.project.config_files'] || '')
    .split(',')
    .filter(Boolean)

  const envFiles = (first.Labels['com.docker.compose.project.environment_file'] || '')
    .split(',')
    .filter(Boolean)

  const logs = await composeLogs(urlProject, configFiles, envFiles)

  const project = {
    dir,
    project: urlProject,
    configFiles: configFiles.map((file) => path.relative(dir, file)),
    envFiles: envFiles.map((file) => path.relative(dir, file)),
    containers: projectContainers,
  }

  return { project, logs }
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
  const { project, logs: initialLogs } = useLoaderData() as { project: { containers: Dockerode.ContainerInfo[] } & Pick<Project, 'dir' | 'project' | 'configFiles' | 'envFiles'>; logs: string }
  const logs = useLogs(project.project, initialLogs)

  return (
    <Layout>
      <Link to='/apps'>
        <button type="button" className={clsx('mb-4 text-zinc-500', buttonCN.small, buttonCN.transparent, buttonCN.iconLeft)}>
          <ArrowLeftIcon className="w-5 h-5" />
          <p>Back to app list</p>
        </button>
      </Link>
      <section className="flex flex-wrap gap-2 align-baseline my-4 md:px-2">
        <p className="capitalize text-2xl font-semibold flex-grow">{project.project}</p>
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </section>
      <div className="flex flex-wrap">
        <div className="flex-auto basis-1/2">
          <section className="md:px-2">
            <h3 className="text-xl font-semibold flex-grow mb-2">Containers</h3>
            <ul className="flex flex-wrap items-center justify-center md:justify-start gap-4 my-4">
              {project.containers.map((container) => (
                <AppCard app={appFromContainer(container)} key={container.Id} />
              ))}
            </ul>
          </section>
          <section className="mt-6 mb-3 md:px-2">
            <h3 className="text-xl font-semibold flex-grow mb-2">Config files</h3>
            <ul>
              {project.configFiles.map((file, i) => (
                <li key={file} className="flex">
                  <Link
                    to={`/projects/${project.project}/edit?i=${i}&type=config`}
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
                      to={`/projects/${project.project}/edit?i=${i}&type=env`}
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
          <h3 className="text-xl font-semibold flex-grow mb-4">Logs</h3>
          <LogDisplay text={logs.join('\n')} />
        </div>
      </div>
    </Layout>
  )
}

type ContainerCard = {
  id: string
  service: string
  title: string
  logo: string
  state: ContainerState
  status: string
}

function appFromContainer(container: Dockerode.ContainerInfo) {
  const service = container.Labels['com.docker.compose.service']
  const title = service || container.Names[0]
  return {
    id: container.Id,
    service,
    title,
    logo: getLogoFromContainer(container),
    state: container.State as ContainerState,
    status: container.Status,
  } satisfies ContainerCard
}

function AppCard({ app }: { app: ContainerCard }) {
  return (
    <li
      className={clsx(
        'shadow hover:shadow-md transition-shadow',
        'bg-white relative group flex flex-col place-items-center border border-zinc-200 py-3 rounded-xl w-40'
      )}
    >
      <Link to={`/containers/${app.id}`} className="absolute inset-0">
        <span className="sr-only">{app.title}</span>
      </Link>
      <div className="absolute top-2 left-2">              
        <Tooltip title={app.status}>
          <div className={clsx(
            getStateColor(app.state),
            'w-4 h-4 rounded-full'
          )}></div>
        </Tooltip>
      </div>
      <Logo
        src={app.logo}
        alt='app logo'
        className="pointer-events-none w-20 h-20 block object-contain p-0.5 group-hover:scale-125 duration-300 transition-transform transform"
      />
      <p className="not-sr-only truncate max-w-full px-2 text-center mt-2">{app.title}</p>
    </li>
  )
}
