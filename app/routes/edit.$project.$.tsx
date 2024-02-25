import { AdjustmentsVerticalIcon, ArrowLeftIcon } from "@heroicons/react/20/solid"
import { redirect, type ActionArgs, type LoaderArgs } from "@remix-run/node"
import { Form, Link, useLoaderData, useNavigation } from "@remix-run/react"
import clsx from "clsx"
import Layout from "~/components/layout"
import { checkNetworkExists } from "~/lib/docker.server"
import env from "~/lib/env.server"
import { readConfigFolder } from "~/lib/library.server"
import { buttonCN, inputCN } from "~/lib/styles"
import YAML from 'yaml'
import { useRef, useState } from "react"
import { envToText } from "~/lib/envfile.server"
import LabelEditorDialog from "~/components/LabelEditorDialog"
import { deleteProjectFile, saveFile } from "~/lib/compose.server"
import { getComposeTemplate, getTemplate } from "~/lib/appstore"

type EditorFileType = 'yml' | 'env' | 'appstore'

export async function loader({ request, params }: LoaderArgs) {
  const key = params.project
  const filePath = params['*']
  const sp = new URL(request.url).searchParams
  const type = (sp.get('type') || 'yml') as EditorFileType

  const library = await readConfigFolder()
  const project = library.find((l) => l.key === key)

  if (!project) {
    throw new Response(`Project ${key} not found`, { status: 404, statusText: 'Not found' })
  }

  let file
  if (filePath === 'new') {
    file = {
      path: '',
      text: 'version: "3.8"\nservices:\n  app:\n    image: node:lts\n    command: ["node", "--version"]\n',
    }

    if (type === 'appstore') {
      const index = sp.get('index')
      const template = await getTemplate(Number(index))

      if (!template) {
        throw new Response('Appstore template not found', { status: 404, statusText: 'Not found' })
      }

      const text = await getComposeTemplate(template)
      file = {
        path: `${template.name}.yml`,
        text
      }
    }
  }

  if (type === 'yml') {
    const ymlFile = project.ymlFiles.find((y) => y.path === filePath)
    if (ymlFile) {
      file = {
        path: ymlFile.path,
        text: YAML.stringify(ymlFile.content),
      }
    }
  }

  if (type === 'env' && project.env) {
    file = {
      path: '.env',
      text: envToText(project.env),
    }
  }

  if (!file) {
    throw new Response(`File ${filePath} not found`, { status: 404 })
  }

  const networkExists = await checkNetworkExists(env.dockerProxyNetwork)

  return {
    key,
    folder: project.folder,
    file,
    type,
    networkExists,
    editorEnv: {
      dockerProxyNetwork: env.dockerProxyNetwork,
      baseAppsDomain: env.baseAppsDomain,
      authorizeConfig: env.authorizeConfig,
    },
  }
}

export async function action({ params, request }: ActionArgs) {
  const data = await request.formData()
  const key = params.project!
  const prev_filename = params['*']
  const type = (new URL(request.url).searchParams.get('type') || 'yml') as EditorFileType

  console.log({ key, prev_filename, type })
  const filename = data.get('filename') as string
  const compose = data.get('compose') as string

  const library = await readConfigFolder()
  const project = library.find((l) => l.key === key)
  
  if (!project) {
    throw new Response(`Project ${key} not found`, { status: 404 })
  }

  if (type !== 'appstore' && prev_filename && prev_filename !== filename) {
    await deleteProjectFile(project.folder, prev_filename)
  }

  await saveFile({
    projectFolder: project.folder,
    filePath: filename,
    compose,
  })

  return redirect(`/edit/${key}/${filename}?type=${type === 'appstore' ? 'yml' : type}`)
}

export default function EditFile() {
  const { folder, file, key, type } = useLoaderData<typeof loader>()
  const [name, setName] = useState(file.path)
  const [text, setText] = useState(file.text)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const transition = useNavigation()
  const busy = transition.state !== 'idle'

  function resetForm() {
    setName(file.path)
    setText(file.text)
  }

  let link = `/library/${key}`
  if (type !== 'env')  {
    link += `?file=${file.path}`
  }

  return (
    <Layout>
      <div className="md:flex items-start gap-2">
        <Link to={link} className={clsx('block w-min mb-2', buttonCN.normal, buttonCN.icon, buttonCN.transparent)}>
          <ArrowLeftIcon className='w-5 h-5' />
        </Link>
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-1">
            Editor
          </h2>
          <p className="text-lg text-gray-500">
            {folder}/{file.path || 'new'}
          </p>
        </div>
      </div>
      <Form ref={formRef} method="POST" className="relative z-10">
        <div className="mb-6">
          <label className="text-zinc-500 mb-1 block" htmlFor="filename">File name</label>
          <input
            name="filename"
            className={clsx(inputCN, 'bg-zinc-50 px-2 py-1')}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="docker-compose.yml"
          />
        </div>
        {type !== 'env' && (
          <button
            type="button"
            className={clsx('mb-3', buttonCN.small, buttonCN.iconLeft, buttonCN.outline)}
            onClick={() => setDrawerOpen(!drawerOpen)}
          >
            <AdjustmentsVerticalIcon className="w-5 h-5" />
            <p>Edit proxy config</p>
          </button>
        )}
        <div className="mb-4 relative z-10">
          <textarea
            className={clsx('h-[500px] bg-zinc-50 font-mono p-3', inputCN)}
            name="compose"
            id="compose"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
            spellCheck="false"
            required
          />
          <LabelEditorDialog
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            text={text}
            setText={setText}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            aria-disabled={busy}
            className={clsx(buttonCN.normal, buttonCN.primary)}
          >
            Save
          </button>
          <button
            type="button"
            aria-disabled={busy}
            onClick={resetForm}
            className={clsx(buttonCN.normal, buttonCN.transparent)}
          >
            Reset
          </button>
        </div>
      </Form>
    </Layout>
  )
}
