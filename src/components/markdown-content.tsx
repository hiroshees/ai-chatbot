import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 生HTMLは描画せず（react-markdown の既定）、Markdown だけを要素に変換する
export function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="space-y-3 break-words [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-current/30 [&_blockquote]:pl-3 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:block [&_table]:overflow-x-auto [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-xl bg-zinc-900 p-3 text-sm text-zinc-100">
              {children}
            </pre>
          ),
          code: ({ className, children }) => (
            <code
              className={`${className ?? ""} font-mono [:not(pre)>&]:rounded [:not(pre)>&]:bg-black/10 [:not(pre)>&]:px-1 [:not(pre)>&]:py-0.5 [:not(pre)>&]:text-[0.9em] dark:[:not(pre)>&]:bg-white/15`}
            >
              {children}
            </code>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
