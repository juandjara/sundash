import Layout from "~/components/layout"
import { Form, useLoaderData, useNavigate } from "@remix-run/react"
import type { LoaderArgs } from "@remix-run/node"
import { getComposeTemplate, getTemplate } from "~/lib/appstore"
import { buttonCN, inputCN } from "~/lib/styles"
import clsx from "clsx"
import { ArrowLeftIcon } from "@heroicons/react/20/solid"
import YAML from 'yaml'
import { useState } from "react"

export async function loader({ request }: LoaderArgs) {
  const query = new URL(request.url).searchParams.get('q') || ''
  const category = new URL(request.url).searchParams.get('category') || ''
  const open = Number(new URL(request.url).searchParams.get('open') || '-1')
  const app = await getTemplate({ query, category, open })

  if (!app) {
    throw new Response('App not found', { status: 404, statusText: 'Not found' })
  }

  return {
    app,
    composeFile: await getComposeTemplate(app)
  }
}

export default function TemplateEditor() {
  const { app, composeFile } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const [text, setText] = useState(composeFile.text)

  function exposeURL(protectedURL: boolean = true) {
    const json = composeFile.json
    const port = window.prompt('Which port do you want to expose?', '80')
    if (Number.isNaN(port || NaN)) {
      return
    }
    const url = window.prompt('Which URL do you want to expose?', 'example.com')
    if (!url) {
      return
    }

    for (const key of Object.keys(json.services)) {
      // add proxy network
      json.services[key].networks = json.services[key].networks || []
      if (!json.services[key].networks.includes('web')) {
        json.services[key].networks.push('web')
      }

      // add caddy labels
      json.services[key].labels = json.services[key].labels || {}
      json.services[key].labels['caddy'] = url
      if (protectedURL) {
        json.services[key].labels['caddy.authorize'] = '"with auth_policy"'
      }
      json.services[key].labels['caddy.reverse_proxy'] = `{{upstreams ${port}}}`
    }

    // ensure external network is defined
    json.networks = json.networks || {}
    json.networks.web = {
      external: true
    }

    setText(YAML.stringify(json))
  }

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
      <div className="flex items-center gap-2 pb-6">
        <button onClick={() => exposeURL(true)} className={clsx(buttonCN.small, buttonCN.primary)}>Expose Protected URL</button>
        <button onClick={() => exposeURL(false)} className={clsx(buttonCN.small, buttonCN.primary)}>Expose Public URL</button>
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
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </Form>
    </Layout>
  )
}
