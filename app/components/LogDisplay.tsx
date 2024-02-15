import clsx from "clsx"
import { useEffect, useRef, useState } from "react"
import { ArrowDownCircleIcon } from "@heroicons/react/20/solid"
import { buttonCN } from "~/lib/styles"
import Ansi from "ansi-to-react"

type LogDisplayProps = {
  text: string
  className?: string
  hideScrollToBottom?: boolean
}

export default function LogDisplay({ text, className = '', hideScrollToBottom = false }: LogDisplayProps) {
  const logsRef = useRef<HTMLPreElement>(null)
  const [isAtTheBottom, setIsAtTheBottom] = useState(true) // logsRef.current?.scrollTop === logsRef.current?.scrollHeight
  const [showBadge, setShowBadge] = useState(false)
  
  function scrollToBottom() {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }

  useEffect(() => {
    if (isAtTheBottom) {
      scrollToBottom()
    } else {
      setShowBadge(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  const showScrollToBottom = !hideScrollToBottom && !isAtTheBottom

  function onScroll(ev: React.WheelEvent<HTMLPreElement>) {
    if (ev.target) {
      const { scrollTop, scrollHeight, clientHeight } = ev.target as HTMLPreElement
      const isAtTheBottom = scrollTop === scrollHeight - clientHeight
      setIsAtTheBottom(isAtTheBottom)
      if (isAtTheBottom) {
        setShowBadge(false)
      }
    }
  }

  return (
    <div className={clsx(className, 'relative')}>
      <pre ref={logsRef} onScroll={onScroll} className="overflow-auto max-h-[500px] p-3 bg-zinc-100 rounded-md">
        <Ansi>{text.trim()}</Ansi>
      </pre>
      {showScrollToBottom ? (
        <button
          title='Scroll to bottom'
          onClick={scrollToBottom}
          className={clsx('absolute bottom-2 right-2 hover:bg-white', buttonCN.normal, buttonCN.icon)}
        >
          {showBadge ? (
            <div className="absolute top-1 left-1 h-2 w-2 rounded-full bg-yellow-400"></div>
          ) : null}
          <ArrowDownCircleIcon className="w-6 h-6" />
        </button>
      ) : null}
    </div>
  )
}
