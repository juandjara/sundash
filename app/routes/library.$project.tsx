import { ArrowPathIcon, PlusIcon } from "@heroicons/react/20/solid"
import {
  PencilIcon,
  TrashIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  StopIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  CloudArrowDownIcon,
  DocumentIcon,
  PlayIcon
} from "@heroicons/react/24/outline"
import { json, type LoaderArgs } from "@remix-run/node"
import { Form, Link, useActionData, useLoaderData, useNavigation, useRevalidator } from "@remix-run/react"
import clsx from "clsx"
import path from 'path'
import { useEffect, useMemo, useState } from "react"
import { useEventSource } from "remix-utils"
import AppCard from "~/components/AppCard"
import LogDisplay from "~/components/LogDisplay"
import Tooltip from "~/components/Tooltip"
import Layout from "~/components/layout"
import {
  type ComposeOperation,
  type FileOperation,
  getComposeLogs,
  getProjectFromKey,
  handleComposeOperation,
  deleteProjectFile,
  deleteProject
} from "~/lib/compose.server"
import { addToDotEnv, removeFromDotEnv } from "~/lib/envfile.server"
import { getDetailedServices, readConfigFolder } from "~/lib/library.server"
import { buttonCN } from "~/lib/styles"

export async function loader({ request, params }: LoaderArgs) {
  const key = params.project!
  const project = await getProjectFromKey(key)
  const library = await readConfigFolder()
  const libraryProject = library.find((l) => l.key === key)

  if (!project && !libraryProject) {
    throw new Response('Project not found', { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const urlService = searchParams.get('service')
  const urlFile = searchParams.get('file')

  const ymlFiles = libraryProject?.ymlFiles.filter((f) => {
    if (urlFile) {
      return f.path === urlFile
    }
    if (urlService) {
      return Object.keys(f.content.services).includes(urlService)
    }
    return true
  }) || []

  const envFiles = new Set(libraryProject?.env ? ['.env'] : [])
  
  if (project?.envFiles.length) {
    for (const file of project.envFiles) {
      envFiles.add(path.relative(project.dir, file))
    }
  }

  const configFiles = new Set(ymlFiles.map((file) => file.path))
  if (project) {
    for (const file of project.configFiles) {
      const relFile = path.relative(project.dir, file)
      if (!urlFile || relFile === urlFile) {
        configFiles.add(relFile)
      }
    }
  }

  const services = getDetailedServices(
    ymlFiles,
    project?.containers || []
  )
  const filteredServices = services.filter((s) => {
    if (urlService) {
      return s.key === urlService
    }
    return true
  })

  const logKey = services.length === 1 ? services[0].key : key

  let logs = ''
  try {
    logs = project ? await getComposeLogs({
      key: logKey,
      envFiles: [...envFiles],
      configFiles: project.configFiles,
      isSingleService: services.length === 1
    }) : ''
  } catch (err) {
    console.error(`Error getting logs for ${logKey}\n`, err)
  }

  return {
    logs,
    urlFile,
    urlService,
    project: {
      key,
      dir: project?.dir || libraryProject?.folder || '',
      rootEnv: libraryProject?.env,
      envFiles: Array.from(envFiles),
      configFiles: Array.from(configFiles),
      services: filteredServices,
      numServices: services.length,
      source: libraryProject ? 'library' : 'containers'
    }
  }
}

export async function action({ request, params }: LoaderArgs) {
  const key = params.project!
  const fd = await request.formData()
  const op = fd.get('op') as ComposeOperation | FileOperation
  const envFiles = (fd.get('envFiles') as string).split(',').filter(Boolean)
  const configFiles = (fd.get('configFiles') as string).split(',').filter(Boolean)
  const projectFolder = fd.get('folder') as string

  try {
    if (op === 'delete') {
      if (configFiles.length === 1) {
        await deleteProjectFile(key, projectFolder, configFiles[0])
        return json({ msg: `File ${configFiles[0]} deleted` })
      } else {
        await deleteProject(projectFolder)
        return json({ msg: 'Project deleted' })
      }
    }

    if (op === 'disable') {
      await removeFromDotEnv(projectFolder, configFiles[0])
      return json({ msg: 'Service disabled' })
    }

    if (op === 'enable') {
      await addToDotEnv(projectFolder, configFiles[0])
      return json({ msg: 'Service enabled' })
    }

    const res = await handleComposeOperation({
      op,
      key,
      envFiles: envFiles.filter(Boolean) as string[],
      configFiles: configFiles.filter(Boolean) as string[],
    })
    return json({ msg: res })
  } catch (err) {
    if (err instanceof Response) {
      throw err
    }

    const msg = String((err as Error).message)
    return json({ error: msg })
  }
}

function useLogs(id: string, initialLogs = '') {
  const [logs, setLogs] = useState(initialLogs.split('\n'))
  const lastLog = useEventSource(`/api/logs?id=${id}`, { event: `log:${id}` })

  useEffect(() => {
    if (lastLog) {
      setLogs((prev) => [...prev, lastLog])
    }
  }, [lastLog])

  useEffect(() => {
    setLogs(initialLogs.split('\n'))
  }, [initialLogs])

  return logs
}

export default function ProjectDetail() {
  const { project, logs: initialLogs, urlService, urlFile } = useLoaderData<typeof loader>()
  const logKey = project.services.length === 1 ? project.services[0].key : project.key

  const logs = useLogs(logKey, initialLogs)
  const isRunning = project.services.some((s) => s.state === 'running')
  const hasContainer = project.services.some((s) => s.state)
  const revalidator = useRevalidator()
  const subtitle = urlService || urlFile || ''
  const service = project.services.length === 1 ? project.services[0] : null

  const actionData = useActionData()
  const fullLogs = useMemo(() => {
    const actionMsg = actionData?.msg || actionData?.error
    return actionMsg ? [...logs, actionMsg] : logs
  }, [logs, actionData])

  const transition = useNavigation()
  const busy = transition.state !== 'idle'
  const areFilesDefinedByEnv = !!project.rootEnv?.COMPOSE_FILE

  const deleteButton = (
    <button
      aria-disabled={busy || hasContainer}
      name="op"
      value="delete"
      onClick={(ev) => {
        if (!confirm(`This action will remove all files associated with the ${service ? 'service' : 'project'}. Are you sure? This action cannot be undone.`)) {
          ev.preventDefault()
          ev.stopPropagation()
        }
      }}
      className={clsx(
        buttonCN.normal,
        buttonCN.delete,
        buttonCN.iconLeft,
        'border-2 border-red-200',
      )}
    >
      <TrashIcon className="w-5 h-5" />
      <p>Delete</p>
    </button>
  )

  const editButton = (
    <button
      type="button"
      aria-disabled={project.source !== 'library'}
      className={clsx(buttonCN.normal, buttonCN.outline, buttonCN.iconLeft)}
    >
      <PencilIcon className="w-5 h-5" />
      <p>Edit</p>
    </button>
  )

  return (
    <Layout>
      <Link to={subtitle ? `/library/${project.key}` : '/'}>
        <button type="button" className={clsx('mb-4 text-zinc-500', buttonCN.small, buttonCN.transparent, buttonCN.iconLeft)}>
          <ArrowLeftIcon className="w-5 h-5" />
          <p>Back</p>
        </button>
      </Link>
      <section className="flex flex-wrap gap-4 items-end mb-4 md:px-2">
        <p className="flex-grow">
          <span className="text-2xl font-semibold capitalize">{project.key}</span>
          {subtitle && (
            <span className="text-gray-500 text-lg ml-2">
              / {subtitle}
            </span>
          )}
        </p>
        <Form method='POST'>
          <input type="hidden" name="envFiles" value={project.envFiles.join(',')} />
          <input type="hidden" name="configFiles" value={project.configFiles.join(',')} />
          <input type="hidden" name="areFilesDefinedByEnv" value={Number(areFilesDefinedByEnv)} />
          <input type="hidden" name="folder" value={project.dir} />
          <div className="flex flex-wrap items-center justify-end gap-2 mb-2">
            {!service && (
              <Link to={`/edit/${project.key}/new`}>
                <button className={clsx(buttonCN.normal, buttonCN.primary, buttonCN.iconLeft)}>
                  <PlusIcon className="w-6 h-6" />
                  <p>New</p>
                </button>
              </Link>
            )}
            {project.configFiles.length === 1 ? (
              project.source === 'library' ? (
                <Link to={`/edit/${project.key}/${project.configFiles[0]}?type=yml`}>
                  {editButton}
                </Link>
              ) : (
                <Tooltip position="left" title="Edit not available for projects outside library">
                  {editButton}
                </Tooltip>
              )
            ) : null}
            {service && areFilesDefinedByEnv ? (
              service?.enabled ? (
                <button
                  aria-disabled={busy || hasContainer}
                  name="op"
                  value="disable"
                  className={clsx(buttonCN.normal, buttonCN.outline, buttonCN.iconLeft)}
                >
                  <MinusCircleIcon className="w-5 h-5" />
                  <p>Disable</p>
                </button>
              ) : (
                <button
                  aria-disabled={busy || hasContainer}
                  name="op"
                  value="enable"
                  className={clsx(buttonCN.normal, buttonCN.outline, buttonCN.iconLeft)}
                >
                  <PlusCircleIcon className="w-5 h-5" />
                  <p>Enable</p>
                </button>
              )
            ) : null}
            {hasContainer ? (
              <Tooltip position="left" title="Cannot delete a project with a running container">{deleteButton}</Tooltip>
            ) : deleteButton}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button aria-disabled={busy} name="op" value="up" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
              <ArrowUpTrayIcon className="w-5 h-5" />
              <p>Up</p>
            </button>
            <button aria-disabled={busy} name="op" value="down" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
              <ArrowDownTrayIcon className="w-5 h-5" />
              <p>Down</p>
            </button>
            <button aria-disabled={busy} name="op" value="pull" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
              <CloudArrowDownIcon className="w-5 h-5" />
              <p>Pull</p>
            </button>
            <button aria-disabled={busy} name="op" value="restart" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
              <ArrowPathIcon className="w-5 h-5" />
              <p>Restart</p>
            </button>
            {isRunning ? (
              <button aria-disabled={busy} name="op" value="stop" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
                <StopIcon className="w-5 h-5" />
                <p>Stop</p>
              </button>
            ) : (
              <button aria-disabled={busy} name="op" value="start" className={clsx(buttonCN.small, buttonCN.outline, buttonCN.iconLeft)}>
                <PlayIcon className="w-5 h-5" />
                <p>Start</p>
              </button>
            )}
          </div>
        </Form>
      </section>
      <div className="md:flex flex-wrap">
        <div className="flex-auto basis-1/2">
          <section className="md:px-2">
            <h3 className="sr-only">
              Services
            </h3>
            {project.services.length === 0 && (
              <p className="text-gray-500">No services found</p>
            )}
            <ul className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
              {project.services.map((s) => (
                <AppCard
                  link={`/library/${project.key}?service=${s.key}`}
                  key={s.key}
                  logo={s.logo}
                  title={s.title}
                  enabled={s.enabled}
                  state={s.state}
                  status={s.status}
                />
              ))}
            </ul>
          </section>
          <section className="mt-9 mb-3 md:px-2">
            <h3 className="text-xl font-semibold flex-grow mb-2">Config files</h3>
            <ul className="columns-2">
              {project.configFiles.map((file) => (
                <li key={file}>
                  <Link
                    to={`/edit/${project.key}/${file}?type=yml`}
                    className="group flex gap-2 py-1 pr-2 items-center rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <DocumentIcon className="w-8 h-8 text-gray-400 flex-shrink-0" />
                    <p className="text-gray-600 flex-grow">{file}</p>
                    <PencilIcon className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          {project.envFiles.length > 0 && (
            <section className="my-6 md:px-2">
              <h3 className="text-xl font-semibold flex-grow mb-2">Env files</h3>
              <ul className="columns-2">
                {project.envFiles.map((file) => (
                  <li key={file}>
                    <Link
                      to={`/edit/${project.key}/${file}?type=env`}
                      className="group flex gap-2 py-1 pr-2 items-center rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <DocumentIcon className="w-8 h-8 text-gray-400 flex-shrink-0" />
                      <p className="text-gray-600 flex-grow">{file}</p>
                      <PencilIcon className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <div className="flex-auto min-w-0 basis-1/2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold flex-grow">Logs</h3>
            <button
              aria-disabled={revalidator.state === 'loading'}
              onClick={() => revalidator.revalidate()}
              className={clsx(buttonCN.small, buttonCN.normal, buttonCN.icon)}
            >
              <ArrowPathIcon className="w-5 h-5 text-pink-500" />
            </button>
          </div>
          <LogDisplay text={fullLogs.join('\n')} />
        </div>
      </div>
    </Layout>
  )
}
