import type { Template } from "./appstore.type"

const TEMPLATES_URL = 'https://raw.githubusercontent.com/Lissy93/portainer-templates/main/templates.json'

export async function getTemplates({ query, category }: { query: string; category: string }) {
  const res = await fetch(TEMPLATES_URL)
  if (!res.ok) {
    throw new Error('Failed to fetch templates')
  }

  const data = await res.json()
  const templates: Template[] = Array.isArray(data) ? data : data.templates

  const filtered = templates.filter((t) => {
    const baseFilter = t.platform === 'linux' //&& t.type !== 1
    const regex = new RegExp(query, 'i')
    const queryFilter = query
      ? regex.test(t.title) || regex.test(t.name || '') || regex.test(t.description || '') || regex.test(t.note || '')
      : true
    const categoryFilter = category ? t.categories?.includes(category) : true

    return baseFilter && queryFilter && categoryFilter
  }).sort((a, b) => a.title.localeCompare(b.title))

  return filtered
}
