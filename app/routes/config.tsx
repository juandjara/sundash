import { ArrowLeftIcon } from "@heroicons/react/20/solid"
import { useLoaderData, useNavigate } from "@remix-run/react"
import clsx from "clsx"
import { useMemo } from "react"
import LogDisplay from "~/components/LogDisplay"
import Layout from "~/components/layout"
import env from "~/lib/env.server"
import { buttonCN } from "~/lib/styles"

export async function loader() {
  return {
    CONFIG_FOLDER: {
      comment: 'folder to store app compose files and .env file',
      value: env.configFolder,
    },
    DOCKER_PROXY_NETWORK: {
      comment: 'docker network used by caddy proxy to read services',
      value: env.dockerProxyNetwork,
    },
    BASE_APPS_DOMAIN: {
      comment: 'base url for all services proxied by caddy',
      value: env.baseAppsDomain,
    },
    AUTHORIZE_CONFIG: {
      comment: `line for caddyfile label 'caddy.authorize'`,
      value: env.authorizeConfig,
    }
  }
}

export default function Config() {
  const navigate = useNavigate()
  const envVars = useLoaderData<typeof loader>()
  const envVarsTxt = useMemo(() => {
    return Object.entries(envVars).map(([key, line]) => [
      `# ${line.comment}`,
      `${key}=${line.value}`,
      '',
    ]).flat().join('\n')
  }, [envVars])
  
  return (
    <Layout>
      <div className="md:flex items-start gap-2">
        <button onClick={() => navigate(-1)} className={clsx('block w-min mb-2', buttonCN.normal, buttonCN.icon, buttonCN.transparent)}>
          <ArrowLeftIcon className='w-5 h-5' />
        </button>  
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-1">Configuration</h2>
          <p className="text-xl">These are the variables used for configuring the app.</p>
        </div>
      </div>
      <LogDisplay text={envVarsTxt} hideScrollToBottom />
      <p className="my-6">
        These are the environment variables used by this application. To edit them, restart the application with the new values.
      </p>
    </Layout>
  ) 
}
