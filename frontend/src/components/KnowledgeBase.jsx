import { useDeferredValue, useState } from "react";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";
import { knowledgeArticles } from "../data/knowledge";

export default function KnowledgeBase() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(knowledgeArticles[0]?.id || "");
  const deferredQuery = useDeferredValue(query.toLowerCase());
  const articles = knowledgeArticles.filter((article) =>
    Object.values(article).join(" ").toLowerCase().includes(deferredQuery)
  );
  const selected = articles.find((article) => article.id === selectedId) || articles[0];

  return (
    <section className="knowledge-layout">
      <aside className="panel knowledge-index">
        <div className="knowledge-intro">
          <span className="knowledge-mark"><BookOpen /></span>
          <div><h2>Operator field manual</h2><p>Defensive guidance from official sources.</p></div>
        </div>
        <label className="search-field"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search security topics" /></label>
        <div className="article-index">
          {articles.map((article) => (
            <button className={selected?.id === article.id ? "active" : ""} key={article.id} onClick={() => setSelectedId(article.id)}>
              <span>{article.category}</span><strong>{article.title}</strong>
            </button>
          ))}
          {!articles.length && <p>No article matches that search.</p>}
        </div>
      </aside>

      <article className="panel knowledge-article">
        {selected ? (
          <>
            <header><span className="eyebrow">INTEL_FILE // {selected.category}</span><h2>{selected.title}</h2><p>Plain-language defensive intelligence with implementation depth for experienced operators.</p></header>
            <KnowledgeSection title="Definition" value={selected.definition} />
            <KnowledgeSection title="Why it matters" value={selected.importance} />
            <KnowledgeSection title="How LeakShield detects it" value={selected.detection} />
            <KnowledgeSection title="Common mistakes" value={selected.mistakes} />
            <KnowledgeSection title="Mitigation" value={selected.mitigation} />
            <section className="knowledge-references"><h3>Official references</h3>{selected.references.map((reference) => <a href={reference.url} target="_blank" rel="noreferrer" key={reference.url}>{reference.title}<ArrowUpRight /></a>)}</section>
          </>
        ) : <div className="empty-state"><BookOpen /><strong>No article selected</strong><p>Choose a topic from the left.</p></div>}
      </article>
    </section>
  );
}

function KnowledgeSection({ title, value }) {
  return <section><h3>{title}</h3><p>{value}</p></section>;
}
