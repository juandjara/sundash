import { ArrowLeftIcon, ArrowRightIcon, PlusCircleIcon } from "@heroicons/react/20/solid"
import { Link, useSearchParams } from "@remix-run/react"
import clsx from "clsx"
import { buttonCN } from "~/lib/styles"
import type { Template } from "~/lib/appstore.type"
import { useMemo } from "react"
import { getEnvComment } from "~/lib/appstore"
import { parseMarkdown } from "~/lib/parseMarkdown"
import Logo from "./Logo"

export default function AppDetail({ app }: { app: Template }) {
  const [params, setParams] = useSearchParams()
  const appMarkdown = useMemo(() => {
    const description = app.description ? parseMarkdown(app.description) : ''
    const note = app.note || '' // ? parseMarkdown(app.note.replace('&lt', '<').replace('&gt', '>')) : ''
    const env = app.env?.map((e) => {
      return {
        ...e,
        comment: parseMarkdown(getEnvComment(e)),
      }
    })

    return {
      ...app,
      description,
      note,
      env,
    }
  }, [app])

  function close() {
    params.delete('open')
    setParams(params)
  }

  return (
    <div className="relative ml-2 p-2 bg-zinc-50 w-full">
      <button onClick={close} className={clsx('block w-min', buttonCN.normal, buttonCN.icon, buttonCN.transparent)}>
        <ArrowLeftIcon className='w-5 h-5' />
      </button>
      <header className="mx-2">
        <Logo
          src={app.logo}
          alt={app.title}
          className="block h-24 w-auto mx-auto"
        />
        <p className="text-2xl font-medium mt-6 mb-2">{app.title}</p>
        <p
          className="max-w-prose mb-2 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: appMarkdown.description }}></p>
        <p
          className="max-w-prose text-zinc-500 text-sm [&_a]:underline [&>p+p]:mt-2"
          dangerouslySetInnerHTML={{ __html: appMarkdown.note }}></p>
        <Link to={`/edit?${params.toString()}`}>
          <button className={clsx('mt-2 mb-12', buttonCN.primary, buttonCN.big, buttonCN.iconLeft)}>
            <PlusCircleIcon className="w-6 h-6" />
            <p>Edit and Install</p>
          </button>
        </Link>
      </header>
      <div className="space-y-6 my-6 mx-2">
        {app.image ? (
          <div>
            <label className="block mb-1">Image</label>
            <p className="text-sm text-zinc-500">{app.image}</p>
          </div>
        ) : null}
        <div>
          <label className="block mb-1">Categories</label>
          <p className="text-sm text-zinc-500">{app.categories?.join(', ')}</p>
        </div>
        {app.volumes?.length ? (
          <div>
            <label className="block mb-1">Volumes</label>
            <ul className="space-y-1">
              {app.volumes?.map((v, i) => (
                <li key={i} className="flex items-center gap-1">
                  <p className="text-sm text-zinc-500">{v.bind}</p>
                  <ArrowRightIcon className="w-4 h-4" />
                  <p className="text-sm text-zinc-500">{v.container}</p>
                  <p>{v.readonly ? 'readonly' : ''}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {app.ports?.length ? (
          <div>
            <label className="block mb-1">Ports</label>
            <ul className="space-y-1">
              {app.ports?.map((p, i) => (
                <li key={i} className="text-sm text-zinc-500">{p}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {appMarkdown.env?.length ? (
          <div>
            <label className="block mb-1">Environment variables</label>
            <ul className="space-y-2">
              {appMarkdown.env?.map((e, i) => (
                <li key={i} className="text-sm text-zinc-500">
                  <p
                    className="[&>p]:before:content-['_#_'] [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: e.comment }}></p>
                  <p>{e.name}={e.default || ''}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {app.restart_policy ? (
          <div>
            <label className="block mb-1">Restart policy</label>
            <p className="text-sm text-zinc-500">{app.restart_policy}</p>
          </div>
        ) : null}
        {app.hostname ? (
          <div>
            <label className="block mb-1">Hostname</label>
            <p className="text-sm text-zinc-500">{app.hostname}</p>
          </div>
        ) : null}
        {app.command ? (
          <div>
            <label className="block mb-1">Command</label>
            <p className="text-sm text-zinc-500">{app.command}</p>
          </div>
        ) : null}
        {app.registry ? (
          <div>
            <label className="block mb-1">Registry</label>
            <p className="text-sm text-zinc-500">{app.registry}</p>
          </div>
        ) : null}
        {app.netowrk ? (
          <div>
            <label className="block mb-1">Network</label>
            <p className="text-sm text-zinc-500">{app.netowrk}</p>
          </div>
        ) : null}
        <ComposeFilePreview app={app} />
      </div>
    </div>
  )
}

function ComposeFilePreview({ app }: { app: Template }) {
  return null
}
