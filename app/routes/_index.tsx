import { json, type ActionArgs, type V2_MetaFunction } from "@remix-run/node"
import { useFetcher, useLoaderData } from "@remix-run/react"
import clsx from "clsx"
import { withRedis } from "~/lib/db.server"
import { buttonCN } from "~/lib/styles"
import { v2 as compose } from 'docker-compose'
import type { MouseEvent } from "react"
import Layout from "~/components/layout"
import { getProjects } from "~/lib/projects.server"

export const meta: V2_MetaFunction = () => [{ title: "SunDASH" }]

export async function loader() {
  return getProjects()
}

export async function action({ request }: ActionArgs) {
  const body = await request.formData()
  const path = body.get('path')

  if (typeof path !== 'string') {
    return new Response(`Invalid project path "${path}"`, { status: 400 })
  }

  try {
    const res = await compose.config({
      cwd: path,
      commandOptions: ['--no-interpolate'],
    })
    const name = (res.data.config as any).name as string

    await withRedis((db) => {
      return Promise.all([
        db.sadd('projects', name),
        db.set(`project:${name}`, path)
      ])
    })
    return json({ error: null, path, name })
  } catch (err: any) {
    if (err.exitCode) {
      const message = `Error code ${err.exitCode}: ${err.err}`
      return json({ error: message })
    }
    return json({ error: err.message })
  }
}

export default function Index() {
  const projects = useLoaderData<typeof loader>()
  const fetcher = useFetcher()
  const error = fetcher.data?.error

  function createProject(ev: MouseEvent<HTMLButtonElement>) {
    const path = window.prompt('Enter new project path')
    if (path) {
      ev.currentTarget.value = path
    } else {
      ev.preventDefault()
    }
  }

  return (
    <Layout>
      {error && (
        <div className="rounded-md bg-red-50 p-3 mb-4 mt-2">
          <p className="text-red-800 font-bold">Error creating new project:</p>
          <p className="text-red-600 text-lg">{error}</p>
        </div>
      )}
      <div className="flex items-center gap-4">
        <p className="text-2xl font-semibold flex-grow">Projects</p>
        <fetcher.Form method="POST" replace className="flex-grow-0">
          <button name="path" onClick={createProject} className={clsx(buttonCN.primary, buttonCN.normal)}>
            New project
          </button>
        </fetcher.Form>
      </div>
      <ul>
        {projects.map((project, idx) => (
          <li className="py-4" key={idx}>
            <a className="py-2 block" href={`/projects/${project.name}`}>{project.name}</a>
            <hr className="block" />
            <ul className="py-2">
            {Object.entries(project.services).map((entry) => (
              <li className="px-3 py-2 hover:bg-zinc-100 rounded-md" key={entry[0]}>
                <a className="block" href={`/projects/${project.name}/${entry[0]}`}>{entry[0]}</a>
              </li>
            ))}
            </ul>
          </li>
        ))}
      </ul>
    </Layout>
  )
}
