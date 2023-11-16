import type { IDockerComposeResult} from 'docker-compose'
import { v2 as compose } from 'docker-compose'
import path from 'path'
import env from "./env.server"
import { emitter } from "./emitter.server"
import { addToDotEnv, removeFromDotEnv } from './envfile.server'

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
  op: 'enable' | 'disable' | 'delete' | 'stop' | 'restart' | 'kill' | 'up' | 'down' | 'pull'
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
  if (op === 'up') {
    const res = await compose.upOne(key, {
      cwd: env.configFolder,
      config: filename,
      callback: (chunk) => emitter.emit('message', chunk.toString()),
    })
    return parseComposeResult(res)
  }
  if (op === 'down') {
    const res = await compose.down({
      cwd: env.configFolder,
      config: filename,
      callback: (chunk) => emitter.emit('message', chunk.toString()),
    })
    return parseComposeResult(res)
  }
  if (op === 'stop') {
    const res = await compose.stopOne(key, {
      cwd: env.configFolder,
      config: filename,
      callback: (chunk) => emitter.emit('message', chunk.toString()),
    })
    return parseComposeResult(res)
  }
  if (op === 'kill') {
    const res = await compose.kill({
      cwd: env.configFolder,
      config: filename,
      callback: (chunk) => emitter.emit('message', chunk.toString()),
    })
    return parseComposeResult(res)
  }
  if (op === 'pull') {
    const res = await compose.pullOne(key, {
      cwd: env.configFolder,
      config: filename,
      callback: (chunk) => emitter.emit('message', chunk.toString()),
    })
    return parseComposeResult(res)
  }
  if (op === 'enable') {
    return addToDotEnv(filename)
  }
  if (op === 'disable') {
    return removeFromDotEnv(filename)
  }
  if (op === 'delete') {
    throw new Error('Not implemented')
  }
}