import { ArrowLeftIcon } from "@heroicons/react/20/solid"
import type { LoaderArgs } from "@remix-run/node"
import { useNavigate, useParams } from "@remix-run/react"
import clsx from "clsx"
import Layout from "~/components/layout"
import { buttonCN } from "~/lib/styles"

export async function loader({ request, params }: LoaderArgs) {  
  return { project: params.project, file: params['*'] }
}

export default function EditFile() {
  const params = useParams()
  const project = params.project
  const file = params['*']

  const navigate = useNavigate()

  return (
    <Layout>
      <div className="md:flex items-start gap-2">
        <button onClick={() => navigate(-1)} className={clsx('block w-min mb-2', buttonCN.normal, buttonCN.icon, buttonCN.transparent)}>
          <ArrowLeftIcon className='w-5 h-5' />
        </button>
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-1">
            Edit {project}/{file}
          </h2>
          <p className="text-xl">
            Here you can edit and review your docker compose template before deploying it to your server.
          </p>
        </div>
      </div>
      {/* <Form method="POST" className="flex flex-wrap items-start gap-6 mt-6 mb-3">
        <input type="hidden" name="projectKey" value={project} />
        <input type="hidden" name="file" value={file} />
        <div className="max-w-md w-full">
          <div className="mb-6">
            <label className="text-zinc-500 mb-1 block">Title</label>
            <input 
              className={clsx('bg-zinc-50 px-2 py-1', inputCN)}
              type="text"
              name="title"
              id="title"
              value={title}
              onChange={(e) => updateXSundash({ title: e.target.value })}
              required
            />
          </div>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex-grow">
              <label className="text-zinc-500 mb-1 block">Logo URL</label>
              <input 
                className={clsx('bg-zinc-50 px-2 py-1', inputCN)}
                type="url"
                name="logoURL"
                id="logoURL"
                value={logo}
                onChange={(e) => updateXSundash({ logo: e.target.value })}
              />
            </div>
            <Logo
              src={logo}
              alt='app logo'
              width="64"
              height="64"
              className="w-16 h-16 block object-contain rounded-full shadow shadow-pink-200 p-0.5"
            />
          </div>
          <p className="mt-8 text-lg mb-3 ml-1">Proxy configuration</p>
          <div className="p-3 rounded-md border border-zinc-300">
            {!networkExists && (
              <div className="mb-6 text-sm">
                Proxy network <strong>web</strong> does not exist
                <button
                  type="button"
                  onClick={createNetwork}
                  aria-disabled={createNetworkFetcher.state !== 'idle'}
                  className={clsx('ml-2', buttonCN.small, buttonCN.transparent)}
                >
                  {createNetworkFetcher.state === 'idle' ? 'Create network' : 'Creating...'}
                </button>
              </div>
            )}
            <div className="mb-6">
              <label className="text-zinc-500 mb-1 block" htmlFor="service">
                Select a compose service to proxy
              </label>
              <select
                className={clsx('bg-zinc-50 p-[6px]', inputCN)}
                name="service"
                id="service"
                required
                value={service}
                onChange={(e) => updateXSundash({ service: e.target.value })}
              >
                {serviceKeys.length === 0 && (
                  <option value="">No services found</option>
                )}
                {serviceKeys.map((key) => <option key={key} value={key}>{key}</option>)}
              </select>
            </div>
            <div className="mb-6">
              <label className="text-zinc-500 flex items-center" htmlFor="hasAuth">
                <input
                  type="checkbox"
                  name="hasAuth"
                  id="hasAuth"
                  className="mr-2"
                  checked={hasAuth}
                  onChange={(e) => updateXSundash({ hasAuth: e.target.checked })}
                />
                <span>Protect with authentication</span>
              </label>
            </div>
            <button type="button" onClick={applyProxyConfig} className={clsx(buttonCN.small, buttonCN.outline)}>
              Add proxy configuration
            </button>
          </div>
        </div>
        <div className="flex-grow mt-6">
          <div className="mb-4">
            <textarea
              className={clsx('h-[500px] bg-zinc-50 font-mono p-3', inputCN)}
              name="compose"
              id="compose"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoComplete="off"
              spellCheck="false"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              aria-disabled={busy}
              className={clsx(buttonCN.normal, buttonCN.primary)}
            >
              Save
            </button>
            <button
              type="button"
              aria-disabled={busy}
              onClick={resetForm}
              className={clsx(buttonCN.normal, buttonCN.transparent)}
            >
              Reset
            </button>
            <div className="flex-grow"></div>
            <button type="button" onClick={() => navigate(-1)} className={clsx(buttonCN.normal, buttonCN.delete)}>Cancel</button>
          </div>
        </div>
      </Form> */}
    </Layout>
  )
}
