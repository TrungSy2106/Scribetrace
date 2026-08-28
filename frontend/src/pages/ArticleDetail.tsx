import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, ExternalLink, FileText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { formatDateTime, formatDuration } from "../lib/format";
import { request } from "../lib/request";
import type { ArticleDetail as ArticleDetailData, EventType, SessionState } from "../types/api";

const EVENT_LABELS: Record<EventType, string> = {
  PAGE_ENTER: "Page Enter",
  PAGE_ACTIVE: "Page Active",
  PAGE_INACTIVE: "Page Inactive",
  PAGE_LEAVE: "Page Leave",
};

const EVENT_COLORS: Record<EventType, { bg: string; text: string; border: string }> = {
  PAGE_ENTER: { bg: "#1d2d3e", text: "#60a5fa", border: "#3b82f630" },
  PAGE_ACTIVE: { bg: "#14280e", text: "#4ade80", border: "#22c55e30" },
  PAGE_INACTIVE: { bg: "#2a1f08", text: "#fbbf24", border: "#f59e0b30" },
  PAGE_LEAVE: { bg: "#1c1c1f", text: "#71717a", border: "#27272a" },
};

const SESSION_COLORS: Record<SessionState, { bg: string; text: string }> = {
  ACTIVE: { bg: "#14280e", text: "#4ade80" },
  INACTIVE: { bg: "#2a1f08", text: "#fbbf24" },
  ENDED: { bg: "#1c1c1f", text: "#a1a1aa" },
  STALE: { bg: "#2a1717", text: "#f87171" },
};

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleDetailData | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    request<ArticleDetailData>(`/articles/${id}`)
      .then((data) => {
        setArticle(data);
        setSelectedSessionId(data.sessions[0]?.id || "");
      })
      .catch(() => setError("Article not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <Layout title="Article Detail"><div className="py-20 text-center text-[13px]" style={{ color: "var(--muted-foreground)" }}>Loading...</div></Layout>;
  }

  if (!article) {
    return <Layout title="Article Detail"><div className="py-20 text-center text-[13px]" style={{ color: "var(--muted-foreground)" }}>{error}</div></Layout>;
  }

  const inactiveMs = article.sessions.reduce((sum, session) => sum + session.inactiveMs, 0);
  const averageActiveMs = article.sessionCount ? article.totalReadingMs / article.sessionCount : 0;
  const trackedMs = article.totalReadingMs + inactiveMs;
  const activeRatio = trackedMs ? (article.totalReadingMs / trackedMs) * 100 : 0;
  const activeRatioLabel = activeRatio > 0 && activeRatio < 1 ? `${activeRatio.toFixed(1)}%` : `${Math.round(activeRatio)}%`;
  const selectedSession = article.sessions.find((session) => session.id === selectedSessionId) || article.sessions[0];
  const selectedSessionIndex = selectedSession ? article.sessions.findIndex((session) => session.id === selectedSession.id) : -1;
  const selectedSessionNumber = selectedSession ? article.sessions.length - selectedSessionIndex : 0;
  const selectedStateColor = selectedSession ? SESSION_COLORS[selectedSession.currentState] : null;
  const contentParagraphs = article.content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <Layout title="Article Detail">
      <button onClick={() => navigate("/articles")} className="flex items-center gap-1.5 mb-5 text-[12px] hover:opacity-70" style={{ color: "var(--muted-foreground)" }}>
        <ArrowLeft size={13} />Back to Articles
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-lg border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#1d2d3e", color: "#60a5fa" }}>{article.website.domain}</span>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: article.isActive ? "#14280e" : "#1c1c1f", color: article.isActive ? "#4ade80" : "#71717a" }}>
                {article.isActive && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                {article.isActive ? "ACTIVE" : "DONE"}
              </span>
            </div>
            <h1 className="text-[17px] font-semibold leading-snug mb-3">{article.title}</h1>
            <div className="flex items-center gap-4 flex-wrap">
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] hover:opacity-70" style={{ color: "var(--primary)" }}>
                <ExternalLink size={11} />View original
              </a>
              <div className="flex items-center gap-1.5">
                <Calendar size={11} style={{ color: "var(--muted-foreground)" }} />
                <span className="font-mono text-[11px]" style={{ color: "var(--muted-foreground)" }}>{formatDateTime(article.firstSeenAt)}</span>
              </div>
            </div>
          </div>

          {article.summary && (
            <div className="rounded-lg border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <FileText size={13} style={{ color: "var(--primary)" }} />
                <h3 className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--primary)" }}>Summary</h3>
              </div>
              <p className="text-[13px] leading-relaxed">{article.summary}</p>
            </div>
          )}

          <div className="rounded-lg border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--muted-foreground)" }}>Article Content</h3>
            <div className="mx-auto max-w-[78ch] space-y-4 text-[14px] leading-7" style={{ color: "#d4d4d8" }}>
              {contentParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              {!contentParagraphs.length && <p style={{ color: "var(--muted-foreground)" }}>Content could not be extracted.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--muted-foreground)" }}>Reading Overview</h3>
            <div className="space-y-3">
              {[
                { label: "Total Active Time", value: formatDuration(article.totalReadingMs) },
                { label: "Average Active Time", value: formatDuration(averageActiveMs) },
                { label: "Total Inactive Time", value: formatDuration(inactiveMs) },
                { label: "Reading Sessions", value: String(article.sessionCount) },
                { label: "First Read", value: formatDateTime(article.firstSeenAt) },
                { label: "Latest Read", value: formatDateTime(article.latestReadingAt) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{label}</span>
                  <span className="font-mono text-[11px] text-right">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Overall Active Ratio</span>
                <span className="font-mono text-[10px]">{activeRatioLabel}</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: "var(--border)" }}>
                <div className="h-full rounded-full" style={{ width: `${activeRatio}%`, background: "var(--primary)" }} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>Reading Sessions</h3>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#1d2d3e", color: "#60a5fa" }}>{article.sessionCount}</span>
            </div>

            {selectedSession && selectedStateColor ? (
              <div>
                <select
                  value={selectedSession.id}
                  onChange={(event) => setSelectedSessionId(event.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-[11px] outline-none mb-3"
                  style={{ background: "#111113", borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  {article.sessions.map((session, sessionIndex) => (
                    <option key={session.id} value={session.id}>
                      Session {String(article.sessions.length - sessionIndex).padStart(2, "0")} · {formatDateTime(session.startedAt)}
                    </option>
                  ))}
                </select>

                <div className="rounded-md border overflow-hidden" style={{ borderColor: "var(--border)", background: "#111113" }}>
                  <div className="flex items-start justify-between gap-3 px-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                    <div>
                      <p className="text-[11px] font-semibold">Session {String(selectedSessionNumber).padStart(2, "0")}</p>
                      <p className="font-mono text-[9px] mt-1" style={{ color: "var(--muted-foreground)" }}>Started {formatDateTime(selectedSession.startedAt)}</p>
                      <p className="font-mono text-[9px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{selectedSession.endedAt ? `Ended ${formatDateTime(selectedSession.endedAt)}` : "Still in progress"}</p>
                    </div>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: selectedStateColor.bg, color: selectedStateColor.text }}>{selectedSession.currentState}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-px border-b" style={{ background: "var(--border)", borderColor: "var(--border)" }}>
                    {[
                      ["Active", formatDuration(selectedSession.activeReadingMs)],
                      ["Inactive", formatDuration(selectedSession.inactiveMs)],
                      ["Events", String(selectedSession.events.length)],
                    ].map(([label, value]) => (
                      <div key={label} className="px-3 py-2" style={{ background: "var(--card)" }}>
                        <p className="text-[9px] uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>{label}</p>
                        <p className="font-mono text-[11px] mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-3">
                    <p className="text-[9px] uppercase tracking-wide mb-3" style={{ color: "var(--muted-foreground)" }}>Event Timeline</p>
                    <div className="max-h-72 overflow-y-auto pr-1">
                      {selectedSession.events.map((event, eventIndex) => {
                        const color = EVENT_COLORS[event.eventType];
                        const hasNext = eventIndex < selectedSession.events.length - 1;

                        return (
                          <div key={event.id} className="flex gap-3">
                            <div className="flex w-4 shrink-0 flex-col items-center">
                              <div className="mt-1 h-2 w-2 rounded-full" style={{ background: color.text, boxShadow: `0 0 0 4px ${color.bg}` }} />
                              {hasNext && <div className="mt-1 w-px flex-1 min-h-5" style={{ background: "var(--border)" }} />}
                            </div>
                            <div className={hasNext ? "pb-3" : ""}>
                              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>{EVENT_LABELS[event.eventType]}</span>
                              <p className="font-mono text-[9px] mt-1" style={{ color: "var(--muted-foreground)" }}>{formatDateTime(event.occurredAt)}</p>
                            </div>
                          </div>
                        );
                      })}
                      {!selectedSession.events.length && <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>No events recorded.</p>}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>No reading sessions recorded.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
