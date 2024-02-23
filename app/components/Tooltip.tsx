import clsx from "clsx"

export default function Tooltip({ title, children, position = 'right' }: {
  title: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode
}) {
  const positionClassMap = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 -translate-y-1',
    right: 'top-0 left-full transform translate-x-1',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 translate-y-1',
    left: 'top-0 right-full transform -translate-x-1',
  }
  const positionClass = position ? positionClassMap[position] : positionClassMap.top
  return (
    <div className="relative [&>div:first-child]:opacity-0 [&:hover>div:first-child]:opacity-100">
      <div className={clsx(
        positionClass,
        'absolute z-10 pointer-events-none',
        'bg-black bg-opacity-50 rounded-lg p-2 truncate transition-opacity duration-300',
      )}>
        <p className="text-white text-sm">{title}</p>
      </div>
      {children}
    </div>
  ) 
}
