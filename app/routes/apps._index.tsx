import { PlusIcon } from "@heroicons/react/20/solid"
import { Link, useLoaderData } from "@remix-run/react"
import clsx from "clsx"
import Logo from "~/components/Logo"
import Tooltip from "~/components/Tooltip"
import Layout from "~/components/layout"
import type { ComposeJSONExtra} from "~/lib/apps"
import { getApps, getStateColor, getStateTitle } from "~/lib/apps"
import { buttonCN } from "~/lib/styles"

export async function loader() {
  const apps = await getApps()
  return { apps }
}

export default function Apps() {
  const { apps } = useLoaderData() as { apps: ComposeJSONExtra[] }
  const enabledApps = apps.filter((app) => app.enabled)
  const disabledApps = apps.filter((app) => !app.enabled)

  const numCreatedApps = enabledApps.filter((app) => app.runtime).length
  const numRunningApps = enabledApps.filter((app) => app.runtime?.state === 'running').length

  return (
    <Layout>
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <h2 className="text-2xl font-semibold flex-grow">
          <span>Apps</span>
          {' '}<small className="text-sm text-zinc-500">
            {numRunningApps} running / {numCreatedApps} created / {enabledApps.length} total
          </small>
        </h2>
        <button className={clsx(buttonCN.normal, buttonCN.primary, buttonCN.iconLeft)}>
          <PlusIcon className="w-6 h-6" />
          <p>New app</p>
        </button>
      </div>
      {apps.length === 0 && (
        <p className="text-center text-lg mt-4">
          You don't have any apps yet. 
          {' '}<Link className="underline text-pink-500" to='/new'>Create one</Link>
          {' '}or install from the <Link className="underline text-pink-500" to='/appstore'>App Store</Link>.
        </p>
      )}
      <ul className="flex flex-wrap items-center justify-center md:justify-start gap-4 py-4 px-2">
        {enabledApps.map((app) => (
          <AppCard app={app} key={app.id} />
        ))}
      </ul>
      {disabledApps.length > 0 && (
        <>
          <h2 className="mt-8 text-xl font-semibold">
            <span>Disabled apps</span>
            {' '}<small className="text-sm text-zinc-500">{disabledApps.length}</small>
          </h2>
          <ul className="flex flex-wrap items-center justify-center md:justify-start gap-4 py-4 px-2">
            {disabledApps.map((app) => (
              <AppCard app={app} key={app.id} />
            ))}
          </ul>
        </>
      )}
    </Layout>
  )
}

function AppCard({ app }: { app: ComposeJSONExtra }) {
  return (
    <li
      className={clsx(
        { 'opacity-50 bg-gray-100': !app.enabled },
        'shadow hover:shadow-md transition-shadow',
        'relative group flex flex-col place-items-center border border-zinc-200 py-3 rounded-xl w-40'
      )}
    >
      <Link to={`/apps/${app.id}`} className="absolute inset-0">
        <span className="sr-only">{app.title}</span>
      </Link>
      <div className="absolute top-2 right-2">              
        <Tooltip title={getStateTitle(app)}>
          <div className={clsx(
            getStateColor(app),
            'w-4 h-4 rounded-full'
          )}></div>
        </Tooltip>
      </div>
      <Logo
        src={app.logo}
        alt='app logo'
        className="pointer-events-none w-20 h-20 block object-contain p-0.5 group-hover:scale-125 duration-300 transition-transform transform"
      />
      <p className="not-sr-only truncate max-w-full px-2 capitalize text-center mt-2">{app.title}</p>
    </li>
  )
}
