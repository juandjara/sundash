import type { ComposeJSON, XSundash } from "./apps"
import env from "./env.server"

export function editComposeForSundash(json: ComposeJSON, params: XSundash) {
  const key = params.service
  const serviceData = json.services[key]
  if (serviceData) {
    // ensure service has container name
    serviceData.container_name = serviceData.container_name || key
  }

  json['x-sundash'] = params
  return json
}

export function editComposeForProxy(json: any, params: XSundash & { proxyNetwork: string }) {
  const { url, port, service: key, hasAuth, proxyEnabled, proxyNetwork } = params

  if (!json.services[key]) {
    throw new Error(`Service ${key} not found`)
  }

  if (proxyEnabled) {
    // add proxy network
    json.services[key].networks = json.services[key].networks || []
    if (!json.services[key].networks.includes(proxyNetwork)) {
      json.services[key].networks.push(proxyNetwork)
    }
  
    // add caddy labels
    json.services[key].labels = json.services[key].labels || {}
  
    const fullUrl = new URL(url.startsWith('http') ? url : `http://${url}`)
    fullUrl.protocol = 'http'
    json.services[key].labels['caddy'] = fullUrl.toString().replace(/\/$/, '')

    if (hasAuth) {
      json.services[key].labels['caddy.authorize'] = env.authorizeConfig
    } else {
      delete json.services[key].labels['caddy.authorize']
    }
    json.services[key].labels['caddy.reverse_proxy'] = `{{upstreams ${port}}}`
  
    // ensure external network is defined
    json.networks = json.networks || {}
    json.networks.web = {
      external: true
    }
  } else {
    // remove proxy network
    json.services[key].networks = json.services[key].networks || []
    json.services[key].networks = json.services[key].networks.filter((n: string) => n !== proxyNetwork)
    if (json.services[key].networks.length === 0) {
      delete json.services[key].networks
    }
  
    // remove caddy labels
    json.services[key].labels = json.services[key].labels || {}
    delete json.services[key].labels['caddy']
    delete json.services[key].labels['caddy.authorize']
    delete json.services[key].labels['caddy.reverse_proxy']
    if (Object.keys(json.services[key].labels).length === 0) {
      delete json.services[key].labels
    }

    // remove external network
    json.networks = json.networks || {}
    delete json.networks.web
    if (Object.keys(json.networks).length === 0) {
      delete json.networks
    }
  }

  return json
}
