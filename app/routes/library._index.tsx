import { PlusIcon } from "@heroicons/react/24/outline"
import { Link, useLoaderData } from "@remix-run/react"
import clsx from "clsx"
import AppCard from "~/components/AppCard"
import Layout from "~/components/layout"
import { getProjectsFromContainers } from "~/lib/compose.server"
import { ComposeLabels, SundashLabels, defaultLogo } from "~/lib/docker.util"
import { type LibraryProject, readConfigFolder } from "~/lib/library.server"
import { buttonCN } from "~/lib/styles"

export async function loader() {
  const [libraryProjects, runningProjects] = await Promise.all([
    readConfigFolder(),
    getProjectsFromContainers(),
  ])

  const containerServiceMap = Object.fromEntries(
    runningProjects
      .map((p) => p.containers.map((c) => [c.Labels[ComposeLabels.SERVICE], c]))
      .flat()
  )

  const libraryProjectsKeys = new Set(libraryProjects.map((p) => p.key))

  const formattedRunningProjects = runningProjects
    .filter((p) => !libraryProjectsKeys.has(p.key))
    .map((p) => ({
      folder: p.dir,
      key: p.key,
      envFile: null,
      ymlFiles: p.containers.map((c) => ({
        path: c.Labels[ComposeLabels.PROJECT_CONFIG_FILES],
        content: null,
        meta: {
          serviceKey: c.Labels[ComposeLabels.SERVICE],
          title: c.Labels[SundashLabels.TITLE] || c.Labels[ComposeLabels.SERVICE],
          logo: c.Labels[SundashLabels.LOGO] || defaultLogo(c.Labels[ComposeLabels.SERVICE]),
          enabled: true
        },
      })),
    }))

  return { libraryProjects, containerServiceMap, runningProjects: formattedRunningProjects }
}

export default function Library() {
  const { libraryProjects, containerServiceMap, runningProjects } = useLoaderData<typeof loader>()

  function formatFolder(project: LibraryProject) {
    const folder = project.folder.startsWith('.') ? project.folder : `./${project.folder}`
    if (project.ymlFiles.length === 1) {
      return `${folder}/${project.ymlFiles[0].path}`
    }
    return `${folder} - ${project.ymlFiles.length} apps`
  }

  return (
    <Layout>
      <header className="mb-6 flex flex-wrap gap-2 justify-between items-end">
        <div>
          <h2 className="mb-3">
            <span className="text-3xl font-semibold">App Library</span>
            <span className="ml-2 text-sm text-gray-500">{libraryProjects.length} projects</span>
          </h2>
          <div className="max-w-prose">
            <p className="mb-2">
              This page lists all the projects in the app library. Each project is a folder in the <code>config</code> directory that contains a <code>.env</code> file and one or more <code>.yml</code> files. Each <code>.yml</code> file is a Docker Compose file that defines a set of services.
            </p>
            <p>
              Each <code>.yml</code> file not associated with a <code>.env</code> file is shown as a standalone project.
            </p>
          </div>
        </div>
        {/* <button className={clsx(buttonCN.normal, buttonCN.primary, buttonCN.iconLeft)}>
          <PlusIcon className="w-6 h-6" />
          <p>New project</p>
        </button> */}
      </header>
      {libraryProjects.map((project) => (
        <section key={project.folder} className={clsx(
          'mb-6 px-2 rounded-lg relative',
          'shadow-none hover:bg-red-50/50 hover:shadow hover:shadow-pink-100 transition-all'
        )}>
          <Link to={`/library/${project.key}`} className="absolute inset-0">
            <span className="sr-only">{project.key}</span>
          </Link>
          <h3 className="border-b mb-2 pt-1 pb-2 px-1.5">
            <p className="text-xl font-bold"> {project.key} </p>
            <p className="text-sm text-gray-500"> {formatFolder(project)} </p>
          </h3>
          <ul className="py-2 flex flex-wrap justify-start gap-4">
            {project.ymlFiles.map(({ path, meta }) => {
              const { State, Status } = containerServiceMap[meta?.serviceKey] || {}
              return (
                <AppCard
                  key={path}
                  link={`/library/${project.key}?file=${path}`}
                  title={meta?.title || path}
                  logo={meta?.logo || ''}
                  state={State}
                  status={Status}
                  enabled={meta?.enabled}
                />
              )
            })}
          </ul>
        </section>
      ))}
      <h2 className="mt-12 mb-3">
        <span className="text-3xl font-semibold">Other apps</span>
        <span className="ml-2 text-sm text-gray-500">{runningProjects.length} projects</span>
      </h2>
      <p className="mb-6 max-w-prose">
        This page lists all the projects that are currently running in Docker. These projects are not part of the app library but are running on the system.
      </p>
      {runningProjects.map((project) => (
        <section key={project.key} className={clsx(
          'mb-6 px-2 rounded-lg relative',
          'shadow-none hover:bg-red-50/50 hover:shadow hover:shadow-pink-100 transition-all'
        )}>
          <Link to={`/library/${project.key}`} className="absolute inset-0">
            <span className="sr-only">{project.key}</span>
          </Link>
          <h3 className="border-b mb-2 pt-1 pb-2 px-1.5">
            <p className="text-xl font-bold"> {project.key} </p>
            <p className="text-sm text-gray-500"> {project.folder} </p>
          </h3>
          <ul className="py-2 flex flex-wrap justify-start gap-4">
            {project.ymlFiles.map(({ path, meta }) => {
              const { State, Status } = containerServiceMap[meta?.serviceKey] || {}
              return (
                <AppCard
                  key={`${project.key}?service=${meta?.serviceKey}`}
                  link={`/library/${project.key}?service=${meta?.serviceKey}`}
                  title={meta?.title || path}
                  logo={meta?.logo || ''}
                  state={State}
                  status={Status}
                  enabled={meta?.enabled}
                />
              )
            })}
          </ul>
        </section>
      ))}
      <div className="pb-12"></div>
    </Layout>
  )
}
