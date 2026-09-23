import { Children, isValidElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { checkpoints, headingId, parseBody, type BodySegment } from '@/lib/talk';

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

/** List items in a self-check start with ✓ or ✕; turn that into a coloured mark. */
function CheckItem({ children }: { children?: ReactNode }) {
  const kids = Children.toArray(children);
  const first = kids[0];
  if (typeof first === 'string') {
    const m = first.match(/^\s*([✓✔✕✗×])\s*/);
    if (m) {
      const good = m[1] === '✓' || m[1] === '✔';
      return (
        <li>
          <span className={`mark ${good ? 'good' : 'bad'}`} aria-label={good ? 'Good sign:' : 'Warning sign:'}>
            {good ? '✓' : '✕'}
          </span>
          {first.slice(m[0].length)}
          {kids.slice(1)}
        </li>
      );
    }
  }
  return <li>{children}</li>;
}

const external: Components['a'] = ({ href, children }) => {
  const isExternal = href?.startsWith('http') && !href.includes('endorfin.run');
  return (
    <a href={href} {...(isExternal ? { target: '_blank', rel: 'noopener' } : {})}>
      {children}
    </a>
  );
};

function Md({ md, components }: { md: string; components?: Components }) {
  return (
    <div className="rt-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: external, ...components }}>
        {md}
      </ReactMarkdown>
    </div>
  );
}

export default function TalkBody({ bodyMd }: { bodyMd: string }) {
  const cps = checkpoints(bodyMd);
  const h2: Components['h2'] = ({ children }) => {
    const text = textOf(children);
    const id = headingId(text);
    const n = cps.findIndex((c) => c.id === id) + 1;
    return (
      <h2 id={id}>
        {n > 0 && <span className="cp">CP {n}</span>}
        <span>{children}</span>
      </h2>
    );
  };

  // Adjacent self-checks sit side by side in one grid.
  const groups: (BodySegment | BodySegment[])[] = [];
  for (const seg of parseBody(bodyMd)) {
    const prev = groups[groups.length - 1];
    if (seg.kind === 'check' && Array.isArray(prev)) prev.push(seg);
    else groups.push(seg.kind === 'check' ? [seg] : seg);
  }

  return (
    <>
      {groups.map((g, i) => {
        if (Array.isArray(g)) {
          return (
            <div className="rt-checks" key={i}>
              {g.map((c, j) => (
                <div className="rt-drill" key={j}>
                  <span className="rt-label">Self-check</span>
                  {c.kind !== 'md' && <h3>{c.title}</h3>}
                  <Md md={c.md} components={{ li: CheckItem }} />
                </div>
              ))}
            </div>
          );
        }
        if (g.kind === 'stop') {
          return (
            <div className="rt-stop" role="note" key={i}>
              <h3>{g.title || 'Stop and get assessed if'}</h3>
              <Md md={g.md} />
            </div>
          );
        }
        return <Md md={g.md} components={{ h2 }} key={i} />;
      })}
    </>
  );
}
