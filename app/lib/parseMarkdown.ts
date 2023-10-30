import Markdown from 'markdown-it'

export function parseMarkdown(text: string) {
  return new Markdown({ linkify: true, html: true, breaks: true })
    .disable(['heading'])
    .render(text)
}
