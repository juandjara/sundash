import dotenv from 'dotenv'
import env from "./env.server"
import fs from 'fs/promises'
import path from 'path'
import { emitter } from "./emitter.server"

export function loadAppsEnv() {
  const vars = dotenv.config({ path: path.join(env.configFolder, '.env') }) as NodeJS.ProcessEnv
  return {
    NODE_ENV: vars.NODE_ENV || 'development',
    COMPOSE_PATH_SEPARATOR: vars.COMPOSE_PATH_SEPARATOR || ':',
    COMPOSE_FILE: vars.COMPOSE_FILE || 'docker-compose.yml',
  } as NodeJS.ProcessEnv
}

export function getComposeFiles() {
  const configFolderENV = dotenv.config({ path: path.join(env.configFolder, '.env') })
  const separator = configFolderENV.parsed?.COMPOSE_PATH_SEPARATOR || ':'
  const composeFiles = (configFolderENV.parsed?.COMPOSE_FILE || 'docker-compose.yml').split(separator)
  return composeFiles
}

export async function addToDotEnv(filename: string) {
  const configFolderENV = dotenv.config({ path: path.join(env.configFolder, '.env') })
  const separator = configFolderENV.parsed?.COMPOSE_PATH_SEPARATOR || ':'
  const fileListText = configFolderENV.parsed?.COMPOSE_FILE || ''
  const composeFiles = new Set(fileListText.split(separator))
  composeFiles.add(filename)

  const newDotEnv = Object.entries({
    ...configFolderENV.parsed,
    COMPOSE_PATH_SEPARATOR: separator,
    COMPOSE_FILE: Array.from(composeFiles).join(separator),
  })
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  await fs.writeFile(path.join(env.configFolder, '.env'), newDotEnv)
  emitter.emit('message', `Added ${filename} to .env`)
}

export async function removeFromDotEnv(filename: string) {
  const configFolderENV = dotenv.config({ path: path.join(env.configFolder, '.env') })
  const separator = configFolderENV.parsed?.COMPOSE_PATH_SEPARATOR || ':'
  const fileListText = configFolderENV.parsed?.COMPOSE_FILE || ''
  const composeFiles = new Set(fileListText.split(separator))
  composeFiles.delete(filename)

  const newDotEnv = Object.entries({
    ...configFolderENV.parsed,
    COMPOSE_PATH_SEPARATOR: separator,
    COMPOSE_FILE: Array.from(composeFiles).join(separator),
  })
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  await fs.writeFile(path.join(env.configFolder, '.env'), newDotEnv)
  emitter.emit('message', `Removed ${filename} from .env`)
}
