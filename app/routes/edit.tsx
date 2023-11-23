import { ArrowLeftIcon } from "@heroicons/react/20/solid"
import { redirect, type ActionArgs, type LoaderArgs } from "@remix-run/node"
import { Form, useFetcher, useLoaderData, useNavigate, useNavigation } from "@remix-run/react"
import clsx from "clsx"
import { useEffect, useMemo, useState } from "react"
import YAML from 'yaml'
import Logo from "~/components/Logo"
import Layout from "~/components/layout"
import type { ComposeJSON, XSundash } from "~/lib/apps"
import { getApp, saveApp } from "~/lib/apps"
import { getComposeTemplate, getTemplate } from "~/lib/appstore"
import { checkNetworkExists, readComposeFile } from "~/lib/docker.server"
import { addProxyConfig, editComposeForSundash } from "~/lib/editor"
import env from "~/lib/env.server"
import { buttonCN, inputCN } from "~/lib/styles"

const blankApp = {
  name: 'app',
  title: 'new app',
  key: 'app',
  logo: '',
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
    env,
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
    env,
  } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const [text, setText] = useState(composeYaml)
  const composeJSON = useMemo(() => tryParseYaml(text), [text])
  const serviceKeys = Object.keys(composeJSON.services || {})

  const title = composeJSON['x-sundash']?.title || app.title
  const logo = composeJSON['x-sundash']?.logo || app.logo
  const service = composeJSON['x-sundash']?.service || app.key || serviceKeys[0]
  const hasAuth = composeJSON['x-sundash']?.hasAuth || !!composeJSON.services?.[service]?.labels?.['caddy.authorize']

  const transition = useNavigation()
  const busy = transition.state !== 'idle'

  useEffect(() => {
    // if service is not one of serviceKeys, set it to the first one
    if (serviceKeys.length && !serviceKeys.includes(service)) {
      updateXSundash({ service: serviceKeys[0] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceKeys, service])

  function resetForm() {
    setText(composeYaml)
  }

  function updateXSundash(config: Partial<XSundash>) {
    const newConfig = { title, logo, service, hasAuth, ...config }
    const newJSON = editComposeForSundash(composeJSON, newConfig)
    const newYaml = YAML.stringify(newJSON)
    setText(newYaml.replace(/\n(\w)/g, '\n\n$1'))
  }

  function applyProxyConfig() {
    const config = { title, logo, service, hasAuth }
    const newJSON = addProxyConfig(composeJSON, config, env)
    const newYaml = YAML.stringify(newJSON)
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
          <p className="text-xl">Here you can edit and review your docker compose template before deploying it to your server.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-6 mt-6 mb-3">
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
            <button onClick={applyProxyConfig} className={clsx(buttonCN.small, buttonCN.outline)}>
              Add proxy configuration
            </button>
          </div>
        </div>
        <Form method="POST" className="flex-grow mt-6">
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
