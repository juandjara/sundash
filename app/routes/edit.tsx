import Layout from "~/components/layout"
import { Link, useLoaderData, useNavigate } from "@remix-run/react"
import type { LoaderArgs } from "@remix-run/node"
import { editComposeForProxy, editComposeForSundash, getComposeTemplate, getTemplate } from "~/lib/appstore"
import { buttonCN, inputCN } from "~/lib/styles"
import clsx from "clsx"
import { ArrowLeftIcon } from "@heroicons/react/20/solid"
import YAML from 'yaml'
import { useEffect, useMemo, useRef, useState } from "react"
import { parseMarkdown } from "~/lib/parseMarkdown"
import packageIconURL from '~/assets/package.svg'

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
  const [proxyEnabled, setProxyEnabled] = useState(true)
  const formRef = useRef<HTMLFormElement>(null)

  const { description, note } = useMemo(() => {
    const description = app.description ? parseMarkdown(app.description) : ''
    const note = app.note ? parseMarkdown(app.note) : ''

    return {
      note,
      description,
    }
  }, [app])

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
    setText(composeFile.text)
  }

  function getDefaults() {
    const key = Object.keys(composeFile.json.services)[0]
    const service = composeFile.json.services[key]
    const portParts = service.ports[0].split(':')
    const port = Number(portParts[portParts.length - 1].replace('/tcp', '').replace('/udp', ''))
    const url = `${app.name}.example.com`
    return { port, url, service: key }
  }

  function updateComposeFile(ev: React.FormEvent<HTMLFormElement> | React.FocusEvent<HTMLFormElement>) {
    ev.preventDefault()
    const fd = new FormData(ev.currentTarget)
    const service = fd.get('service') as string

    const withSundashConfig = editComposeForSundash(composeFile.json, {
      title: fd.get('title') as string,
      logo: fd.get('logoURL') as string,
      service,
    })

    const withProxyConfig = editComposeForProxy(withSundashConfig, {
      port: Number(fd.get('port') || NaN),
      url: fd.get('url') as string,
      hasAuth: fd.get('hasAuth') === 'on',
      proxyEnabled: fd.get('proxyEnabled') === 'on',
      service,
    })

    setText(YAML.stringify(withProxyConfig))
  }

  if (!app) {
    return null
  }

  const selectOptions = Object.keys(composeFile.json.services).map((service) => {
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
        <div className="mb-4">
          <h2 className="text-3xl font-bold mb-1">Install {app.title || app.name}</h2>
          <p className="text-xl">Edit this docker compose template and deploy it on your server.</p>
        </div>
      </div>
      <div className="p-3 border mb-8">
        <img
          src={app.logo}
          alt={app.title}
          className="block h-24 w-auto"
          onError={(ev) => {
            ev.currentTarget.src = packageIconURL
            ev.currentTarget.style.padding = '12px'
          }}
        />
        <p className="text-2xl font-medium mt-6 mb-2">{app.title}</p>
        {description && (
          <p
            className="max-w-prose mb-2 [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: description }}></p>
        )}
        {note && (
          <p
            className="max-w-prose text-zinc-500 text-sm [&_a]:underline [&>p+p]:mt-2"
            dangerouslySetInnerHTML={{ __html: note }}></p>
        )}
      </div>
      <div className="flex flex-wrap items-start gap-4 mb-12">
        <form
          onSubmit={updateComposeFile}
          onBlur={updateComposeFile}
          className="max-w-md w-full"
          ref={formRef}
        >
          <div className="mb-4">
            <label className="text-zinc-500 mb-1 block">Title</label>
            <input 
              className={clsx('bg-zinc-50 px-2 py-1', inputCN)}
              type="text"
              name="title"
              id="title"
              defaultValue={app.title}
            />
          </div>
          <div className="mb-4">
            <label className="text-zinc-500 mb-1 block">Logo URL</label>
            <input 
              className={clsx('bg-zinc-50 px-2 py-1', inputCN)}
              type="url"
              name="logoURL"
              id="logoURL"
              defaultValue={app.logo}
            />
          </div>
          <p className="mt-8 text-lg">Exposed URL configuration</p>
          <hr className="mt-2 mb-4" />
          <div className="mb-4">
            <label className="text-zinc-500 flex items-center" htmlFor="proxyEnabled">
              <input
                type="checkbox"
                name="proxyEnabled"
                id="proxyEnabled"
                className="mr-2"
                checked={proxyEnabled}
                onChange={(e) => setProxyEnabled(e.target.checked)}
              />
              <span>Expose URL enabled</span>
            </label>
          </div>
          <fieldset aria-disabled={!proxyEnabled} className="aria-disabled:opacity-50 aria-disabled:pointer-events-none">
            <div className="mb-4">
              <label className="text-zinc-500 flex items-center" htmlFor="hasAuth">
                <input
                  type="checkbox"
                  name="hasAuth"
                  id="hasAuth"
                  className="mr-2"
                  defaultChecked
                />
                <span>Exposed URL requires authentication</span>
              </label>
            </div>
            <div className="mb-4">
              <label className="text-zinc-500 mb-1 block" htmlFor="service">
                Select a compose service
              </label>
              <select className={clsx('bg-zinc-50 p-[6px]', inputCN)} name="service" id="service" required>
                {selectOptions}
              </select>
            </div>
            <div className="mb-4">
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
            <div className="mb-4">
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
                defaultValue={getDefaults().url}
              />
            </div>
          </fieldset>
        </form>
        <div className="flex-grow">
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
          <div className="mb-3">
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
            <button type="button" onClick={resetForm} className={clsx(buttonCN.normal, buttonCN.transparent)}>Reset</button>
            <div className="flex-grow"></div>
            <button type="button" onClick={() => navigate(-1)} className={clsx(buttonCN.normal, buttonCN.delete)}>Cancel</button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
