import env from "./env.server"
import fs from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import { type ComposeJSON, validateComposeJSON } from "./apps"
import { parseEnvFileText } from "./envfile.server"

function parseComposeText(yamlText: string) {
  try {
    const yaml = YAML.parse(yamlText)
    const isValid = validateComposeJSON(yaml)
    return isValid ? yaml : null
  } catch {
    return null
  }
}

export async function readConfigFolder() {
  const ls = await fs.readdir(env.configFolder, { recursive: true })

  const envFiles = [] as string[]
  const envContentMap = new Map<string, Record<string, string>>()

  const ymlFiles = [] as string[]
  const ymlContentMap = new Map<string, ComposeJSON>()

  for (const file of ls) {
    const name = path.basename(file)    
    if (name.startsWith('.env')) {
      const envText = await fs.readFile(path.join(env.configFolder, file), 'utf-8')
      const envJSON = parseEnvFileText(envText)
      envContentMap.set(file, envJSON)
      envFiles.push(file)
    }
    if (name.endsWith('.yml')) {
      const ymlText = await fs.readFile(path.join(env.configFolder, file), 'utf-8')
      const composeJSON = parseComposeText(ymlText)
      if (!composeJSON) {
        continue
      }
      ymlContentMap.set(file, composeJSON)
      ymlFiles.push(file)
    }
  }

  const usedYmls = [] as string[]

  const projectFolders = [...new Set(envFiles.map((f) => path.dirname(f)))]
  const envProjects = projectFolders.map((f) => {
    const name = path.basename(f)
    const envFile = envFiles.find((e) => e === path.join(f, '.env')) || ''

    const ymls = ymlFiles.filter((e) => e.startsWith(f))
    usedYmls.push(...ymls)

    const envFileContent = envContentMap.get(envFile)

    return {
      name: envFileContent?.COMPOSE_PROJECT_NAME || name,
      folder: f,
      envFile: {
        path: path.relative(f, envFile),
        content: envFileContent,
      },
      ymlFiles: ymls.map((y) => ({
        path: path.relative(f, y),
        content: ymlContentMap.get(y),
      }))
    }
  })

  const notUsedYmls = ymlFiles.filter((y) => !usedYmls.includes(y))
  const singleFileProjects = notUsedYmls.map((y) => {
    const folder = path.dirname(y)
    const name = ['compose', 'docker-compose'].includes(path.basename(y, '.yml'))
      ? path.basename(folder)
      : path.basename(y, '.yml')

    return {
      name,
      folder,
      envFile: null,
      ymlFiles: [{
        path: path.relative(folder, y),
        content: ymlContentMap.get(y),
      }],
    }
  })

  const projects = [...envProjects, ...singleFileProjects]
  console.log('projects', projects)

  return projects
}
