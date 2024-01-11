import type Dockerode from "dockerode"
import { getAllContainers } from "./docker.server"
import { type IDockerComposeResult, v2 as compose } from 'docker-compose'
import { emitter } from "./emitter.server"

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
  const key = container.Labels['com.docker.compose.project']
  const dir = container.Labels['com.docker.compose.project.working_dir']
  const configFiles = (container.Labels['com.docker.compose.project.config_files'] || '').split(',').filter(Boolean)
  const envFiles = (container.Labels['com.docker.compose.project.environment_file'] || '').split(',').filter(Boolean)

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
  const projectContainers = containers.filter((container) => container.Labels['com.docker.compose.project'] === key)
  const first = projectContainers[0]

  if (!first) {
    throw new Response('Project not found', { status: 404 })
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

export async function getComposeLogs(project: BaseProject) {
  compose.logs([], {
    config: project.configFiles,
    composeOptions: project.envFiles.length ? ['--env-file', ...project.envFiles] : [],
    commandOptions: ['--follow'],
    callback: (chunk) => emitter.emit(`log:${project}`, chunk.toString()),
  })
  const res = await compose.logs([], {
    config: project.configFiles,
    composeOptions: project.envFiles.length ? ['--env-file', ...project.envFiles] : [],
  })
  const msg = parseComposeResult(res)
  return msg
}

type ComposeOperation = 'up' | 'down' | 'restart' | 'pull' | 'stop' | 'start'

export async function handleComposeOperation(project: BaseProject, op: ComposeOperation) {
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
      config: project.configFiles,
      composeOptions: project.envFiles.length ? ['--env-file', ...project.envFiles] : [],
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
