import { Braces, CodeXml, Terminal } from 'lucide-react'
import type { Language } from './api'

const javaTokens = /(@"[^"]*"|@[A-Za-z_$][\w$]*|"(?:\\.|[^"\\])*"|\b(?:throws|return|new|class|void|public|static)\b|\b[A-Z][\w$]*\b|\b\w+(?=\())/g
const jsonTokens = /("(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|\b(?:true|false|null|\d+)\b)/g
const httpTokens = /(^[\w-]+(?=:)|\bHTTP\/\d\.\d\b|^(?:GET|POST|PUT|DELETE|PATCH)\b|\b(?:200|401|403)\b|"(?:\\.|[^"\\])*")/g

function highlighted(line: string, language: Language) {
  const json = language === 'json' || (language === 'http' && line.trimStart().startsWith('{'))
  const pattern = json ? jsonTokens : language === 'java' ? javaTokens : httpTokens
  const parts = line.split(pattern)
  return parts.map((part, i) => {
    if (i % 2 === 0) return part
    let tone = 'name'
    if (part.startsWith('"')) tone = json && parts[i + 1]?.trimStart().startsWith(':') ? 'field' : 'literal'
    else if (/^(?:\d|true$|false$|null$)/.test(part)) tone = 'number'
    else if (part.startsWith('@') || /^(?:throws|new|return|GET|POST|HTTP\/)/.test(part)) tone = 'keyword'
    return <span key={i} className={'rd-token-' + tone}>{part}</span>
  })
}

export function CodeSample({ language, text, wrap = false, activeLine }: {
  language: Language; text: string; wrap?: boolean; activeLine?: number
}) {
  const http = language === 'http'
  const kind = http ? (text.startsWith('HTTP/') ? 'Response' : 'Request') :
    language === 'java' ? (wrap ? 'Java example' : 'Configuration') : language === 'text' ? 'Decision flow' : 'Body'
  const label = http ? 'Illustrative HTTP message' : language === 'java' ? (wrap ? 'Illustrative Java example' : 'Illustrative Java configuration') :
    language === 'text' ? 'Decision flow' : 'Illustrative JSON body'
  const Icon = http ? Terminal : language === 'json' ? Braces : CodeXml
  return <figure className={wrap ? 'rd-sample rd-sample-wrap' : 'rd-sample'}>
    <figcaption><span><Icon size={15} />{kind}</span><span>{language.toUpperCase()}</span></figcaption>
    <pre tabIndex={0} aria-label={label}><code>{text.split('\n').map((line, i, all) => <span key={i}
      className={activeLine === i ? 'rd-active-line' : undefined}>
      {language === 'text' ? line : highlighted(line, language)}{i < all.length - 1 ? '\n' : ''}
    </span>)}</code></pre>
  </figure>
}
