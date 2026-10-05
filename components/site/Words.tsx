/** Headline text whose words rise out of a mask one after another. Pure CSS, server-rendered. */
export default function Words({ text, delay = 0, step = 70, accent }: { text: string; delay?: number; step?: number; accent?: (word: string, i: number) => string | undefined }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <span className="word-mask">
            <span className={accent?.(w, i)} style={{ animationDelay: `${delay + i * step}ms` }}>{w}</span>
          </span>
          {i < words.length - 1 && " "}
        </span>
      ))}
    </>
  );
}
