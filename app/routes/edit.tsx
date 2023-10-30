import Layout from "~/components/layout"
import { Form, useLoaderData, useNavigate } from "@remix-run/react"
import type { LoaderArgs } from "@remix-run/node"
import { editComposeForProxy, getComposeTemplate, getTemplate } from "~/lib/appstore"
import { buttonCN, inputCN } from "~/lib/styles"
import clsx from "clsx"
import { ArrowLeftIcon } from "@heroicons/react/20/solid"
import YAML from 'yaml'
import { useState } from "react"
import Modal from "~/components/Modal"

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
  const [modalOpen, setModalOpen] = useState(false)

  function addProxyConfig(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const fd = new FormData(ev.currentTarget)
    const hasAuth = fd.get('hasAuth') === 'on'
    const url = fd.get('url') as string
    const port = Number(fd.get('port') || NaN)

    const editedJson = editComposeForProxy(composeFile.json, {
      port,
      url,
      hasAuth
    })

    setText(YAML.stringify(editedJson))
    setModalOpen(false)
  }

  function resetForm() {
    setText(composeFile.text)
  }

  if (!app) {
    return null
  }

  return (
    <Layout>
      {modalOpen && (
        <Modal open onClose={() => setModalOpen(false)} title='Add proxy URL configuration'>
          <form className="mt-6" onSubmit={addProxyConfig}>
            <div className="mb-6">
              <label className="text-zinc-500 mb-1 block" htmlFor="port">
                Internal container port
              </label>
              <input
                className={clsx('bg-zinc-50 px-2 py-1', inputCN)}
                type="number"
                name="port"
                id="port"
                placeholder="80"
                required
              />
            </div>
            <div className="mb-6">
              <label className="text-zinc-500 mb-1 block" htmlFor="url">
                Exposed URL
              </label>
              <input
                className={clsx('bg-zinc-50 px-2 py-1', inputCN)}
                type="url"
                name="url"
                id="url"
                placeholder="example.com"
                required
              />
            </div>
            <div className="mb-6">
              <label className="text-zinc-500 flex items-center" htmlFor="hasAuth">
                <input
                  type="checkbox"
                  name="hasAuth"
                  id="hasAuth"
                  className="mr-2"
                  defaultChecked
                />
                <span>Proxy URL requires authentication</span>
              </label>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <button type="submit" className={clsx(buttonCN.normal, buttonCN.primary)}>Add</button>
              <button type="button" onClick={() => setModalOpen(false)} className={clsx(buttonCN.normal, buttonCN.delete)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
      <div className="md:flex items-start gap-2">
        <button onClick={() => navigate(-1)} className={clsx('block w-min mb-2', buttonCN.normal, buttonCN.icon, buttonCN.transparent)}>
          <ArrowLeftIcon className='w-5 h-5' />
        </button>
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-1">Install new app</h2>
          <p className="text-xl">Edit this docker compose template and deploy it on your server.</p>
        </div>
      </div>
      <Form method="POST">
        <div className="mb-4">
          <label className="text-zinc-500 mb-1 block" htmlFor="name">Compose File</label>
          <input
            className={clsx('bg-zinc-50 px-2 py-1', inputCN)}
            type="text"
            name="name"
            id="name"
            defaultValue={`${app.name || app.title}.yml`}
          />
        </div>
        <div className="flex items-center gap-2 mt-6">
          <button type="button" onClick={() => setModalOpen(true)} className={clsx(buttonCN.small, buttonCN.outline)}>
            Add proxy URL configuration
          </button>
          <button type="button" onClick={resetForm} className={clsx(buttonCN.small, buttonCN.transparent)}>
            Reset
          </button>
        </div>
        <div className="my-3">
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
        <div className="flex items-center gap-2">
          <button type="submit" className={clsx(buttonCN.normal, buttonCN.primary)}>Deploy</button>
          <button type="button" onClick={() => navigate(-1)} className={clsx(buttonCN.normal, buttonCN.delete)}>Cancel</button>
        </div>
      </Form>
    </Layout>
  )
}
