import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

/**
 * 渲染 Markdown，并将 [1]、[2] 等引用标注替换为可点击的 sup 标签。
 * 仅当编号不超过实际引用数量时才替换，避免误伤代码块中的下标。
 */
export function renderMarkdown(text: string, citationCount: number): string {
  const html = md.render(text)
  if (citationCount <= 0) return html
  return html.replace(/\[(\d+)\]/g, (match, n: string) =>
    Number(n) <= citationCount
      ? `<sup class="cite-badge" data-cite="${n}">${match}</sup>`
      : match
  )
}
