import type { ComposeJSON, XSundash } from "./apps"

export function editComposeForSundash(json: ComposeJSON, params: XSundash) {
  const key = params.service
  const serviceData = json.services[key]
  if (serviceData) {
    // ensure service has container name
    serviceData.container_name = serviceData.container_name || key
  }

  json['x-sundash'] = {
    ...json['x-sundash'],
    ...params
  }
  return json
}

type EditorEnv = {
  baseAppsDomain: string
  dockerProxyNetwork: string
  authorizeConfig: string
}

export function addProxyConfig(json: ComposeJSON, params: XSundash, env: EditorEnv) {
  const { service, hasAuth } = params
  const { baseAppsDomain, dockerProxyNetwork, authorizeConfig } = env
  const url = `http://${service}.${baseAppsDomain}`

  const serviceData = json.services[service]
  if (!serviceData) {
    throw new Error(`Service ${service} not found`)
  }

  const firstPort = String(serviceData?.ports?.[0] || '')
  const portParts = firstPort
    .replace('/tcp', '')
    .replace('/udp', '')
    .split(':')
    .filter(Boolean)

  const port = (portParts?.length && portParts[portParts.length - 1]) || ''

  // add proxy network
  serviceData.networks = serviceData.networks || []
  if (!serviceData.networks.includes(dockerProxyNetwork)) {
    serviceData.networks.push(dockerProxyNetwork)
  }

  // add caddy labels
  serviceData.labels = serviceData.labels || {}
  serviceData.labels['caddy'] = url.replace(/\/$/, '')

  if (hasAuth) {
    serviceData.labels['caddy.authorize'] = authorizeConfig
  }

  serviceData.labels['caddy.reverse_proxy'] = port ? `{{upstreams ${port}}}` : '{{upstreams}}'

  // ensure external network is defined
  json.networks = json.networks || {}
  json.networks.web = {
    external: true
  }

  json.services[service] = serviceData
  return json
}

export function removeProxyConfig(json: ComposeJSON, params: XSundash, env: EditorEnv) {
  const { service } = params
  const { dockerProxyNetwork } = env

  const serviceData = json.services[service]
  if (!serviceData) {
    throw new Error(`Service ${service} not found`)
  }

  // remove proxy network
  serviceData.networks = serviceData.networks || []
  serviceData.networks = serviceData.networks.filter((n: string) => n !== dockerProxyNetwork)
  if (serviceData.networks.length === 0) {
    delete serviceData.networks
  }

  // remove caddy labels
  serviceData.labels = serviceData.labels || {}
  delete serviceData.labels['caddy']
  delete serviceData.labels['caddy.authorize']
  delete serviceData.labels['caddy.reverse_proxy']
  if (Object.keys(serviceData.labels).length === 0) {
    delete serviceData.labels
  }

  // remove external network
  json.networks = json.networks || {}
  delete json.networks.web
  if (Object.keys(json.networks).length === 0) {
    delete json.networks
  }

  json.services[service] = serviceData
  return json
}
