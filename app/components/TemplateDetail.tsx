import { ArrowLeftIcon, ArrowRightIcon, PlusIcon } from "@heroicons/react/20/solid"
import { Link, useLoaderData, useSearchParams } from "@remix-run/react"
import clsx from "clsx"
import { buttonCN, inputCN } from "~/lib/styles"
import type { Template } from "~/lib/appstore.type"
import { useMemo, useState } from "react"
import { getEnvComment } from "~/lib/appstore"
import { parseMarkdown } from "~/lib/parseMarkdown"
import Logo from "./Logo"

export default function TemplateDetail({ template }: { template: Template }) {
  const { projects } = useLoaderData() as { projects: string[] }
  const [project, setProject] = useState('')

  const [params, setParams] = useSearchParams()
  const markdowns = useMemo(() => {
    const description = template.description ? parseMarkdown(template.description) : ''
    const note = template.note || ''
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
    params.delete('index')
    setParams(params)
  }

  return (
    <div className="relative p-2 bg-zinc-50 w-full">
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
        <div className="flex gap-3 items-center mt-4 mb-12">
          <select 
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className={clsx('bg-zinc-50 p-[6px]', inputCN)}
          >
            <option value='' disabled>Select a project</option>
            {projects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <Link 
            to={`/edit/${project}/new?type=appstore&index=${template.index}`}
            className={clsx(
              { 'opacity-50 pointer-events-none': !project },
              'flex-shrink-0',
              buttonCN.primary, buttonCN.normal, buttonCN.iconLeft
            )}
          >
            <PlusIcon className="w-6 h-6" />
            <p>Add to project</p>
          </Link>
        </div>
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
