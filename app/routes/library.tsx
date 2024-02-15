import { useLoaderData } from "@remix-run/react"
import AppCard from "~/components/AppCard"
import Layout from "~/components/layout"
import { getAllContainers } from "~/lib/docker.server"
import { ComposeLabels } from "~/lib/docker.util"
import { type LibraryProject, readConfigFolder } from "~/lib/library.server"

export async function loader() {
  const [libraryProjects, containers] = await Promise.all([
    readConfigFolder(),
    getAllContainers()
  ])
  return { libraryProjects, containers }
}

export default function Library() {
  const { libraryProjects, containers } = useLoaderData<typeof loader>()

  function getContainerForService(service?: string) {
    const container = containers.find((c) => c.Labels[ComposeLabels.SERVICE] === service)
    return container
  }

  function formatFolder(project: LibraryProject) {
    const folder = project.folder.startsWith('.') ? project.folder : `./${project.folder}`
    if (project.ymlFiles.length === 1) {
      return `${folder}/${project.ymlFiles[0].path}`
    }
    return `${folder} - ${project.ymlFiles.length} apps`
  }

  return (
    <Layout>
      <h2 className="mb-3">
        <span className="text-3xl font-semibold">App Library</span>
        <span className="ml-2 text-sm text-gray-500">{libraryProjects.length} projects</span>
      </h2>
      <div className="mb-6 max-w-prose">
        <p className="mb-2">
          This page lists all the projects in the app library. Each project is a folder in the <code>config</code> directory that contains a <code>.env</code> file and one or more <code>.yml</code> files. Each <code>.yml</code> file is a Docker Compose file that defines a set of services.
        </p>
        <p>
          Each <code>.yml</code> file not associated with a <code>.env</code> file is shown as a standalone project.
        </p>
      </div>
      {libraryProjects.map((project) => (
        <section key={project.folder} className="mb-6">
          <a href={`/library/${project.key}`}>
            <h3 className="border-b mb-2 pt-1 pb-2 px-1.5 hover:bg-gray-100/75 transition-colors rounded-t-lg">
              <p className="text-xl font-bold"> {project.key} </p>
              <p className="text-sm text-gray-500"> {formatFolder(project)} </p>
            </h3>
          </a>
          <ul className="py-2 flex flex-wrap justify-start gap-4">
            {project.ymlFiles.map(({ path, content, extra }) => {
              const { State, Status } = getContainerForService(extra?.serviceKey) || {}
              return (
                <AppCard
                  key={path}
                  link={`/library/${project.key}/${path}`}
                  title={extra?.title || path}
                  logo={extra?.logo || ''}
                  state={State}
                  status={Status}
                />
              )
            })}
          </ul>
        </section>
      ))}
    </Layout>
  )
}
