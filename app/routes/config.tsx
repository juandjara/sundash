import { useLoaderData } from "@remix-run/react"
import { useMemo } from "react"
import LogDisplay from "~/components/LogDisplay"
import Layout from "~/components/layout"
import env from "~/lib/env.server"

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
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-1">Configuration</h2>
        <p className="text-xl">These are the variables used for configuring the app.</p>
      </div>
      <LogDisplay text={envVarsTxt} hideScrollToBottom />
      <p className="my-6">
        These are the environment variables used by this application. To edit them, restart the application with the new values.
      </p>
    </Layout>
  ) 
}
