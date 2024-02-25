import clsx from "clsx"
import Logo from "./Logo"
import Tooltip from "./Tooltip"
import { type ContainerState } from "~/lib/docker.server"
import { Link } from "@remix-run/react"
import { getStateColor } from "~/lib/docker.util"

type ContainerCardProps = {
  link?: string
  status?: string
  state?: ContainerState
  title: string
  logo: string
  enabled?: boolean
  as?: JSX.ElementType
}

export default function AppCard({
  link,
  status,
  state,
  title,
  logo,
  enabled = true,
  as: Component = 'li'
}: ContainerCardProps) {
  return (
    <Component
      className={clsx(
        {
          'group hover:shadow-md transition-shadow': !!link,
          'pointer-events-none': !link,
          'opacity-50': !enabled
        },
        'bg-white relative shadow',
        ' flex flex-col place-items-center border border-zinc-200 py-3 rounded-xl w-40'
      )}
    >
      {link && (
        <Link to={link} className="absolute inset-0">
          <span className="sr-only">{title}</span>
        </Link>
      )}
      {status && state && (
        <div className="absolute top-2 left-2">        
          <Tooltip title={status}>
            <div className={clsx(
              getStateColor(state),
              'w-4 h-4 rounded-full'
            )}></div>
          </Tooltip>
        </div>
      )}
      <Logo
        src={logo}
        alt='app logo'
        className={clsx(
          { 'will-change-transform group-hover:scale-125 duration-200 transition-transform transform': !!link },
          'pointer-events-none w-20 h-20 block object-contain p-0.5',
        )}
      />
      <p className={clsx(
        { 'not-sr-only': !!link },
        'truncate max-w-full px-2 text-center mt-2'
      )}>{title}</p>
    </Component>
  )
}
