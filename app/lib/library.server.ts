import env from "./env.server"
import fs from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import { type ComposeJSON, validateComposeJSON, getAppTitle, getAppLogo, getServiceKey } from "./apps"
import { parseEnvFileText } from "./envfile.server"
import type Dockerode from "dockerode"
import { type ContainerState } from "./docker.server"
import { ComposeLabels, SundashLabels, defaultLogo } from "./docker.util"

function getComposeJSONMeta({ filename, composeJSON, envJSON }: {
  filename: string
  composeJSON: ComposeJSON
  envJSON?: Record<string, string>
}) {
  const title = getAppTitle(composeJSON)
  const logo = getAppLogo(composeJSON)
  const serviceKey = getServiceKey(composeJSON)
  const { COMPOSE_FILE, COMPOSE_PATH_SEPARATOR } = envJSON || {}
  const files = COMPOSE_FILE?.split(COMPOSE_PATH_SEPARATOR) || []
  const enabled = files.length ? files.includes(filename) : true

  return { title, logo, serviceKey, enabled }
}

function parseComposeText(yamlText: string) {
  try {
    const yaml = YAML.parse(yamlText)
    const isValid = validateComposeJSON(yaml)
    return isValid ? yaml : null
  } catch {
    return null
  }
}

const PRIVATE_PREFIX = '_'

export type LibraryProject = {
  key: string
  folder: string
  envFile: {
    path: string
    content: Record<string, string> | undefined
  } | null
  ymlFiles: {
    path: string
    content: ComposeJSON | undefined
    meta: ReturnType<typeof getComposeJSONMeta>
  }[]
}

export async function readConfigFolder() {
  const ls = await fs.readdir(env.configFolder, { recursive: true })

  const envFiles = [] as string[]
  const envContentMap = new Map<string, Record<string, string>>()

  const ymlFiles = [] as string[]
  const ymlContentMap = new Map<string, ComposeJSON>()

  for (const file of ls) {
    const name = path.basename(file)    
    if (name.startsWith('.env')) {
      const envText = await fs.readFile(path.join(env.configFolder, file), 'utf-8')
      const envJSON = parseEnvFileText(envText)
      envContentMap.set(file, envJSON)
      envFiles.push(file)
      continue
    }
    if (name.endsWith('.yml') && !name.startsWith(PRIVATE_PREFIX)) {
      const ymlText = await fs.readFile(path.join(env.configFolder, file), 'utf-8')
      const composeJSON = parseComposeText(ymlText)
      if (!composeJSON) {
        continue
      }
      ymlContentMap.set(file, composeJSON)
      ymlFiles.push(file)
    }
  }

  const usedYmls = [] as string[]

  const projectFolders = [...new Set(envFiles.map((f) => path.dirname(f)))]
  const envProjects = projectFolders.map((f) => {
    const name = path.basename(f)
    const envFile = envFiles.find((e) => e === path.join(f, '.env'))!

    const ymls = ymlFiles.filter((e) => e.startsWith(f))
    usedYmls.push(...ymls)

    const envFileContent = envContentMap.get(envFile)!

    return {
      key: envFileContent?.COMPOSE_PROJECT_NAME || name,
      folder: f,
      envFile: {
        path: path.relative(f, envFile),
        content: envFileContent,
      },
      ymlFiles: ymls.map((y) => ({
        path: path.relative(f, y),
        content: ymlContentMap.get(y)!,
        meta: getComposeJSONMeta({
          filename: path.relative(f, y),
          composeJSON: ymlContentMap.get(y)!,
          envJSON: envFileContent,
        })
      })).sort((a, b) => {
        const aNum = Number(a.meta?.enabled)
        const bNum = Number(b.meta?.enabled)
        return bNum - aNum
      })
    }
  })

  const notUsedYmls = ymlFiles.filter((y) => !usedYmls.includes(y))
  const singleFileProjects = notUsedYmls.map((y) => {
    const folder = path.dirname(y)
    const fullPath = path.join(__dirname, env.configFolder, y)
    const name = path.basename(path.dirname(fullPath))

    return {
      key: name,
      folder,
      envFile: null,
      ymlFiles: [{
        path: path.relative(folder, y),
        content: ymlContentMap.get(y)!,
        meta: getComposeJSONMeta({
          filename: path.relative(folder, y),
          composeJSON: ymlContentMap.get(y)!,
        })
      }],
    }
  })

  const projects = [...envProjects, ...singleFileProjects]

  return projects.sort((a, b) => {
    const aNum = a.ymlFiles.length
    const bNum = b.ymlFiles.length
    return bNum - aNum
  })
}

type Container = Dockerode.ContainerInfo & { State: ContainerState }

export function getDetailedServices(ymlFiles: LibraryProject['ymlFiles'], containers: Container[]) {
  const containerServiceMap = Object.fromEntries(
    containers.map((container) => [
      container.Labels[ComposeLabels.SERVICE],
      container
    ]) || []
  )

  let services = [] as {
    key: string
    logo: string
    title: string
    state: ContainerState
    status: string
    enabled: boolean
  }[]
  
  const shouldExpandServices = ymlFiles.length === 1

  if (ymlFiles.length > 0) {
    services = ymlFiles.map((yml) => {
      return Object.entries(yml.content!.services)
        .filter(([key, value], i) => {
          if (shouldExpandServices) {
            return true
          }

          return value?.labels?.[SundashLabels.MAIN] === 'true' || i === 0
        })
        .map(([key, value]) => {
          const title = value?.labels?.[SundashLabels.TITLE] || key
          const logo = value?.labels?.[SundashLabels.LOGO] || defaultLogo(key)
          const state = containerServiceMap[key]?.State
          const status = containerServiceMap[key]?.Status
          const enabled = yml.meta.enabled
          return {
            key,
            logo,
            title,
            state,
            status,
            enabled,
          }
        })
    })
    .flat()
  } else if (containers.length > 0) {
    services = containers.map((container) => {
      const key = container.Labels[ComposeLabels.SERVICE]
      const title = container.Labels[SundashLabels.TITLE] || key
      const logo = container.Labels[SundashLabels.LOGO] || defaultLogo(title)
      const state = container.State
      const status = container.Status
      return {
        key,
        logo,
        title,
        state,
        status,
        enabled: true,
      }
    })
  }

  return services
}
