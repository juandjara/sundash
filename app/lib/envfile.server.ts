import env from "./env.server"
import fs from 'fs/promises'
import path from 'path'
import { emitter } from "./emitter.server"

export async function getComposeFiles() {
  const configFolderENV = await readEnvFile()
  const separator = configFolderENV.COMPOSE_PATH_SEPARATOR || ':'
  const composeFiles = (configFolderENV.COMPOSE_FILE || 'docker-compose.yml').split(separator)
  return composeFiles
}

export async function readEnvFile() {
  const text = await fs.readFile(path.join(env.configFolder, '.env'), {
    encoding: 'utf8',
    flag: 'a+',
  })
  const envVars = {} as Record<string, string>
  text.split('\n').forEach((line) => {
    const [key, value] = line.split('=')
    if (key && value) {
      envVars[key] = value
    }
  })
  return envVars
}

export async function addToDotEnv(filename: string) {
  const configFolderENV = await readEnvFile()
  const separator = configFolderENV.COMPOSE_PATH_SEPARATOR || ':'
  const fileListText = configFolderENV.COMPOSE_FILE || ''
  const composeFiles = new Set(fileListText.split(separator))
  composeFiles.add(filename)

  const newDotEnv = Object.entries({
    ...configFolderENV,
    COMPOSE_PATH_SEPARATOR: separator,
    COMPOSE_FILE: Array.from(composeFiles).join(separator),
  })
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  await fs.writeFile(path.join(env.configFolder, '.env'), newDotEnv)
  emitter.emit('message', `Added ${filename} to .env`)
}

export async function removeFromDotEnv(filename: string) {
  const configFolderENV = await readEnvFile()
  const separator = configFolderENV.COMPOSE_PATH_SEPARATOR || ':'
  const fileListText = configFolderENV.COMPOSE_FILE || ''
  const composeFiles = new Set(fileListText.split(separator))
  composeFiles.delete(filename)

  const newDotEnv = Object.entries({
    ...configFolderENV,
    COMPOSE_PATH_SEPARATOR: separator,
    COMPOSE_FILE: Array.from(composeFiles).join(separator),
  })
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  await fs.writeFile(path.join(env.configFolder, '.env'), newDotEnv)
  emitter.emit('message', `Removed ${filename} from .env`)
}
