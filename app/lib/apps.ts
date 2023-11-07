import env from "./env.server"
import fs from 'fs/promises'
import path from 'path'
import YAML from 'yaml'

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
    // TODO add this:
    // name: string
    // description: string
    // icon: string
    // url: string
    // category: string
  }
}

export async function getApps() {
  const configFolder = env.configFolder
  const dir = await fs.readdir(configFolder)
  const ymls = dir.filter((d) => path.extname(d) === '.yml')
  const promises = ymls.map((y) => fs.readFile(path.join(configFolder, y), 'utf-8'))
  const texts = await Promise.all(promises)
  const apps = texts.map((t) => YAML.parse(t) as ComposeJSON)
  return apps
}

export function getServiceKey(app: ComposeJSON) {
  const appKey = app['x-sundash']?.main_container
  const defaultKey = Object.keys(app.services || {})[0]
  return appKey || defaultKey
}

export function getAppTitle(app: ComposeJSON) {
  const appTitle = app['x-sundash']?.title
  const defaultTitle = app.services[getServiceKey(app)].container_name
  return appTitle || defaultTitle
}

export function getAppLogo(app: ComposeJSON) {
  return app['x-sundash']?.logo || `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${getServiceKey(app)}.png`
}
