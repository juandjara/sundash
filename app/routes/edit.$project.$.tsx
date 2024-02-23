import { AdjustmentsVerticalIcon, ArrowLeftIcon } from "@heroicons/react/20/solid"
import type { LoaderArgs } from "@remix-run/node"
import { Form, useFetcher, useLoaderData, useNavigate, useNavigation } from "@remix-run/react"
import clsx from "clsx"
import Logo from "~/components/Logo"
import Layout from "~/components/layout"
import { checkNetworkExists } from "~/lib/docker.server"
import env from "~/lib/env.server"
import { readConfigFolder } from "~/lib/library.server"
import { buttonCN, inputCN } from "~/lib/styles"
import YAML from 'yaml'
import { Fragment, useState } from "react"
import { Transition } from "@headlessui/react"
import { applyProxyConfig, getEditorData } from "~/lib/editor.util"

export async function loader({ request, params }: LoaderArgs) {
  const key = params.project
  const filePath = params['*']
  const library = await readConfigFolder()
  const project = library.find((l) => l.key === key)

  if (!project) {
    throw new Response(`Project ${key} not found`, { status: 404 })
  }

  const file = project.ymlFiles.find((y) => y.path === filePath)
  if (!file) {
    throw new Response(`File ${filePath} not found`, { status: 404 })
  }

  const networkExists = await checkNetworkExists(env.dockerProxyNetwork)

  return {
    key,
    folder: project.folder,
    file: {
      path: file.path,
      text: YAML.stringify(file.content),
    },
    networkExists,
    editorEnv: {
      dockerProxyNetwork: env.dockerProxyNetwork,
      baseAppsDomain: env.baseAppsDomain,
      authorizeConfig: env.authorizeConfig,
    },
  }
}

function LabelEditor({ text, onClose, onConfirm }: {
  text: string
  onClose: () => void
  onConfirm: (newText: string) => void
}) {
  const { editorEnv, networkExists } = useLoaderData<typeof loader>()
  const [data, setData] = useState(() => getEditorData(text))
  const { serviceKeys, service, title, logo, hasAuth } = data

  const createNetworkFetcher = useFetcher()
  function createNetwork() {
    createNetworkFetcher.submit({}, {
      method: 'POST',
      action: '/api/create-network',
      encType: 'application/json',
    })
  }

  function update(newData: Partial<typeof data>) {
    setData((prevData) => ({ ...prevData, ...newData }))
  }

  function applyConfig() {
    const newText = applyProxyConfig(text, editorEnv, data)
    if (newText && newText !== text) {
      onConfirm(newText)
    }
  }

  return (
    <div className="py-4 px-3 max-w-md w-full h-full bg-white rounded-l-md">
      <div className="mb-6">
        <label className="text-zinc-500 mb-1 block">Title</label>
        <input 
          className={clsx('bg-zinc-50 px-2 py-1', inputCN)}
          type="text"
          name="title"
          id="title"
          value={title}
          onChange={(e) => update({ title: e.target.value })}
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
            onChange={(e) => update({ logo: e.target.value })}
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
      <div className="mb-4">
        <label className="text-zinc-500 mb-1 block" htmlFor="service">
          Select a compose service to proxy
        </label>
        <select
          className={clsx('bg-zinc-50 p-[6px]', inputCN)}
          name="service"
          id="service"
          required
          value={service}
          onChange={(e) => update({ service: e.target.value })}
        >
          {serviceKeys.length === 0 && (
            <option value="">No services found</option>
          )}
          {serviceKeys.map((key) => <option key={key} value={key}>{key}</option>)}
        </select>
      </div>
      <div className="mb-6">
        <label className="text-zinc-500 mx-1 flex items-center" htmlFor="hasAuth">
          <input
            type="checkbox"
            name="hasAuth"
            id="hasAuth"
            className="mr-2"
            checked={hasAuth}
            onChange={(e) => update({ hasAuth: e.target.checked })}
          />
          <span>Protect with authentication</span>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={applyConfig}
          className={clsx(buttonCN.small, buttonCN.primary)}
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onClose}
          className={clsx(buttonCN.small, buttonCN.transparent)}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function EditFile() {
  const { folder, file, key } = useLoaderData<typeof loader>()
  const [text, setText] = useState(file.text)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navigate = useNavigate()

  const transition = useNavigation()
  const busy = transition.state !== 'idle'

  function resetForm() {
    setText(file.text)
  }

  const editorDialog = (
    <Transition
      show={drawerOpen}
      className="absolute inset-0 z-50 overflow-hidden rounded-md" 
    >
      <Transition.Child
        as={Fragment}
        enter="transition-opacity ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity ease-linear duration-300"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div
          aria-label="Hide edition menu"
          onClick={() => setDrawerOpen(false)}
          className="absolute inset-0 bg-gray-500 bg-opacity-50 transition-opacity"
        ></div>
      </Transition.Child>
      <section className="absolute inset-y-0 left-0 max-w-full flex">
        <Transition.Child
          className="border border-gray-300"
          enter="transition ease-in-out duration-300 transform"
          enterFrom="-translate-x-full"
          enterTo="translate-x-0"
          leave="transition ease-in-out duration-300 transform"
          leaveFrom="translate-x-0"
          leaveTo="-translate-x-full"
        >
          <LabelEditor
            text={text}
            onClose={() => setDrawerOpen(false)}
            onConfirm={(newText) => {
              setText(newText)
              setDrawerOpen(false)
            }}
          />
        </Transition.Child>
      </section>
    </Transition>
  )

  return (
    <Layout>
      <div className="md:flex items-start gap-2">
        <button onClick={() => navigate(-1)} className={clsx('block w-min mb-2', buttonCN.normal, buttonCN.icon, buttonCN.transparent)}>
          <ArrowLeftIcon className='w-5 h-5' />
        </button>
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-1">
            Editor
          </h2>
          <p className="text-lg text-gray-500">
            {folder}/{file.path}
          </p>
          <p className="text-lg">
            Here you can edit and review your docker compose template before deploying it to your server.
          </p>
        </div>
      </div>
      <div className="relative z-10 flex flex-wrap items-start gap-6">
        
        <Form method="POST" className="flex-grow">
          <input type="hidden" name="projectKey" value={key} />
          <input type="hidden" name="file" value={file.path} />
          <button
            type="button"
            className={clsx('mb-3', buttonCN.small, buttonCN.iconLeft, buttonCN.outline)}
            onClick={() => setDrawerOpen(!drawerOpen)}
          >
            <AdjustmentsVerticalIcon className="w-5 h-5" />
            <p>Edit proxy config</p>
          </button>
          <div className="mb-4 relative z-10">
            <textarea
              className={clsx('h-[500px] bg-zinc-50 font-mono p-3', inputCN)}
              name="compose"
              id="compose"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoComplete="off"
              spellCheck="false"
            />
            {editorDialog}
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
        </Form>
      </div>
    </Layout>
  )
}
