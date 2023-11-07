import Layout from "~/components/layout"
import { Form, Link, useLoaderData, useNavigate, useNavigation } from "@remix-run/react"
import { redirect, type ActionArgs, type LoaderArgs } from "@remix-run/node"
import { editComposeForProxy, editComposeForSundash, getComposeTemplate, getTemplate } from "~/lib/appstore"
import { buttonCN, inputCN } from "~/lib/styles"
import clsx from "clsx"
import { ArrowLeftIcon } from "@heroicons/react/20/solid"
import YAML from 'yaml'
import { useEffect, useMemo, useRef, useState } from "react"
import Logo from "~/components/Logo"
import { saveApp } from "~/lib/apps"

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
    composeYaml: await getComposeTemplate(app)
  }
}

export async function action({ request }: ActionArgs) {
  const fd = await request.formData()
  const name = fd.get('name') as string
  const compose = fd.get('compose') as string
  await saveApp({ name, compose })
  return redirect('/apps')
}

export default function TemplateEditor() {
  const { app, composeYaml } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const [text, setText] = useState(composeYaml)
  const [proxyEnabled, setProxyEnabled] = useState(true)
  const formRef = useRef<HTMLFormElement>(null)
  const [logo, setLogo] = useState(app.logo)
  const composeJSON = useMemo(() => YAML.parse(text), [text])
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
    const key = Object.keys(composeJSON.services)[0]
    const service = composeJSON.services[key]
    const portParts = service.ports?.[0] && service.ports[0].split(':')
    const port = portParts && Number(portParts[portParts.length - 1].replace('/tcp', '').replace('/udp', ''))
    const url = `${app.name}.example.com`
    return { port, url, service: key }
  }

  function updateComposeFile(ev: React.FormEvent<HTMLFormElement> | React.FocusEvent<HTMLFormElement>) {
    ev.preventDefault()
    const fd = new FormData(ev.currentTarget)
    const service = fd.get('service') as string

    const withSundashConfig = editComposeForSundash(composeJSON, {
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
          <h2 className="text-3xl font-bold mb-1">Install {app.title || app.name}</h2>
          <p className="text-xl">Edit this docker compose template and deploy it on your server.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-6 my-6">
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
          <p className="mt-8 text-lg">Exposed URL configuration</p>
          <hr className="mt-2 mb-6" />
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
              <span>Expose URL enabled</span>
            </label>
          </div>
          <fieldset aria-disabled={!proxyEnabled} className="aria-disabled:opacity-50 aria-disabled:pointer-events-none">
            <div className="mb-6">
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
                placeholder="example.com"
                required
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
              autoCapitalize="off"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
          <div className="flex items-center gap-2">
            <button aria-disabled={busy} type="submit" className={clsx(buttonCN.normal, buttonCN.primary)}>Deploy</button>
            <button aria-disabled={busy} type="button" onClick={resetForm} className={clsx(buttonCN.normal, buttonCN.transparent)}>Reset</button>
            <div className="flex-grow"></div>
            <button type="button" onClick={() => navigate(-1)} className={clsx(buttonCN.normal, buttonCN.delete)}>Cancel</button>
          </div>
        </Form>
      </div>
    </Layout>
  )
}
