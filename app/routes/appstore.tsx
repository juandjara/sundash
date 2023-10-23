import { MagnifyingGlassIcon } from "@heroicons/react/20/solid"
import type { LoaderArgs} from "@remix-run/node"
import { json } from "@remix-run/node"
import { Form, useLoaderData, useSearchParams, useSubmit } from "@remix-run/react"
import clsx from "clsx"
import { useMemo } from "react"
import AppDetail from "~/components/AppDetail"
import Layout from "~/components/layout"
import { getTemplates } from "~/lib/appstore"
import type { Template } from "~/lib/appstore.type"
import { inputCN } from "~/lib/styles"

export async function loader({ request }: LoaderArgs) {
  const query = new URL(request.url).searchParams.get('q') || ''
  const category = new URL(request.url).searchParams.get('category') || ''
  const templates = await getTemplates({ query, category })

  return json(templates, {
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
              <li key={`${t.image}-${i}`}>
                <button
                  onClick={() => toggleOpen(i)}
                  className={clsx(
                    'flex w-full items-center gap-6 p-2 rounded-md hover:bg-pink-50 transition-colors duration-200',
                    open === i ? 'bg-pink-50' : 'bg-white'
                  )}
                >
                  <img
                    src={t.logo}
                    alt={t.title}
                    className="w-16 h-16 block object-contain rounded-full border border-pink-200"
                  />
                  <div className="text-left">
                    <p className="text-xl mb-1 font-medium">{t.title}</p>
                    <p className="text-sm mb-1">{t.description}</p>
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
