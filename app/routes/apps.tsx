import { Link, useLoaderData } from "@remix-run/react"
import Logo from "~/components/Logo"
import Layout from "~/components/layout"
import { getAppLogo, getAppTitle, getApps, getServiceKey } from "~/lib/apps"

export async function loader() {
  const apps = await getApps()
  console.log(apps)
  return { apps }
}

export default function Apps() {
  const { apps } = useLoaderData<typeof loader>()

  return (
    <Layout>
      <p className="text-2xl font-semibold flex-grow">Apps</p>
      <ul className="flex flex-wrap items-center gap-4 py-4 px-2">
        {apps.map((app) => {
          const id = getServiceKey(app)
          return (
            <li
              key={id}
              className="relative group flex flex-col place-items-center border border-zinc-200 py-3 rounded-xl shadow hover:shadow-md transition-shadow w-40"
            >
              <Link to={`/apps/${id}`} className="absolute inset-0">
                <span className="sr-only">{getAppTitle(app)}</span>
              </Link>
              <Logo
                src={getAppLogo(app)}
                alt='app logo'
                className="pointer-events-none w-20 h-20 block object-contain p-0.5 group-hover:scale-125 duration-300 transition-transform transform"
              />
              <p className="not-sr-only capitalize text-center mt-2">{getAppTitle(app)}</p>
            </li>
          )
        })}
      </ul>
    </Layout>
  )
}