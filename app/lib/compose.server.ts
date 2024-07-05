import type Dockerode from "dockerode"
import { getAllContainers } from "./docker.server"
import { type IDockerComposeResult, v2 as compose } from 'docker-compose'
import { emitter } from "./emitter.server"
import { ComposeLabels } from "./docker.util"
import env from "./env.server"
import path from 'node:path'
import fs from 'node:fs/promises'
import { removeFromDotEnv } from "./envfile.server"
import fileExists from "./fileExists"

export type BaseProject = {
  dir: string
  key: string
  configFiles: string[]
  envFiles: string[]
}

export type Project = BaseProject & {
  containers: Awaited<ReturnType<typeof getAllContainers>>
}

export function getBaseProject(container: Dockerode.ContainerInfo): BaseProject {
  const key = container.Labels[ComposeLabels.PROJECT]
  const dir = container.Labels[ComposeLabels.PROJECT_DIR]
  const configFiles = (container.Labels[ComposeLabels.PROJECT_CONFIG_FILES] || '').split(',').filter(Boolean)
  const envFiles = (container.Labels[ComposeLabels.PROJECT_ENV_FILES] || '').split(',').filter(Boolean)

  return {
    dir,
    key,
    configFiles,
    envFiles,
  } satisfies BaseProject
}

export async function getProjectsFromContainers() {
  const containers = await getAllContainers()
  const groups: Record<string, Project> = {}
  for (const container of containers) {
    const { key, dir, configFiles, envFiles } = getBaseProject(container)

    if (!groups[key]) {
      const base = {
        dir,
        key,
        configFiles,
        envFiles,
      }

      groups[key] = {
        ...base,
        containers: [],
      }
    }
    groups[key].containers.push(container)
  }

  return Object.values(groups)
}

export async function getProjectFromKey(key: string) {
  const containers = await getAllContainers()
  const projectContainers = containers.filter((container) => container.Labels[ComposeLabels.PROJECT] === key)
  const first = projectContainers[0]
  if (!first) {
    return null
  }

  const baseProject = getBaseProject(first)

  return {
    ...baseProject,
    containers: projectContainers,
  }
}

export async function getComposeConfig(project: BaseProject) {
  const res = await compose.config({
    config: project.configFiles,
    composeOptions: project.envFiles.length ? ['--env-file', ...project.envFiles] : []
  })
  return res.out
}

function parseComposeResult(res: IDockerComposeResult) {
  if (res.exitCode !== 0) {
    throw new Error(String(res.err || res.out || `Error: ${JSON.stringify(res)}`))
  }
  return res.out || res.err || ''
}

export async function getComposeLogs({
  key,
  envFiles,
  configFiles,
  isSingleService,
  projectFolder
}: {
  key: string,
  envFiles: string[],
  configFiles: string[],
  isSingleService: boolean
  projectFolder: string
}) {
  const target = isSingleService ? key : []
  const fileParams = {
    config: configFiles.map((f) => path.join(env.configFolder, projectFolder, f)),
    commandOptions: ['--tail', '100'],
    composeOptions: envFiles.length
      ? ['--env-file', ...envFiles.map((f) => path.join(env.configFolder, projectFolder, f))]
      : [],
  }

  compose.logs(target, {
    ...fileParams,
    commandOptions: ['--follow', '--tail', '100'],
    callback: (chunk) => emitter.emit(`log:${key}`, chunk.toString()),
  }).catch(err => {
    console.error(`Error getting logs for ${key}\n`, err)
  })

  const res = await compose.logs(target, fileParams)
  const msg = parseComposeResult(res)
  return msg
}

export type FileOperation = 'delete' | 'enable' | 'disable'
export type ComposeOperation = 'up' | 'down' | 'restart' | 'pull' | 'stop' | 'start'

export async function handleComposeOperation({
  op,
  key,
  configFiles,
  envFiles,
  projectFolder
}: {
  op: ComposeOperation,
  key: string,
  configFiles: string[]
  envFiles: string[]
  projectFolder: string
}) {
  try {
    const opMap = {
      up: compose.upAll,
      down: compose.down,
      restart: compose.restartAll,
      pull: compose.pullAll,
      stop: compose.stop,
      start: compose.restartAll,
    }
    const method = opMap[op]
    const res = await method({
      config: configFiles.map((f) => path.join(env.configFolder, projectFolder, f)),
      composeOptions: envFiles.length
        ? ['--env-file', ...envFiles.map((f) => path.join(env.configFolder, projectFolder, f))]
        : [],
      callback: (chunk) => emitter.emit(`log:${key}`, chunk.toString()),
    })
    const msg = parseComposeResult(res)
    return msg
  } catch (err) {
    if (err instanceof Response) {
      throw err
    }
    return parseComposeResult(err as any)
  }
}

function isSubDirectory(parent: string, child: string) {
  return path.relative(child, parent).startsWith('..')
}

export function getValidEditPath(projectFolder: string, filePath: string) {
  if (!isSubDirectory(env.configFolder, projectFolder)) {
    throw new Error(`Invalid project folder: ${projectFolder}. Must be a subdirectory of ${env.configFolder}`)
  }
  if (!isSubDirectory(projectFolder, filePath!)) {
    throw new Error(`Invalid file path: ${filePath}. Must be a subdirectory of ${projectFolder}`)
  }
  const fullPath = path.join(env.configFolder, projectFolder, filePath)
  return fullPath
}

export async function deleteProject(projectFolder: string) {
  if (!isSubDirectory(env.configFolder, projectFolder)) {
    throw new Error(`Invalid project folder: ${projectFolder}. Must be a subdirectory of ${env.configFolder}`)
  }
  const fullPath = path.join(env.configFolder, projectFolder)
  const exists = await fileExists(fullPath)
  if (!exists) {
    throw new Error(`Folder not found: ${fullPath}`)
  }

  await fs.rm(fullPath, { recursive: true })
}

export async function deleteProjectFile(projectFolder: string, file: string) {
  const fullPath = getValidEditPath(projectFolder, file)
  const exists = await fileExists(fullPath)
  if (!exists) {
    throw new Error(`File not found: ${fullPath}`)
  }

  await Promise.all([
    removeFromDotEnv(projectFolder, file),
    fs.rm(fullPath, { recursive: true })
  ])
}

export async function saveFile({ projectFolder, filePath, compose }: {
  projectFolder: string
  filePath: string
  compose: string
}) {
  const fullPath = getValidEditPath(projectFolder, filePath)
  await fs.writeFile(fullPath, compose)
  return fullPath
}

export async function createProject(projectFolder: string) {
  if (!isSubDirectory(env.configFolder, projectFolder)) {
    throw new Error(`Invalid project folder: ${projectFolder}. Must be a subdirectory of ${env.configFolder}`)
  }

  const ls = await fs.readdir(env.configFolder, { recursive: true })
  const exists = ls.includes(projectFolder)
  if (exists) {
    throw new Error(`Project folder already exists: ${projectFolder}`)
  }

  const fullPath = path.join(env.configFolder, projectFolder)
  await fs.mkdir(fullPath)
  return fullPath
}
