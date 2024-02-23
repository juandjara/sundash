import YAML from 'yaml'
import { type ComposeJSON } from './apps'
import { CaddyLabels, SundashLabels, defaultLogo } from './docker.util'

export function getEditorData(yaml: string) {
  try {
    const compose = YAML.parse(yaml) as ComposeJSON
    const serviceKeys = Object.keys(compose.services)
    const service = Object.keys(compose.services).find((key) => compose.services[key].labels?.[SundashLabels.ENABLE]) || serviceKeys[0]
    const logo = compose.services[service]?.labels?.[SundashLabels.LOGO] || defaultLogo(service)
    const title = compose.services[service]?.labels?.[SundashLabels.TITLE] || service
    const hasAuth = !!compose.services[service]?.labels?.[CaddyLabels.CADDY_AUTH]
    return { serviceKeys, service, title, logo, hasAuth }
  } catch (e) {
    console.error(e)
    return { serviceKeys: [], service: '', title: '', logo: '', hasAuth: false }
  }
}

export function getPortFromPortString(portStr: string) {
  const portParts = portStr
    .replace('/tcp', '')
    .replace('/udp', '')
    .split(':')
    .filter(Boolean)

  const port = (portParts?.length && portParts[portParts.length - 1]) || ''
  return port
}

export type EditorEnv = {
  baseAppsDomain: string
  authorizeConfig: string
  dockerProxyNetwork: string
}

export function applyProxyConfig(text: string, editorEnv: EditorEnv, editorData: ReturnType<typeof getEditorData>) {
  const { baseAppsDomain, authorizeConfig, dockerProxyNetwork } = editorEnv
  const { service, title, logo, hasAuth } = editorData
  try {
    const compose = YAML.parse(text) as ComposeJSON
    const composeService = compose.services[service]
    if (!composeService) {
      throw new Error(`Service "${service}" not found in compose file`)
    }

    const port = getPortFromPortString(composeService.ports?.[0] || '')
    const url = `http://${service}.${baseAppsDomain}`.replace(/\/$/, '')
    
    const labels = {
      [SundashLabels.ENABLE]: 'true',
      [SundashLabels.TITLE]: title,
      [SundashLabels.LOGO]: logo,
      [CaddyLabels.CADDY_URL]: url,
      [CaddyLabels.CADDY_PROXY_PORT]: port ? `{{upstreams ${port}}}` : '{{upstreams}}',
    } as Record<string, string>

    if (hasAuth) {
      labels[CaddyLabels.CADDY_AUTH] = authorizeConfig
    } else {
      delete composeService.labels?.[CaddyLabels.CADDY_AUTH]
    }

    composeService.labels = { ...composeService.labels, ...labels }

    composeService.networks = composeService.networks || []
    if (!composeService.networks.includes(dockerProxyNetwork)) {
      composeService.networks.push(dockerProxyNetwork)
    }

    compose.networks = compose.networks || {}
    compose.networks[dockerProxyNetwork] = { external: true }
    compose.services[service] = composeService

    return YAML.stringify(compose)
  } catch (e) {
    console.error(e)
  }
}
