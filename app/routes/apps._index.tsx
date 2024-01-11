import { PlusIcon } from "@heroicons/react/20/solid"
import { Link, useLoaderData } from "@remix-run/react"
import clsx from "clsx"
import type Dockerode from "dockerode"
import Logo from "~/components/Logo"
import Tooltip from "~/components/Tooltip"
import Layout from "~/components/layout"
import type { ContainerState } from "~/lib/apps"
import { getAppsFromContainers, getLogoFromContainer, getStateColor } from "~/lib/apps"
import { buttonCN } from "~/lib/styles"

export async function loader() {
  const projects = await getAppsFromContainers()
  return { projects }
}

export default function Apps() {
  const { projects } = useLoaderData() as Awaited<ReturnType<typeof loader>>

  const numRunningApps = projects.filter((app) => app.runtime?.state === 'running').length
  const numStoppedApps = projects.length - numRunningApps

  return (
    <Layout>
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <h2 className="text-2xl font-semibold flex-grow">
          <span>Apps</span>
          {' '}<small className="text-sm text-zinc-500">
            {numRunningApps} running / {numStoppedApps} stopped / {projects.length} total
          </small>
        </h2>
        <Link to='/edit?source=new'>
          <button className={clsx(buttonCN.normal, buttonCN.primary, buttonCN.iconLeft)}>
            <PlusIcon className="w-6 h-6" />
            <p>New app</p>
          </button>
        </Link>
      </div>
      {projects.length === 0 && (
        <p className="text-center text-lg mt-4">
          You don't have any apps yet. 
          {' '}<Link className="underline text-pink-500" to='/new'>Create one</Link>
          {' '}or install from the <Link className="underline text-pink-500" to='/appstore'>App Store</Link>.
        </p>
      )}
      <div className="flex flex-wrap gap-4">
        {projects.map((project) => (
          <section key={project.key} className="relative my-2 hover:bg-pink-50/50 rounded-lg transition-colors">
            <h3 className="not-sr-only capitalize text-xl font-semibold md:px-2 py-2 border-b border-gray-200">{project.project}</h3>
            <Link to={`/projects/${project.project}`} className="absolute inset-0">
              <span className="sr-only">{project.project}</span>
            </Link>
            <ul className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4 pb-2 md:px-2">
              {Object.values(project.containers).map((container) => (
                <AppCard app={appFromContainer(container)} key={container.Id} />
              ))}
            </ul>
          </section>
        ))}
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
        'bg-white shadow relative pointer-events-none ',
        'flex flex-col place-items-center border border-zinc-200 py-3 rounded-xl w-40'
      )}
    >
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
        className="pointer-events-none w-20 h-20 block object-contain p-0.5"
      />
      <p className="truncate max-w-full px-2 text-center mt-2">{app.title}</p>
    </li>
  )
}
