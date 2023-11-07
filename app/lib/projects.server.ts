import { withRedis } from "~/lib/db.server"
import { v2 as compose } from 'docker-compose'
import fs from 'fs/promises'
import path from 'path'
import dotenv from 'dotenv'

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
    command: composeService.Command,
    created: composeService.CreatedAt,
    id: composeService.ID,
    image: composeService.Image,
    name: composeService.Name,
    ports: composeService.Ports,
    state: composeService.State,
    status: composeService.Status,
    labels: Object.fromEntries(composeService.Labels.split(',').map((l: string) => l.split('='))),
    service: composeService.Service,
    mounts: composeService.Mounts,
    networks: composeService.Networks,
  }
}
