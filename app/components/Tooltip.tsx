import clsx from "clsx"

export default function Tooltip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative [&>div:first-child]:opacity-0 [&:hover>div:first-child]:opacity-100">
      <div className={clsx(
        'absolute top-0 right-full z-10',
        'transform -translate-y-2 -translate-x-2',
        'bg-black bg-opacity-50 rounded-lg p-2 w-32 truncate transition-opacity duration-300',
      )}>
        <p className="text-white text-sm">{title}</p>
      </div>
      {children}
    </div>
  ) 
}
