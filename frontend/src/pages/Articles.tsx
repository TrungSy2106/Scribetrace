import { useEffect, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { formatDateTime, formatDuration } from "../lib/format";
import { request } from "../lib/request";
import type { ArticleListItem, Paginated, Website } from "../types/api";

type ArticleSort = "latest" | "oldest" | "title";

export default function Articles() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState("");
  const [sort, setSort] = useState<ArticleSort>("latest");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    request<Website[]>("/websites").then(setWebsites).catch(() => undefined);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), limit: "20", sort });
      if (search.trim()) params.set("search", search.trim());
      if (domain) params.set("domain", domain);

      try {
        const response = await request<Paginated<ArticleListItem>>(`/articles?${params}`);
        setArticles(response.data);
        setTotal(response.meta.total);
        setTotalPages(Math.max(response.meta.totalPages, 1));
      } catch {
        setError("Unable to load articles.");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [domain, page, search, sort]);

  return (
    <Layout title="Articles">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 max-w-xs px-3 py-2 rounded border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <Search size={13} style={{ color: "var(--muted-foreground)" }} />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search articles..."
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{ color: "var(--foreground)" }}
          />
        </div>
        <select
          value={domain}
          onChange={(event) => {
            setDomain(event.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded border text-[12px] outline-none"
          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          <option value="">All domains</option>
          {websites.map((website) => <option key={website.id} value={website.domain}>{website.domain}</option>)}
        </select>
        <select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as ArticleSort);
            setPage(1);
          }}
          className="px-3 py-2 rounded border text-[12px] outline-none"
          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          <option value="latest">Latest</option>
          <option value="oldest">Oldest</option>
          <option value="title">Title</option>
        </select>
        <span className="text-[12px] ml-auto" style={{ color: "var(--muted-foreground)" }}>
          {total} article{total !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "#111113" }}>
                {["Title", "Domain", "URL", "Read Time", "Last Read", "Status"].map((label) => (
                  <th key={label} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {articles.map((article, index) => (
                <tr
                  key={article.id}
                  className="cursor-pointer transition-colors hover:bg-[#1c1c1f]"
                  onClick={() => navigate(`/articles/${article.id}`)}
                  style={{ borderBottom: index < articles.length - 1 ? "1px solid var(--border)" : undefined }}
                >
                  <td className="px-4 py-3 max-w-[260px]">
                    <span className="text-[12px] line-clamp-1 font-medium" style={{ color: "var(--foreground)" }}>{article.title}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px]" style={{ color: "var(--muted-foreground)" }}>{article.website.domain}</td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="flex items-center gap-1 text-[11px] hover:opacity-70"
                      style={{ color: "var(--primary)" }}
                    >
                      <ExternalLink size={10} className="flex-shrink-0" />
                      <span className="truncate">{article.url.replace(/^https?:\/\//, "")}</span>
                    </a>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px]" style={{ color: "var(--foreground)" }}>{formatDuration(article.totalReadingMs)}</td>
                  <td className="px-4 py-3 font-mono text-[11px]" style={{ color: "var(--muted-foreground)" }}>{formatDateTime(article.latestReadingAt)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: article.isActive ? "#14280e" : "#1c1c1f", color: article.isActive ? "#4ade80" : "#71717a" }}>
                      {article.isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                      {article.isActive ? "ACTIVE" : "DONE"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !articles.length && <div className="py-16 text-center text-[13px]" style={{ color: "var(--muted-foreground)" }}>{error || "No articles found."}</div>}
        {loading && <div className="py-16 text-center text-[13px]" style={{ color: "var(--muted-foreground)" }}>Loading...</div>}
      </div>

      <div className="flex items-center justify-end gap-2 mt-4">
        <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="px-3 py-1.5 rounded border text-[12px] disabled:opacity-40" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>Previous</button>
        <span className="font-mono text-[11px]" style={{ color: "var(--muted-foreground)" }}>{page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="px-3 py-1.5 rounded border text-[12px] disabled:opacity-40" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>Next</button>
      </div>
    </Layout>
  );
}
