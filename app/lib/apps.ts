import env from "./env.server"
import fs from 'fs/promises'
import path from 'path'
import YAML from 'yaml'
import type { PsService} from "./docker.server"
import { getAllContainers, getComposeConfig, getPS } from "./docker.server"
import { getComposeFiles } from "./envfile.server"
import type Dockerode from "dockerode"

export type XSundash = {
  title: string
  logo?: string
  service: string
  hasAuth?: boolean
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
  networks?: {
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

export async function getAppsState(files: string[]) {
  const configFolder = env.configFolder
  const { services } = await getPS(configFolder, files)
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
  const composeFiles = await getComposeFiles()
  const app = YAML.parse(yaml) as ComposeJSON
  if (!validateComposeJSON(app)) {
    throw new Error(`Invalid YAML: \n${yaml}`)
  }

  const state = await getAppsState(composeFiles)
  const title = getAppTitle(app)
  const logo = getAppLogo(app)
  const key = getServiceKey(app)
  const runtime = state[key]
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

type Runtime = {
  service: string
  status: string
  state: string
}

export type Project = {
  dir: string
  project: string
  configFiles: string[]
  envFiles: string[]
  containers: Record<string, Dockerode.ContainerInfo>
  config: ComposeJSON
  title: string
  logo: string
  key: string
  runtime: Runtime
}

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export async function getAppsFromContainers() {
  const containers = await getAllContainers()
  const groups: Record<string, Optional<Project, 'runtime'>> = {}
  for (const container of containers) {
    const service = container.Labels['com.docker.compose.service']
    const project = container.Labels['com.docker.compose.project']
    const dir = container.Labels['com.docker.compose.project.working_dir']
    const configFiles = (container.Labels['com.docker.compose.project.config_files'] || '').split(',').filter(Boolean)
    const envFiles = (container.Labels['com.docker.compose.project.environment_file'] || '').split(',').filter(Boolean)

    if (!groups[project]) {
      // it is supposed that files contains only references to valid compose files since we get it from docker
      const yamlText = await getComposeConfig(configFiles, envFiles)
      const config = YAML.parse(yamlText) as ComposeJSON
      const title = getAppTitle(config)
      const logo = getAppLogo(config)
      const key = getServiceKey(config)

      groups[project] = {
        dir,
        project,
        configFiles,
        envFiles,
        containers: {},
        config,
        title,
        logo,
        key,
        runtime: undefined,
      }
    }
    groups[project].containers[service] = container
  }

  const projects = Object.values(groups)

  for (const project of projects) {
    if (project.containers[project.key]) {
      const { State, Status } = project.containers[project.key]
      project.runtime = {
        service: project.key,
        state: State,
        status: Status,
      }
    }
  }

  return projects as Project[]
}

export async function getApps() {
  const configFolder = env.configFolder
  const composeFiles = await getComposeFiles()
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

  const state = await getAppsState(composeFiles)
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
  const appKey = app?.['x-sundash']?.service
  const defaultKey = Object.keys(app?.services || {})[0]
  return appKey || defaultKey
}

export function getAppTitle(app: ComposeJSON) {
  const appTitle = app?.['x-sundash']?.title
  const key = getServiceKey(app)
  const defaultTitle = app?.services[key]?.container_name || key
  return appTitle || defaultTitle
}

export function getAppLogo(app: ComposeJSON) {
  return app?.['x-sundash']?.logo || `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${getServiceKey(app)}.png`
}

export async function saveApp({ name, compose }: { name: string; compose: string }) {
  const fullPath = path.join(
    env.configFolder,
    name
  )
  await fs.writeFile(fullPath, compose)
}

export type ContainerState = 'created' | 'restarting' | 'running' | 'paused' | 'exited' | 'dead' | undefined

export function getStateColor(state: ContainerState) {
  if (!state || state === 'created') {
    return 'bg-zinc-300'
  }
  if (state === 'exited') {
    return 'bg-red-100'
  }
  if (state === 'running') {
    return 'bg-green-500'
  }
  if (state === 'paused') {
    return 'bg-green-100'
  }
  if (state === 'restarting') {
    return 'bg-yellow-500'
  }
  return 'bg-red-500'
}

export function getStateTitle(app: Project) {
  if (!app?.runtime) {
    return 'Not created'
  }
  if (app.runtime?.state === 'running') {
    return 'Running'
  }
  return 'Not running'
}

export function getLogoFromContainer(container: Dockerode.ContainerInfo) {
  const labels = container?.Labels || {}
  const service = labels['com.docker.compose.service']
  const logo = labels['dev.sundash.logo'] || `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${service}.png`
  return logo
}
