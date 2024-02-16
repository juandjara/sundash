import env from "./env.server"
import fs from 'fs/promises'
import path from 'path'
import fileExists from "./fileExists"

export function parseEnvFileText(envText: string) {
  const envVars = {} as Record<string, string>
  envText.split('\n').forEach((line) => {
    const [key, value] = line.split('=')
    if (key && value) {
      envVars[key] = value
    }
  })
  return envVars
}

export async function readEnvFile(projectFolder: string) {
  const text = await fs.readFile(
    path.join(env.configFolder, projectFolder, '.env'),
    { encoding: 'utf8' }
  )
  return parseEnvFileText(text)
}

const COMPOSE_DEFAULT_SEPARATOR = ':' as const

export async function addToDotEnv(projectFolder: string, filename: string) {
  const envFile = path.join(env.configFolder, projectFolder, '.env')
  const envExists = await fileExists(envFile)
  if (!envExists) {
    return
  }

  const configFolderENV = await readEnvFile(projectFolder)
  const separator = configFolderENV.COMPOSE_PATH_SEPARATOR || COMPOSE_DEFAULT_SEPARATOR
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

  await fs.writeFile(
    path.join(env.configFolder, projectFolder, '.env'),
    newDotEnv
  )
}

export async function removeFromDotEnv(projectFolder: string, filename: string) {
  const envFile = path.join(env.configFolder, projectFolder, '.env')
  const envExists = await fileExists(envFile)
  if (!envExists) {
    return
  }

  const configFolderENV = await readEnvFile(projectFolder)
  const separator = configFolderENV.COMPOSE_PATH_SEPARATOR || COMPOSE_DEFAULT_SEPARATOR
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

  await fs.writeFile(
    path.join(env.configFolder, projectFolder, '.env'),
    newDotEnv
  )
}
