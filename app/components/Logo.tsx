import packageIconURL from '~/assets/package.svg'

export default function Logo(props: React.ComponentProps<'img'>) {
  const { alt, ...rest } = props
  return (
    <img {...rest} alt={alt} onError={(ev) => {
      ev.currentTarget.src = packageIconURL
      ev.currentTarget.style.padding = '12px'
    }} />
  )
}
