import { redirect, type ActionArgs } from "@remix-run/node"
import { createProject, saveFile } from "~/lib/compose.server"

export async function action({ request }: ActionArgs) {
  const data = await request.json()
  const name = data.name as string
  
  if (!name) {
    throw new Response('name param is required in form data', { status: 400 })
  }

  const slug = name.toLowerCase()
    .replace(/\s/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  try {
    await createProject(slug)
    await saveFile({
      compose: '',
      filePath: '.env',
      projectFolder: slug,
    })
  } catch (err) {
    if (err instanceof Error) {
      throw new Response(err.message, { status: 500 })
    }
    throw err
  }

  throw redirect(`/library/${slug}`)
}
