import { ArrowLeftIcon, ArrowRightIcon, PlusCircleIcon } from "@heroicons/react/20/solid"
import { Link, useSearchParams } from "@remix-run/react"
import clsx from "clsx"
import { buttonCN } from "~/lib/styles"
import type { Template } from "~/lib/appstore.type"
import { useMemo } from "react"
import { getEnvComment } from "~/lib/appstore"
import { parseMarkdown } from "~/lib/parseMarkdown"
import Logo from "./Logo"

export default function TemplateDetail({ template }: { template: Template }) {
  const [params, setParams] = useSearchParams()
  const markdowns = useMemo(() => {
    const description = template.description ? parseMarkdown(template.description) : ''
    const note = template.note || '' // ? parseMarkdown(app.note.replace('&lt', '<').replace('&gt', '>')) : ''
    const env = template.env?.map((e) => {
      return {
        ...e,
        comment: parseMarkdown(getEnvComment(e)),
      }
    })

    return {
      description,
      note,
      env,
    }
  }, [template])

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
          src={template.logo}
          alt={template.title}
          className="block h-24 w-auto mx-auto"
        />
        <p className="text-2xl font-medium mt-6 mb-2">{template.title}</p>
        <p
          className="max-w-prose mb-2 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: markdowns.description }}></p>
        <p
          className="max-w-prose text-zinc-500 text-sm [&_a]:underline [&>p+p]:mt-2"
          dangerouslySetInnerHTML={{ __html: markdowns.note }}></p>
        <Link to={`/edit?${params.toString()}`}>
          <button className={clsx('mt-2 mb-12', buttonCN.primary, buttonCN.big, buttonCN.iconLeft)}>
            <PlusCircleIcon className="w-6 h-6" />
            <p>Edit and Install</p>
          </button>
        </Link>
      </header>
      <div className="space-y-6 my-6 mx-2">
        {template.image ? (
          <div>
            <label className="block mb-1">Image</label>
            <p className="text-sm text-zinc-500">{template.image}</p>
          </div>
        ) : null}
        <div>
          <label className="block mb-1">Categories</label>
          <p className="text-sm text-zinc-500">{template.categories?.join(', ')}</p>
        </div>
        {template.volumes?.length ? (
          <div>
            <label className="block mb-1">Volumes</label>
            <ul className="space-y-1">
              {template.volumes?.map((v, i) => (
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
        {template.ports?.length ? (
          <div>
            <label className="block mb-1">Ports</label>
            <ul className="space-y-1">
              {template.ports?.map((p, i) => (
                <li key={i} className="text-sm text-zinc-500">{p}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {markdowns.env?.length ? (
          <div>
            <label className="block mb-1">Environment variables</label>
            <ul className="space-y-2">
              {markdowns.env?.map((e, i) => (
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
        {template.restart_policy ? (
          <div>
            <label className="block mb-1">Restart policy</label>
            <p className="text-sm text-zinc-500">{template.restart_policy}</p>
          </div>
        ) : null}
        {template.hostname ? (
          <div>
            <label className="block mb-1">Hostname</label>
            <p className="text-sm text-zinc-500">{template.hostname}</p>
          </div>
        ) : null}
        {template.command ? (
          <div>
            <label className="block mb-1">Command</label>
            <p className="text-sm text-zinc-500">{template.command}</p>
          </div>
        ) : null}
        {template.registry ? (
          <div>
            <label className="block mb-1">Registry</label>
            <p className="text-sm text-zinc-500">{template.registry}</p>
          </div>
        ) : null}
        {template.netowrk ? (
          <div>
            <label className="block mb-1">Network</label>
            <p className="text-sm text-zinc-500">{template.netowrk}</p>
          </div>
        ) : null}
        <ComposeFilePreview app={template} />
      </div>
    </div>
  )
}

function ComposeFilePreview({ app }: { app: Template }) {
  return null
}
