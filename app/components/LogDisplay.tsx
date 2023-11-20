import clsx from "clsx"
import { useRef } from "react"
import { ArrowDownCircleIcon } from "@heroicons/react/20/solid"
import { buttonCN } from "~/lib/styles"

type LogDisplayProps = {
  text: string
  className?: string
  hideScrollToBottom?: boolean
}

export default function LogDisplay({ text, className = '', hideScrollToBottom = false }: LogDisplayProps) {
  const logsRef = useRef<HTMLPreElement>(null)

  function scrollToBottom() {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }

  if (!text) {
    return null
  }

  const numLines = text.split('\n').length

  return (
    <div className={clsx(className, 'relative')}>
      <pre ref={logsRef} className="overflow-auto max-h-[500px] p-3 bg-zinc-100 rounded-md">{text.trim()}</pre>
      {numLines > 10 && !hideScrollToBottom ? (
        <button
          title='Scroll to bottom'
          onClick={scrollToBottom}
          className={clsx('absolute bottom-2 right-2 hover:bg-white', buttonCN.normal, buttonCN.icon)}
        >
          <ArrowDownCircleIcon className="w-6 h-6" />
        </button>
      ) : null}
    </div>
  )
}
