import env from "./env.server"
import fs from 'fs/promises'
import path from 'path'
import YAML from 'yaml'
import type { PsService} from "./projects.server"
import { getPS } from "./projects.server"
import dotenv from 'dotenv'

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
  enabled: boolean
  runtime?: PsService
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
  return Boolean(app && app.version && app.services && Object.keys(app.services).length > 0)
}

async function fileExists(filename: string) {
  try {
    await fs.access(filename, fs.constants.R_OK) // check file exists and is readable
    return true
  } catch (err) {
    return false
  }
}

export async function getApp(filename: string) {
  const configFolder = env.configFolder
  const fullPath = path.join(configFolder, filename)
  const composeFiles = getEnabledAppFiles()

  if (!(await fileExists(fullPath))) {
    throw new Error(`File not found: ${fullPath}`)
  }

  const text = await fs.readFile(fullPath, 'utf-8')
  const app = YAML.parse(text) as ComposeJSON
  if (!validateComposeJSON(app)) {
    throw new Error(`Invalid compose file: ${fullPath}`)
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
    title,
    logo,
  } satisfies ComposeJSONExtra
  return appData as ComposeJSONExtra
}

function getEnabledAppFiles() {
  const configFolderENV = dotenv.config({ path: path.join(env.configFolder, '.env') })
  const separator = configFolderENV.parsed?.COMPOSE_FILE_SEPARATOR || ':'
  const composeFiles = (configFolderENV.parsed?.COMPOSE_FILE || 'docker-compose.yml').split(separator)
  return composeFiles
}

export async function getApps() {
  const configFolder = env.configFolder
  const composeFiles = getEnabledAppFiles()
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
    name.endsWith('.yml') ? name : `${name}.yml`
  )
  await fs.writeFile(fullPath, compose)
}

export function getStateColor(app: ComposeJSONExtra) {
  if (app.runtime?.state === 'running') {
    return 'bg-green-500'
  }
  if (app.runtime?.state === 'exited') {
    return 'bg-red-300'
  }
  if (app.runtime?.state === 'removing'  || app.runtime?.state === 'restarting') {
    return 'bg-yellow-500'
  }
  return 'bg-zinc-300'
}

export function getStateTitle(app: ComposeJSONExtra) {
  if (app.runtime?.state === 'running') {
    return 'Running'
  }
  if (app.runtime?.state === 'exited' || app.runtime?.state === 'created') {
    return 'Stopped'
  }
  if (app.runtime?.state === 'restarting') {
    return 'Restarting'
  }
  if (app.runtime?.state === 'removing') {
    return 'Removing'
  }
  if (!app.runtime) {
    return 'Not created'
  }
  return 'Not running'
}

