import { redirect, type LoaderArgs } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import Layout from "~/components/layout"
import { getPS, getProject } from "~/lib/projects.server"
import { withRedis } from "~/lib/db.server"

export async function loader({ params }: LoaderArgs) {
  const id = params.project
  const projectPath = id && await withRedis((db) => db.get(`project:${id}`))
  
  if (!projectPath) {
    return redirect('/404')
  }

  const [ps, project] = await Promise.all([
    getPS(projectPath),
    getProject(projectPath),
  ])

  return { ps, project }
}

export default function Project() {
  const data = useLoaderData<typeof loader>()
  console.log(data)

  return (
    <Layout>
    </Layout>
  )
}
