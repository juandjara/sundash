import { Transition } from "@headlessui/react"
import { useFetcher, useLoaderData } from "@remix-run/react"
import clsx from "clsx"
import { Fragment, useState } from "react"
import { type EditorEnv, applyProxyConfig, getEditorData } from "~/lib/editor.util"
import { buttonCN, inputCN } from "~/lib/styles"
import Logo from "./Logo"

export default function LabelEditorDialog({ open, onClose, text, setText }: {
  open: boolean
  onClose: () => void
  text: string
  setText: (newText: string) => void
}) {
  return (
    <Transition
      show={open}
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
          onClick={onClose}
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
            onClose={onClose}
            onConfirm={(newText) => {
              setText(newText)
              onClose()
            }}
          />
        </Transition.Child>
      </section>
    </Transition>
  )
}
 
function LabelEditor({ text, onClose, onConfirm }: {
  text: string
  onClose: () => void
  onConfirm: (newText: string) => void
}) {
  const { editorEnv, networkExists } = useLoaderData() as {
    editorEnv: EditorEnv
    networkExists: boolean
  }
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
          aria-disabled={!service || !title || !networkExists}
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
