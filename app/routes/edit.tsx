import { ArrowLeftIcon } from "@heroicons/react/20/solid"
import { redirect, type ActionArgs, type LoaderArgs } from "@remix-run/node"
import { Form, Link, useFetcher, useLoaderData, useNavigate, useNavigation } from "@remix-run/react"
import clsx from "clsx"
import { useEffect, useMemo, useRef, useState } from "react"
import YAML from 'yaml'
import Logo from "~/components/Logo"
import Layout from "~/components/layout"
import type { ComposeJSON} from "~/lib/apps"
import { getApp, saveApp } from "~/lib/apps"
import { getComposeTemplate, getTemplate } from "~/lib/appstore"
import { checkNetworkExists, readComposeFile } from "~/lib/docker.server"
import { editComposeForProxy, editComposeForSundash } from "~/lib/editor"
import env from "~/lib/env.server"
import { buttonCN, inputCN } from "~/lib/styles"

const blankApp = {
  name: 'app',
  title: 'new app',
  logo: '',
  description: '',
  category: '',
}

const blankYaml = `version: '3'
services:
  app:
    restart: unless-stopped
    ports:
    - 80:80
`

export async function loader({ request }: LoaderArgs) {
  const source = new URL(request.url).searchParams.get('source') || '' as 'appstore' | 'file' | 'new'
  const networkExists = await checkNetworkExists(env.dockerProxyNetwork)

  const base = {
    source,
    networkExists,
    proxyNetwork: env.dockerProxyNetwork,
    baseAppsDomain: env.baseAppsDomain,
  }

  if (source === 'appstore') {
    const query = new URL(request.url).searchParams.get('q') || ''
    const category = new URL(request.url).searchParams.get('category') || ''
    const open = Number(new URL(request.url).searchParams.get('open') || '-1')
    const app = await getTemplate({ query, category, open })
  
    if (!app) {
      throw new Response('App not found', { status: 404, statusText: 'Not found' })
    }
  
    return {
      ...base,
      app,
      composeYaml: await getComposeTemplate(app),
    }
  }
  if (source === 'file') {
    const filename = new URL(request.url).searchParams.get('filename') || ''
    const yaml = await readComposeFile(filename)
    const app = await getApp(filename, yaml)
    return {
      ...base,
      app,
      composeYaml: yaml,
    }
  }

  return {
    ...base,
    app: blankApp,
    composeYaml: blankYaml,
  }
}

export async function action({ request }: ActionArgs) {
  const fd = await request.formData()
  const name = fd.get('name') as string
  const compose = fd.get('compose') as string
  const fullName = name.endsWith('.yml') ? name : `${name}.yml`
  await saveApp({ name: fullName, compose })
  return redirect(`/apps/${fullName}`)
}

function tryParseYaml(yaml: string) {
  try {
    return YAML.parse(yaml) as ComposeJSON
  } catch (e) {
    return {
      services: {}
    }
  }
}

export default function TemplateEditor() {
  const {
    app,
    composeYaml,
    source,
    networkExists,
    proxyNetwork,
    baseAppsDomain
  } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const [text, setText] = useState(composeYaml)
  const composeJSON = useMemo(() => tryParseYaml(text), [text])
  const formRef = useRef<HTMLFormElement>(null)
  const [logo, setLogo] = useState(app.logo)
  const [proxyEnabled, setProxyEnabled] = useState(() => getDefaults().proxyEnabled)
  const transition = useNavigation()
  const busy = transition.state !== 'idle'

  useEffect(() => {
    if (formRef.current) {
      updateComposeFile({
        preventDefault: () => {},
        currentTarget: formRef.current,
        target: formRef.current,
      } as any)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetForm() {
    setText(composeYaml)
  }

  function getDefaults() {
    const xsundash = composeJSON["x-sundash"]
    const key = xsundash?.service || Object.keys(composeJSON.services)[0]
    const service = composeJSON.services[key] || {}
    let port = xsundash?.port
    if (!port) {
      const firstPort = String(service.ports?.[0]) || ''
      const portParts = firstPort.split(':')
      port = portParts?.length ? Number(portParts[portParts.length - 1].replace('/tcp', '').replace('/udp', '')) : undefined
    }
    const url = xsundash?.url || `${app.name}.${baseAppsDomain}`
    const proxyEnabled = xsundash?.proxyEnabled || !!service.labels?.['caddy']
    const authEnabled = xsundash?.hasAuth || !!service.labels?.['caddy.authorize']
    
    return { port, url, service: key, proxyEnabled, authEnabled }
  }

  function updateComposeFile(ev: React.FormEvent<HTMLFormElement> | React.FocusEvent<HTMLFormElement>) {
    ev.preventDefault()
    const fd = new FormData(ev.currentTarget)
    const xsundash = {
      title: fd.get('title') as string,
      logo: fd.get('logoURL') as string,
      proxyEnabled: fd.get('proxyEnabled') === 'on',
      hasAuth: fd.get('hasAuth') === 'on',
      service: fd.get('service') as string,
      port: Number(fd.get('port') || NaN),
      url: fd.get('url') as string,
    }

    const withSundashConfig = editComposeForSundash(composeJSON, xsundash)
    const withProxyConfig = editComposeForProxy(withSundashConfig, {
      ...xsundash,
      proxyNetwork,
    })

    const newYaml = YAML.stringify(withProxyConfig)
    setText(newYaml.replace(/\n(\w)/g, '\n\n$1'))
  }

  const createNetworkFetcher = useFetcher()

  function createNetwork() {
    createNetworkFetcher.submit({}, {
      method: 'POST',
      action: '/api/create-network',
      encType: 'application/json',
    })
  }

  if (!app) {
    return null
  }

  const selectOptions = Object.keys(composeJSON.services).map((service) => {
    return (
      <option key={service} value={service}>{service}</option>
    )
  })

  return (
    <Layout>
      <div className="md:flex items-start gap-2">
        <button onClick={() => navigate(-1)} className={clsx('block w-min mb-2', buttonCN.normal, buttonCN.icon, buttonCN.transparent)}>
          <ArrowLeftIcon className='w-5 h-5' />
        </button>
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-1">
            {source === 'file' ? 'Edit' : 'Install'}{' '}{app.title || app.name}
          </h2>
          <p className="text-xl">Edit this docker compose template and deploy it on your server.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-6 mt-6 mb-3">
        <form
          onSubmit={updateComposeFile}
          onBlur={updateComposeFile}
          className="max-w-md w-full"
          ref={formRef}
        >
          <div className="mb-6">
            <label className="text-zinc-500 mb-1 block">Title</label>
            <input 
              className={clsx('bg-zinc-50 px-2 py-1', inputCN)}
              type="text"
              name="title"
              id="title"
              defaultValue={app.title}
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
                onChange={(e) => setLogo(e.target.value)}
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
          <p className="mt-8 text-lg">Expose configuration</p>
          <hr className="mt-2 mb-3" />
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
          <fieldset aria-disabled={!networkExists} className="aria-disabled:opacity-50 aria-disabled:pointer-events-none">            
            <div className="mb-6">
              <label className="text-zinc-500 flex items-center" htmlFor="proxyEnabled">
                <input
                  type="checkbox"
                  name="proxyEnabled"
                  id="proxyEnabled"
                  className="mr-2"
                  checked={proxyEnabled}
                  onChange={(e) => setProxyEnabled(e.target.checked)}
                />
                <span>Expose App</span>
              </label>
            </div>
          </fieldset>
          <fieldset aria-disabled={!proxyEnabled} className="aria-disabled:opacity-50 aria-disabled:pointer-events-none">
            <div className="mb-6">
              <label className="text-zinc-500 flex items-center" htmlFor="hasAuth">
                <input
                  type="checkbox"
                  name="hasAuth"
                  id="hasAuth"
                  className="mr-2"
                  defaultChecked={getDefaults().authEnabled}
                />
                <span>Exposed App requires authentication</span>
              </label>
            </div>
            <div className="mb-6">
              <label className="text-zinc-500 mb-1 block" htmlFor="service">
                Select a compose service
              </label>
              <select className={clsx('bg-zinc-50 p-[6px]', inputCN)} name="service" id="service" required>
                {selectOptions}
              </select>
            </div>
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
                defaultValue={getDefaults().port}
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
                required
                placeholder={`app.${baseAppsDomain}`}
                defaultValue={getDefaults().url}
              />
            </div>
          </fieldset>
        </form>
        <Form method="POST" className="flex-grow">
          <div className="mb-5">
            <label className="text-zinc-500 mb-1 block" htmlFor="name">Compose file</label>
            <input
              className={clsx('bg-zinc-50 px-2 py-1', inputCN)}
              type="text"
              name="name"
              id="name"
              defaultValue={`${app.name || app.title}.yml`}
            />
            <p className="text-xs mt-2 text-zinc-600">
              This will create a file with this name in your <Link className="underline" to='/config'>config directory</Link>.
            </p>
          </div>
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
              {source === 'file' ? 'Save' : 'Deploy'}
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
        </Form>
      </div>
    </Layout>
  )
}
