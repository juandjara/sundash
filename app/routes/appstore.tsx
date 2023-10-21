import { ArrowLeftIcon, ArrowRightIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/20/solid"
import type { LoaderArgs} from "@remix-run/node"
import { json } from "@remix-run/node"
import { Form, useLoaderData, useSearchParams, useSubmit } from "@remix-run/react"
import clsx from "clsx"
import { useMemo } from "react"
import Layout from "~/components/layout"
import type { DockerEnv, Template } from "~/lib/appstore"
import { buttonCN, inputCN } from "~/lib/styles"

// // 954, many duplicates
// const TEMPLATES_URL = 'https://yangkghjh.github.io/selfhosted_store/unraid/templates/portainer/template.json'

// // 104
// const TEMPLATES_URL = 'https://raw.githubusercontent.com/SelfhostedPro/selfhosted_templates/master/Template/template.json'

// // 100 aprox
// const TEMPLATES_URL = 'https://raw.githubusercontent.com/TheLustriVA/portainer-templates-Nov-2022-collection/main/templates_2_2_rc_2_2.json'

// // 93
// const TEMPLATES_URL = 'https://raw.githubusercontent.com/pi-hosted/pi-hosted/master/pi-hosted_template/template/portainer-v2.json'

// 337
const TEMPLATES_URL = 'https://raw.githubusercontent.com/Lissy93/portainer-templates/main/templates.json'

// // 153
// const TEMPLATES_URL = 'https://raw.githubusercontent.com/technorabilia/portainer-templates/main/lsio/templates/templates-2.0.json'

export async function loader({ request }: LoaderArgs) {
  const res = await fetch(TEMPLATES_URL)
  if (!res.ok) {
    throw new Error('Failed to fetch templates')
  }

  const data = await res.json()
  const templates: Template[] = Array.isArray(data) ? data : data.templates
  const query = new URL(request.url).searchParams.get('q') || ''
  const category = new URL(request.url).searchParams.get('category') || ''

  const filtered = templates.filter((t) => {
    const baseFilter = t.type === 1 && t.platform === 'linux' // only single container templates
    const regex = new RegExp(query, 'i')
    const queryFilter = query ? regex.test(t.title) || regex.test(t.name || '') : true
    const categoryFilter = category ? t.categories?.includes(category) : true

    return baseFilter && queryFilter && categoryFilter
  })

  return json(filtered, {
    headers: {
      'Cache-Control': 'public, max-age=3600'
    }
  })
}

function getCategories(templates: Template[]) {
  const categories = new Set<string>()
  templates.forEach((t) => {
    if (t.categories) {
      t.categories.forEach((c) => categories.add(c))
    }
  })

  return Array.from(categories).sort()
}

export default function AppStore() {
  const data = useLoaderData<typeof loader>()
  console.log(data)
  const categories = useMemo(() => getCategories(data), [data])
  const submit = useSubmit()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const category = params.get('category') || ''
  const open = Number(params.get('open') || -1)
  const appDetail = data[open]

  function toggleOpen(i: number) {
    if (open === i) {
      params.delete('open')
    } else {
      params.set('open', String(i))
    }
    setParams(params)
  }

  return (
    <Layout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-1">App Store</h2>
        <p className="text-xl">Browse and install apps from the community.</p>
      </div>
      <div className="flex items-stretch">
        <div className="w-full">
          <p className="text-xl font-medium mb-4">{data.length} templates</p>
          <Form method="get" className="mb-4 flex items-start gap-3">
            <div className="relative w-full">
              <MagnifyingGlassIcon className="w-5 h-5 text-zinc-500 absolute left-[7px] top-[7px]" />
              <input
                name="q"
                type="text"
                placeholder="Search template"
                className={clsx(inputCN, 'pl-8 pr-2 py-1')}
                defaultValue={query}
              />
            </div>
            <select
              name="category"
              className={clsx(inputCN, 'p-[6px] max-w-xs')}
              onChange={(ev) => submit(ev.currentTarget.form)}
              defaultValue={category}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Form>
          <ul className="space-y-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 316px)' }}>
            {data.map((t, i) => (
              <li key={i}>
                <button
                  onClick={() => toggleOpen(i)}
                  className={clsx(
                    'flex w-full items-center gap-2 p-2 rounded-md hover:bg-pink-50 transition-colors duration-200',
                    open === i ? 'bg-pink-50' : 'bg-white'
                  )}
                >
                  <img src={t.logo} alt={t.title} className="w-12 h-12 block object-contain rounded-full border border-pink-200" />
                  <div className="text-left">
                    <p className="text-xl mb-1 font-medium">{t.title}</p>
                    <p className="text-sm mb-1 truncate max-w-prose">{t.description}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {appDetail && <AppDetail app={appDetail} />}
        <div></div>
      </div>
    </Layout>
  )
}

function AppDetail({ app }: { app: Template }) {
  const [params, setParams] = useSearchParams()

  function close() {
    params.delete('open')
    setParams(params)
  }

  return (
    <div className="relative ml-2 p-2 bg-zinc-50 w-full">
      <button onClick={close} className={clsx('block w-min', buttonCN.normal, buttonCN.icon, buttonCN.transparent)}>
        <ArrowLeftIcon className='w-5 h-5' />
      </button>
      <header className="text-center mx-2">
        <img
          src={app.logo}
          alt={app.title}
          className="block w-24 mx-auto"
        />
        <p className="text-2xl font-medium mt-6 mb-1">{app.title}</p>
        <p className="max-w-prose mx-auto mb-1">{app.description}</p>
        <p className="max-w-prose mx-auto text-zinc-500 text-sm">{app.note}</p>
        <button className={clsx('my-6 mx-auto', buttonCN.primary, buttonCN.big, buttonCN.iconLeft)}>
          <PlusIcon className="w-5 h-5" />
          <p>Install</p>
        </button>
      </header>
      <div className="space-y-6 my-6 mx-2">
        <div>
          <label className="block mb-1">Image</label>
          <p className="text-sm text-zinc-500">{app.image}</p>
        </div>
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
        {app.env?.length ? (
          <div>
            <label className="block mb-1">Environment variables</label>
            <ul className="space-y-1">
              {app.env?.map((e, i) => (
                <li key={i} className="text-sm text-zinc-500">
                  <p>{getEnvComment(e)}</p>
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
      </div>
    </div>
  )
}

function getEnvComment(env: DockerEnv) {
  let comment = ''
  if (env.preset) {
    comment += 'Should not be edited. '
  }
  if (env.select) {
    const defaultOpt = env.select.find((s) => s.default)
    const defaultComment = defaultOpt ? `Default is "${defaultOpt.value}"` : ''
    comment += `choose one of ${env.select.map((s) => {
      const optionComment = s.text ? ` (${s.text})` : ''
      return `"${s.value}"${optionComment}`
    })}. ${defaultComment}`
  }
  if (env.description) {
    comment += env.description
  }
  return comment ? `# ${comment}` : ''
}
