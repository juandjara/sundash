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

export async function getPS(path: string) {
  const res = await compose.ps({ cwd: path, commandOptions: ['--all', '--services'] })
  if (res.exitCode !== 0) {
    throw new Error(String(res.err || res.out))
  }

  return res.data
}
