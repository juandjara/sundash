import env from "./env.server"
import fs from 'fs/promises'
import path from 'path'
import YAML from 'yaml'
import type { PsService} from "./docker.server"
import { getPS } from "./docker.server"
import { getComposeFiles, loadAppsEnv } from "./envfile.server"

export type XSundash = {
  title: string
  logo: string
  proxyEnabled: boolean
  hasAuth: boolean
  service: string
  port: number
  url: string
}

export type ComposeJSON = {
  version?: string
  services: {
    [key: string]: {
      image: string
      container_name?: string
      ports?: string[]
      environment?: string[]
      env_file?: string[]
      volumes?: string[]
      networks?: string[]
      depends_on?: string[]
      restart?: string
      labels?: {
        [key: string]: string
      }
      command?: string
      cap_add?: string[]
      cap_drop?: string[]
      devices?: string[]
      dns?: string[]
      dns_search?: string[]
      entrypoint?: string[]
      expose?: string[]
      external_links?: string[]
      extra_hosts?: string[]
      logging?: string
    }
  }
  netowrks?: {
    [key: string]: {
      external: boolean
    }
  }
  'x-sundash'?: XSundash
}

export type ComposeJSONExtra = ComposeJSON & {
  filename: string
  id: string
  key: string
  enabled: boolean
  runtime?: PsService
  title: string
  name: string
  logo: string
}

export async function getAppsState() {
  loadAppsEnv()
  const configFolder = env.configFolder
  const { services } = await getPS(configFolder)
  return services.reduce((acc, s) => {
    acc[s.service] = s
    return acc
  }, {} as Record<string, PsService>)
}

// make sure the result of parsing yaml as json contains a valid docker compose file
export function validateComposeJSON(app: ComposeJSON) {
  return Boolean(app && app.version && app.services && Object.keys(app.services).length > 0)
}

export async function getApp(filename: string, yaml: string) {
  const composeFiles = getComposeFiles()
  const app = YAML.parse(yaml) as ComposeJSON
  if (!validateComposeJSON(app)) {
    throw new Error(`Invalid YAML: \n${yaml}`)
  }

  const state = await getAppsState()
  const key = getServiceKey(app)
  const runtime = state[key]
  const title = getAppTitle(app)
  const logo = getAppLogo(app)
  const appData = {
    ...app,
    filename,
    id: filename,
    enabled: composeFiles.includes(filename),
    key,
    runtime,
    name: path.basename(filename, '.yml'),
    title,
    logo,
  } satisfies ComposeJSONExtra
  return appData as ComposeJSONExtra
}

export async function getApps() {
  loadAppsEnv()
  const configFolder = env.configFolder
  const composeFiles = getComposeFiles()
  const dir = await fs.readdir(configFolder)
  const ymls = dir.filter((d) => path.extname(d) === '.yml')
  const promises = ymls.map((y) => fs.readFile(path.join(configFolder, y), 'utf-8'))
  const texts = await Promise.all(promises)
  const apps = texts
    .map((t, i) => ({
      filename: ymls[i],
      app: YAML.parse(t) as ComposeJSON
    }))
    .filter(({ app }) => validateComposeJSON(app))

  const state = await getAppsState()
  const appsData = apps.map(({ app, filename }) => {
    const key = getServiceKey(app)
    const runtime = state[key]
    const title = getAppTitle(app)
    const logo = getAppLogo(app)
    return {
      ...app,
      filename,
      id: filename,
      enabled: composeFiles.includes(filename),
      key,
      runtime,
      title,
      logo,
    }
  }) as ComposeJSONExtra[]
  return appsData as ComposeJSONExtra[]
}

export function getServiceKey(app: ComposeJSON) {
  const appKey = app['x-sundash']?.service
  const defaultKey = Object.keys(app.services || {})[0]
  return appKey || defaultKey
}

export function getAppTitle(app: ComposeJSON) {
  const appTitle = app['x-sundash']?.title
  const key = getServiceKey(app)
  const defaultTitle = app.services[key].container_name || key
  return appTitle || defaultTitle
}

export function getAppLogo(app: ComposeJSON) {
  return app['x-sundash']?.logo || `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${getServiceKey(app)}.png`
}

export async function saveApp({ name, compose }: { name: string; compose: string }) {
  const fullPath = path.join(
    env.configFolder,
    name
  )
  await fs.writeFile(fullPath, compose)
}

export function getStateColor(app: ComposeJSONExtra) {
  if (!app.runtime) {
    return 'bg-zinc-300'
  }
  if (app.runtime?.state === 'up') {
    return 'bg-green-500'
  }
  return 'bg-red-500'
}

export function getStateTitle(app: ComposeJSONExtra) {
  if (!app.runtime) {
    return 'Not created'
  }
  if (app.runtime?.state === 'up') {
    return 'Running'
  }
  return 'Not running'
}

