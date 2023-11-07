import env from "./env.server"
import fs from 'fs/promises'
import path from 'path'
import YAML from 'yaml'
import type { PsService} from "./projects.server"
import { getPS } from "./projects.server"

type ComposeJSON = {
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
      labels?: string[]
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
  'x-sundash'?: {
    main_container: string
    title: string
    logo: string
    service: string
    // TODO add this:
    // name: string
    // description: string
    // icon: string
    // url: string
    // category: string
  }
}

export type ComposeJSONExtra = ComposeJSON & {
  filename: string
  id: string
  key: string
  runtime: PsService
  title: string
  logo: string
}

export async function getAppsState() {
  const configFolder = env.configFolder
  const { services } = await getPS(configFolder)
  return services.reduce((acc, s) => {
    acc[s.service] = s
    return acc
  }, {} as Record<string, PsService>)
}

// make sure the result of parsing yaml as json contains a valid docker compose file
export function validateComposeJSON(app: ComposeJSON) {
  return app && app.version && app.services && Object.keys(app.services).length > 0
}

export async function getApps() {
  const configFolder = env.configFolder
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
  return apps.map(({ app, filename }) => {
    const key = getServiceKey(app)
    const runtime = state[key]
    const title = getAppTitle(app)
    const logo = getAppLogo(app)
    return {
      ...app,
      filename,
      id: filename,
      key,
      runtime,
      title,
      logo,
    }
  }) as ComposeJSONExtra[]
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
    name.endsWith('.yml') ? name : `${name}.yml`
  )
  await fs.writeFile(fullPath, compose)
}
