import Layout from "~/components/layout"
import { Form, useLoaderData, useNavigate } from "@remix-run/react"
import type { DockerVolume, Template } from "~/lib/appstore.type"
import type { LoaderArgs } from "@remix-run/node"
import { getTemplates } from "~/lib/appstore"
import { buttonCN, inputCN } from "~/lib/styles"
import clsx from "clsx"
import { getEnvComment } from "~/components/AppDetail"
import { ArrowLeftIcon } from "@heroicons/react/20/solid"

export async function loader({ request }: LoaderArgs) {
  const query = new URL(request.url).searchParams.get('q') || ''
  const category = new URL(request.url).searchParams.get('category') || ''
  const templates = await getTemplates({ query, category })
  const open = Number(new URL(request.url).searchParams.get('open') || '-1')
  const app = templates[open]
  return {
    app,
    composeFile: await getComposeTemplate(app)
  }
}

export default function TemplateEditor() {
  const { app, composeFile } = useLoaderData<typeof loader>()
  const navigate = useNavigate()

  if (!app) {
    return null
  }

  return (
    <Layout>
      <button onClick={() => navigate(-1)} className={clsx('block w-min mb-2', buttonCN.normal, buttonCN.icon, buttonCN.transparent)}>
        <ArrowLeftIcon className='w-5 h-5' />
      </button>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-1">Install new app</h2>
        <p className="text-xl">Edit this docker compose template and deploy it on your server.</p>
      </div>
      <Form className="space-y-4">
        <div>
          <label className="text-zinc-500 mb-1 block" htmlFor="name">Compose File</label>
          <input
            className={clsx('bg-zinc-50 px-2 py-1', inputCN)}
            type="text"
            name="name"
            id="name"
            defaultValue={`${app.name || app.title}.yml`}
          />
        </div>
        <div>
          <textarea
            className={clsx('h-[500px] bg-zinc-50 font-mono p-3', inputCN)}
            name="compose"
            id="compose"
            defaultValue={composeFile} 
          />
        </div>
      </Form>
    </Layout>
  )
}

async function getComposeTemplate(app: Template) {
  if (app.type !== 1) {
    return await fetchRemoteCompose(app)
  }

  const ports = app.ports?.map((p) => `\n      - ${p}`).join('')
  const volumes = app.volumes?.map((v) => `\n      - ${formatVolume(v)}`).join('')
  let env = ''
  for (const e of app.env || []) {
    const comment = getEnvComment(e)
    const commentFragment = comment ? `# ${comment}` : ''
    env += `\n      - ${e.name}=${e.default || ''} ${commentFragment}`
  }

  return `version: '3.3'
services:
  ${app.name || app.title}:
    image: ${app.image}
    restart: ${app.restart_policy || 'unless-stopped'}
    ports:${ports}
    volumes:${volumes}
    environment:${env}
`
}

function formatVolume(volume: DockerVolume) {
  let fragment = volume.container
  if (volume.bind) {
    fragment = `${volume.bind}:${volume.container}`
  }
  if (volume.readonly) {
    fragment = `${fragment}:ro`
  }
  return fragment
}

async function fetchRemoteCompose(app: Template) {
  const branch = 'master'
  const url = `${app.repository?.url}/blob/${branch}/${app.repository?.stackfile}?raw=true`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch compose file from ${url}`)
  }

  return await res.text()
}
