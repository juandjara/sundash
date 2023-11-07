import type { DockerEnv, DockerVolume, Template } from "./appstore.type"

const TEMPLATES_URL = 'https://templates-portainer.ibaraki.app'
// const TEMPLATES_URL = 'https://raw.githubusercontent.com/SelfhostedPro/selfhosted_templates/master/Template/yacht.json'

type GetTemplatesParams = {
  query: string
  category: string
}

export async function getTemplates({ query, category }: GetTemplatesParams) {
  const res = await fetch(TEMPLATES_URL)
  if (!res.ok) {
    throw new Error('Failed to fetch templates')
  }

  const data = await res.json()
  const templates: Template[] = Array.isArray(data) ? data : data.templates

  const filtered = templates.filter((t) => {
    const baseFilter = t.platform === 'linux' // && t.type === 1
    const regex = new RegExp(query, 'i')
    const queryFilter = query
      ? regex.test(t.title) || regex.test(t.name || '') || regex.test(t.description || '') || regex.test(t.note || '')
      : true
    const categoryFilter = category ? t.categories?.includes(category) : true

    return baseFilter && queryFilter && categoryFilter
  }).sort((a, b) => a.title.localeCompare(b.title))

  return filtered
}

export async function getTemplate({ query, category, open }: GetTemplatesParams & { open: number }) {
  const templates = await getTemplates({ query, category })
  const app = templates[open]
  if (!app) {
    return null
  }

  const name = slugify(app.name || app.title)
  return {
    ...app,
    name,
  }
}

export function getEnvComment(env: DockerEnv) {
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
  return comment
}

export async function getComposeTemplate(app: Template) {
  if (app.type !== 1) {
    return await fetchRemoteCompose(app)
  }

  const ports = app.ports?.map((p) => `\n      - ${p}`).join('')
  const volumes = app.volumes?.map((v) => `\n      - ${formatVolume(v)}`).join('')
  let env = ''
  for (const e of app.env || []) {
    const comment = getEnvComment(e)
    const commentFragment = comment ? `# ${comment}` : ''
    env += `\n      - ${e.name}=${e.default || ''} ${commentFragment}`
  }

  const text = `version: '3.3'
services:
  ${app.name}:
    container_name: ${app.name}
    image: ${app.image}
    restart: ${app.restart_policy || 'unless-stopped'}
    ports:${ports}
    volumes:${volumes}
    environment:${env}
`
  return text
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}

function formatVolume(volume: DockerVolume) {
  let fragment = volume.container
  if (volume.bind) {
    fragment = `${volume.bind}:${volume.container}`
  }
  if (volume.readonly) {
    fragment = `${fragment}:ro`
  }
  return fragment
}

async function fetchRemoteCompose(app: Template, branch = 'master'): Promise<string> {
  const url = `${app.repository?.url}/blob/${branch}/${app.repository?.stackfile}?raw=true`
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 404 && branch === 'master') {
      // TODO: properly fetch default branch
      return await fetchRemoteCompose(app, 'main')
    }
    throw new Error(`Failed to fetch compose file from ${url}`)
  }

  const yaml = await res.text()
  return yaml
}

export function editComposeForSundash(json: any, params: { title: string, logo: string, service: string }) {
  const { title, logo, service: key } = params

  if (!json.services[key]) {
    throw new Error(`Service ${key} not found`)
  }

  const service = json.services[key]

  // ensure service has container name
  service.container_name = service.container_name || key

  json['x-sundash'] = {
    main_container: service.container_name,
    title,
    logo,
  }

  return json
}

export function editComposeForProxy(json: any, params: {
  url: string,
  port: number,
  service: string,
  hasAuth: boolean
  proxyEnabled: boolean
}) {
  const { url, port, service: key, hasAuth, proxyEnabled } = params

  if (!json.services[key]) {
    throw new Error(`Service ${key} not found`)
  }

  if (proxyEnabled) {
    // add proxy network
    json.services[key].networks = json.services[key].networks || []
    if (!json.services[key].networks.includes('web')) {
      json.services[key].networks.push('web')
    }
  
    // add caddy labels
    json.services[key].labels = json.services[key].labels || {}
  
    const fullUrl = new URL(url.startsWith('http') ? url : `http://${url}`)
    fullUrl.protocol = 'http'
    json.services[key].labels['caddy'] = fullUrl.toString()

    if (hasAuth) {
      json.services[key].labels['caddy.authorize'] = 'with auth_policy'
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
    json.services[key].networks = json.services[key].networks.filter((n: string) => n !== 'web')
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
