import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.min.css'

function Pre({ children }) {
  const codeProps = children?.props
  const lang = codeProps?.className?.match(/language-(\S+)/)?.[1]

  return (
    <div className="md-code-block">
      {lang && <span className="md-code-lang">{lang}</span>}
      <pre>{children}</pre>
    </div>
  )
}

function MessageContent({ content, role }) {
  if (role === 'user') {
    return content
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        pre: Pre,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export default MessageContent
