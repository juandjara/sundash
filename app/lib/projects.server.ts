import { withRedis } from "~/lib/db.server"
import type { IDockerComposeResult} from 'docker-compose'
import { v2 as compose } from 'docker-compose'
import fs from 'fs/promises'
import path from 'path'
import dotenv from 'dotenv'
import env from "./env.server"
import { emitter } from "./emitter.server"

export async function getProject(projectPath: string) {
  const res = await compose.config({ cwd: projectPath, commandOptions: ['--no-interpolate'] })
  if (res.exitCode !== 0) {
    throw new Error(String(res.err || res.out))
  }

  let env = {} as Record<string, string>
  if (await fs.stat(path.join(projectPath, '.env'))) {
    const envfile = await fs.readFile(path.join(projectPath, '.env'), { encoding: 'utf-8' })
    env = dotenv.parse(envfile)
  }

  const config = res.data.config as typeof res.data.config & { name: string }
  return {
    ...config,
    path: projectPath,
    env,
  }
}

export async function getProjects() {
  const paths = await withRedis(async (db) => {
    const names = await db.smembers('projects')
    const paths = names.length ? await db.mget(names.map((name) => `project:${name}`)) : []
    return paths
  })

  const existingPaths = paths.filter(Boolean) as string[]
  return Promise.all(existingPaths.map(async (path) => {
    const res = await compose.config({ cwd: path })

    if (res.exitCode !== 0) {
      throw new Error(res.err || res.out)
    }

    const config = res.data.config as typeof res.data.config & { name: string }
    return {
      ...config,
      path
    }
  }))
}

export async function getPS(psPath: string) {
  const normalizedPath = path.join(psPath)
  const res = await compose.ps({
    cwd: normalizedPath,
    commandOptions: ['--all', ['--format', 'json']]
  })
  try {
    const servicesRaw = JSON.parse(`[${res.out.trim().replace(/\}\{/g, '},{')}]`)
    return {
      services: servicesRaw.map(parseService) as PsService[],
    }
  } catch (err) {
    throw new Error('Error parsing stdout JSON')
  }
}

export type PsService = ReturnType<typeof parseService>

function parseService(composeService: any) {
  return {
    created: composeService.CreatedAt,
    id: composeService.ID,
    image: composeService.Image as string,
    name: composeService.Name as string,
    state: composeService.State as 'paused' | 'restarting' | 'removing' | 'running' | 'dead' | 'created' | 'exited',
    status: composeService.Status as string,
    service: composeService.Service as string,
  }
}

export async function getLogs(service: string, configFilename: string) {
  const res = await compose.logs(service, {
    cwd: env.configFolder,
    config: configFilename,
    commandOptions: ['--no-color', '--tail', '100'],
  })
  const msg = parseComposeResult(res)
  return msg
}

function parseComposeResult(res: IDockerComposeResult) {
  if (res.exitCode !== 0) {
    throw new Error(String(res.err || res.out))
  }
  return res.out || res.err || ''
}

type DockerCommand = {
  filename: string
  key: string
  op: 'enable' | 'disable' | 'delete' | 'start' | 'stop' | 'restart' | 'kill' | 'up' | 'down' | 'pull'
}

export async function handleDockerOperation({ filename, key, op }: DockerCommand) {
  if (op === 'restart') {
    const res = await compose.restartOne(key, {
      cwd: env.configFolder,
      config: filename,
      callback: (chunk) => emitter.emit('message', chunk.toString()),
    })
    return parseComposeResult(res)
  }
}
