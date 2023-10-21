export const focusCN = [
  `focus:border-zinc-300`,
  'focus:ring',
  `focus:ring-zinc-200`,
  'focus:ring-opacity-50',
  'focus:ring-offset-0'
].join(' ')

export const focusWithinCN = [
  'focus-within:ring',
  'focus-within:ring-zinc-200',
  'focus-within:ring-opacity-50',
  'focus-within:ring-offset-0'
].join(' ')

export const inputCN = [
  'block',
  'w-full',
  'rounded-md',
  'shadow-sm',
  'disabled:opacity-50',
  'border',
  'border-gray-300',
  // 'dark:border-gray-500',
  'text-zinc-700',
  // 'dark:text-zinc-100',
  'bg-white',
  // 'dark:bg-zinc-800',
  'placeholder:text-zinc-400',
  // 'dark:placeholder:text-zinc-500',
  focusCN
].join(' ')

export const checkboxCN = [
  'rounded',
  `text-zinc-600`,
  'border-gray-300',
  'shadow-sm',
  'disabled:opacity-50',
  focusCN
].join(' ')

export const labelCN = 'mb-1 block text-zinc-500 dark:text-zinc-100 text-sm'

const buttonCommon = [
  'rounded-md',
  'font-medium',
  'disabled:opacity-50',
  'disabled:pointer-events-none'
].join(' ')

export const buttonCN = {
  common: buttonCommon,
  small: `px-2 py-1 text-sm ${buttonCommon}`,
  normal: `px-4 py-2 ${buttonCommon}`,
  big: `px-5 py-3 text-lg ${buttonCommon}`,
  primary: [
    'text-pink-100 bg-pink-600 hover:bg-pink-500',
    // 'dark:text-pink-800 dark:bg-pink-100 dark:hover:bg-pink-200'
  ].join(' '),
  transparent: 'text-pink-600 hover:bg-zinc-100',
  delete: 'text-red-700 hover:bg-red-50',
  icon: 'pr-2 pl-2',
  iconLeft: 'flex items-center gap-2 pl-2',
  iconRight: 'flex items-center gap-2',
}

export const borderColor = 'border-gray-200 dark:border-gray-600'

const iconColor = 'text-zinc-500 dark:text-zinc-300'
export const iconCN = {
  big: `w-6 h-6 ${iconColor}`,
  small: `w-5 h-5 ${iconColor}`,
}
