import { parseDocument } from 'htmlparser2'
import type { ImportDraft } from './extractor.ts'

type Node = ReturnType<typeof parseDocument>['children'][number]
type Element = Extract<Node, { attribs: Record<string, string> }>
type Block = { node: Element; text: string; level: number | null; nestedList?: boolean }
const excluded = new Set([
  'script',
  'style',
  'template',
  'noscript',
  'nav',
  'footer',
  'aside',
  'form',
  'button',
  'select',
  'svg',
  'iframe',
])
const containers = new Set(['div', 'section', 'article', 'main', 'ul', 'ol', 'body', 'html'])

function element(node: Node): node is Element {
  return 'attribs' in node
}

function ignored(node: Element) {
  return (
    excluded.has(node.name) ||
    node.attribs.role === 'button' ||
    node.attribs.type === 'button' ||
    'hidden' in node.attribs ||
    node.attribs['aria-hidden'] === 'true' ||
    /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(node.attribs.style ?? '')
  )
}

function label(value: string): 'ingredients' | 'method' | null {
  const normalised = value
    .toLowerCase()
    .replace(/\s*:\s*$/, '')
    .trim()
  if (normalised === 'ingredients') return 'ingredients'
  if (['method', 'instructions', 'directions', 'preparation', 'steps'].includes(normalised))
    return 'method'
  return null
}

// HTML is parsed as inert data: no scripts, styles, subresources or page code run.
// Bound traversal independently of the fetcher's byte limit.
export function extractHtmlRecipe(html: string, sourceUrl: string): ImportDraft {
  if (html.length > 1_500_000) throw new Error('too_large')
  const document = parseDocument(html)
  const blocks: Block[] = []
  const metadata = new Map<string, string[]>()
  let visited = 0
  function content(node: Node, depth = 0): string {
    if (depth > 80 || ++visited > 100_000) throw new Error('unsupported_layout')
    if (node.type === 'text') return node.data
    if (!element(node) || ignored(node)) return ''
    if (node.name === 'br') return '\n'
    return node.children.map((child) => content(child, depth + 1)).join('')
  }
  function walk(nodes: Node[], depth = 0) {
    if (depth > 80) throw new Error('unsupported_layout')
    for (const node of nodes) {
      if (++visited > 100_000) throw new Error('unsupported_layout')
      if (!element(node) || ignored(node)) continue
      if (node.name === 'meta') {
        const key = node.attribs.property ?? node.attribs.name
        if (key && node.attribs.content) {
          metadata.set(key, [...(metadata.get(key) ?? []), node.attribs.content.trim()])
        }
        continue
      }
      const heading = /^h([1-6])$/.exec(node.name)
      const text = () =>
        content(node)
          .split('\n')
          .map((line) => line.replace(/\s+/g, ' ').trim())
          .filter(Boolean)
          .join('\n')
      if (heading || node.attribs.role === 'heading') {
        blocks.push({ node, text: text(), level: heading ? Number(heading[1]) : 2 })
      } else if (
        node.name === 'li' ||
        node.name === 'p' ||
        (node.name === 'div' &&
          !node.children.some(
            (child) =>
              element(child) && (containers.has(child.name) || /^(h[1-6]|p|li)$/.test(child.name)),
          ))
      ) {
        // Nested lists need a grouping model; never flatten them into duplicated steps.
        const value = text()
        if (value)
          blocks.push({
            node,
            text: value,
            level: label(value) ? 2 : null,
            nestedList: node.name === 'li' && containsList(node),
          })
      } else {
        walk(node.children, depth + 1)
      }
    }
  }
  function containsList(node: Element, depth = 0): boolean {
    if (depth > 80) throw new Error('unsupported_layout')
    return node.children.some(
      (child) =>
        element(child) &&
        (child.name === 'ul' || child.name === 'ol' || containsList(child, depth + 1)),
    )
  }
  walk(document.children)
  const ingredientHeadings = blocks.filter(
    (block) => block.level !== null && label(block.text) === 'ingredients',
  )
  const methodHeadings = blocks.filter(
    (block) => block.level !== null && label(block.text) === 'method',
  )
  if (ingredientHeadings.length > 1 || methodHeadings.length > 1)
    throw new Error('ambiguous_recipe')
  if (!ingredientHeadings.length && !methodHeadings.length) throw new Error('recipe_not_found')
  if (!ingredientHeadings.length || !methodHeadings.length) throw new Error('incomplete_recipe')
  const ingredientsHeading = ingredientHeadings[0]!
  const methodHeading = methodHeadings[0]!
  function scope(node: Element): Node | null {
    let parent = node.parent
    while (parent && parent.type !== 'root') {
      if (element(parent) && ['article', 'main'].includes(parent.name)) return parent
      parent = parent.parent
    }
    return null
  }
  if (scope(ingredientsHeading.node) !== scope(methodHeading.node))
    throw new Error('ambiguous_recipe')
  function within(node: Node, ancestor: Node): boolean {
    for (let current: Node | null = node; current; current = current.parent) {
      if (current === ancestor) return true
    }
    return false
  }
  function linesAfter(heading: Block) {
    const lines: string[] = []
    let list: Node | null = null
    let grouped = false
    const following = blocks.slice(blocks.indexOf(heading) + 1)
    const first = following[0]
    if (!first || (first.level !== null && (first.level <= heading.level! || label(first.text))))
      throw new Error('incomplete_recipe')
    // Stay inside the smallest container shared by the label and its content.
    // This also supports a heading nested inside a decorative wrapper.
    let fence: Node = heading.node
    while (fence.parent && !within(first.node, fence)) fence = fence.parent
    for (const block of following) {
      if (!within(block.node, fence)) break
      if (scope(block.node) !== scope(heading.node)) break
      if (block.level !== null && (block.level <= heading.level! || label(block.text))) break
      // A completed list is a structural boundary. Do not absorb tag lists,
      // related links or comments later in the article.
      if (list && block.node.parent !== list && block.level === null && !grouped) {
        function outsideLinks(node: Node): string {
          if (node.type === 'text') return node.data
          if (!element(node) || node.name === 'a' || ignored(node)) return ''
          return node.children.map(outsideLinks).join('')
        }
        const linkOnly = !outsideLinks(block.node).replace(/[\s|,·•]/g, '')
        if (linkOnly) break
        throw new Error('incomplete_recipe')
      }
      if (block.nestedList) throw new Error('unsupported_layout')
      if (block.level !== null) grouped = true
      else {
        if (block.node.name === 'li') list = block.node.parent
        grouped = false
      }
      lines.push(...block.text.split('\n'))
      if (lines.length > 200) throw new Error('unsupported_layout')
    }
    if (!lines.length || grouped) throw new Error('incomplete_recipe')
    return lines.join('\n')
  }
  const titles = blocks.filter((block) => block.level === 1)
  if (titles.length > 1) throw new Error('ambiguous_recipe')
  const uniqueMeta = (key: string) => {
    const values = [...new Set(metadata.get(key) ?? [])]
    return values.length === 1 ? values[0]! : null
  }
  const name = titles[0]?.text ?? uniqueMeta('og:title')
  if (!name) throw new Error('incomplete_recipe')
  let imageUrl: string | null = null
  try {
    const rawImage = uniqueMeta('og:image')
    const url = rawImage ? new URL(rawImage, sourceUrl) : null
    if (url && ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password)
      imageUrl = url.toString()
  } catch {
    /* Optional image metadata must not prevent a text draft. */
  }
  return {
    name,
    ingredients: linesAfter(ingredientsHeading),
    description: linesAfter(methodHeading),
    sourceUrl,
    authorName: uniqueMeta('author'),
    publisherName: uniqueMeta('og:site_name'),
    imageUrl,
    servings: null,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    warnings: [
      'Imported from page text. Check every ingredient and step before saving. Servings and times may need adding.',
    ],
  }
}
