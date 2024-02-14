import Layout from "~/components/layout"
import { readConfigFolder } from "~/lib/library.server"

export async function loader() {
  const projects = await readConfigFolder()
  return { projects }
}

export default function Library() {
  return (
    <Layout>
      <h2 className="text-3xl font-semibold flex-grow mb-1">
        App Library
      </h2>
    </Layout>
  )
}
