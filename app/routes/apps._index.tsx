import { PlusIcon } from "@heroicons/react/20/solid"
import { Link, useLoaderData } from "@remix-run/react"
import clsx from "clsx"
import { useMemo } from "react"
import AppCard from "~/components/AppCard"
import Layout from "~/components/layout"
import { getProjectsFromContainers } from "~/lib/compose.server"
import { getLogoFromContainer, getTitleFromContainer } from "~/lib/docker.util"
import { buttonCN } from "~/lib/styles"

export async function loader() {
  const projects = await getProjectsFromContainers()
  return { projects }
}

export default function Apps() {
  const { projects } = useLoaderData() as Awaited<ReturnType<typeof loader>>

  const numRunningApps = useMemo(
    () => projects.filter((app) => Object.values(app.containers).some((c) => c.State === 'running')).length,
    [projects]
  )
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
            <h3 className="not-sr-only capitalize text-xl font-semibold md:px-2 py-2 border-b border-gray-200">
              {project.key}
            </h3>
            <Link to={`/library/${project.key}`} className="absolute inset-0">
              <span className="sr-only">{project.key}</span>
            </Link>
            <ul className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4 pb-2 md:px-2">
              {project.containers.map((container) => (
                <AppCard
                  key={container.Id}
                  title={getTitleFromContainer(container)}
                  logo={getLogoFromContainer(container)}
                  status={container.Status}
                  state={container.State}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Layout>
  )
}
