import dotenv from 'dotenv'
import env from "./env.server"
import fs from 'fs/promises'
import path from 'path'

export function getComposeFiles() {
  const configFolderENV = dotenv.config({ path: path.join(env.configFolder, '.env') })
  const separator = configFolderENV.parsed?.COMPOSE_FILE_SEPARATOR || ':'
  const composeFiles = (configFolderENV.parsed?.COMPOSE_FILE || 'docker-compose.yml').split(separator)
  return composeFiles
}

export function addToDotEnv(filename: string) {
  const configFolderENV = dotenv.config({ path: path.join(env.configFolder, '.env') })
  const separator = configFolderENV.parsed?.COMPOSE_FILE_SEPARATOR || ':'
  const fileListText = configFolderENV.parsed?.COMPOSE_FILE || ''
  const composeFiles = new Set(fileListText.split(separator))
  composeFiles.add(filename)

  const newDotEnv = Object.entries({
    ...configFolderENV.parsed,
    COMPOSE_FILE_SEPARATOR: separator,
    COMPOSE_FILE: Array.from(composeFiles).join(separator),
  })
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  return fs.writeFile(path.join(env.configFolder, '.env'), newDotEnv)
}

export function removeFromDotEnv(filename: string) {
  const configFolderENV = dotenv.config({ path: path.join(env.configFolder, '.env') })
  const separator = configFolderENV.parsed?.COMPOSE_FILE_SEPARATOR || ':'
  const fileListText = configFolderENV.parsed?.COMPOSE_FILE || ''
  const composeFiles = new Set(fileListText.split(separator))
  composeFiles.delete(filename)

  const newDotEnv = Object.entries({
    ...configFolderENV.parsed,
    COMPOSE_FILE_SEPARATOR: separator,
    COMPOSE_FILE: Array.from(composeFiles).join(separator),
  })
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  return fs.writeFile(path.join(env.configFolder, '.env'), newDotEnv)
}
