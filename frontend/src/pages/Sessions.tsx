import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Layout from "../components/Layout";
import { formatDateTime, formatDuration } from "../lib/format";
import { request } from "../lib/request";
import type { EventType, Paginated, Session, SessionState } from "../types/api";

const EVENT_COLORS: Record<EventType, { text: string; bg: string }> = {
  PAGE_ENTER: { text: "#60a5fa", bg: "#1d2d3e" },
  PAGE_ACTIVE: { text: "#4ade80", bg: "#14280e" },
  PAGE_INACTIVE: { text: "#fbbf24", bg: "#2a1f08" },
  PAGE_LEAVE: { text: "#71717a", bg: "#1c1c1f" },
};

function SessionModal({ session, onClose }: { session: Session; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-lg max-h-[80vh] overflow-auto rounded-lg border" style={{ background: "var(--card)", borderColor: "var(--border)" }} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold truncate">{session.article.title}</h2>
            <p className="font-mono text-[11px]" style={{ color: "var(--primary)" }}>{session.article.website.domain}</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={14} /></button>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              ["Active", formatDuration(session.activeReadingMs)],
              ["Inactive", formatDuration(session.inactiveMs)],
              ["Total", formatDuration(session.activeReadingMs + session.inactiveMs)],
            ].map(([label, value]) => (
              <div key={label} className="rounded border p-3" style={{ borderColor: "var(--border)" }}>
                <p className="text-[10px] uppercase" style={{ color: "var(--muted-foreground)" }}>{label}</p>
                <p className="font-mono text-[13px] mt-1">{value}</p>
              </div>
            ))}
          </div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--muted-foreground)" }}>Event Timeline</h3>
          <div className="space-y-3">
            {session.events?.map((event) => {
              const color = EVENT_COLORS[event.eventType];
              return (
                <div key={event.id} className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: color.bg, color: color.text }}>{event.eventType}</span>
                  <span className="font-mono text-[10px]" style={{ color: "var(--muted-foreground)" }}>{formatDateTime(event.occurredAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [state, setState] = useState<SessionState | "">("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (state) params.set("state", state);
    request<Paginated<Session>>(`/sessions?${params}`)
      .then((response) => {
        setSessions(response.data);
        setTotalPages(Math.max(response.meta.totalPages, 1));
      })
      .catch(() => setError("Unable to load sessions."))
      .finally(() => setLoading(false));
  }, [page, state]);

  async function openSession(id: string) {
    try {
      setSelectedSession(await request<Session>(`/sessions/${id}`));
    } catch {
      setError("Unable to load session details.");
    }
  }

  return (
    <Layout title="Reading Sessions">
      {selectedSession && <SessionModal session={selectedSession} onClose={() => setSelectedSession(null)} />}
      <div className="flex items-center justify-between mb-4">
        <select
          value={state}
          onChange={(event) => {
            setState(event.target.value as SessionState | "");
            setPage(1);
          }}
          className="px-3 py-2 rounded border text-[12px] outline-none"
          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          <option value="">All states</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ENDED">Ended</option>
          <option value="STALE">Stale</option>
        </select>
      </div>
      <div className="rounded-lg border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "#111113" }}>
                {["Article", "Domain", "Started", "Ended", "Active Time", "State"].map((label) => <th key={label} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, index) => (
                <tr key={session.id} onClick={() => openSession(session.id)} className="cursor-pointer hover:bg-[#1c1c1f]" style={{ borderBottom: index < sessions.length - 1 ? "1px solid var(--border)" : undefined }}>
                  <td className="px-4 py-3 max-w-[280px] text-[12px]"><span className="line-clamp-1">{session.article.title}</span></td>
                  <td className="px-4 py-3 font-mono text-[11px]" style={{ color: "var(--muted-foreground)" }}>{session.article.website.domain}</td>
                  <td className="px-4 py-3 font-mono text-[11px]" style={{ color: "var(--muted-foreground)" }}>{formatDateTime(session.startedAt)}</td>
                  <td className="px-4 py-3 font-mono text-[11px]" style={{ color: "var(--muted-foreground)" }}>{formatDateTime(session.endedAt)}</td>
                  <td className="px-4 py-3 font-mono text-[12px]">{formatDuration(session.activeReadingMs)}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: session.currentState === "ACTIVE" ? "#14280e" : "#1c1c1f", color: session.currentState === "ACTIVE" ? "#4ade80" : "#71717a" }}>{session.currentState}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="py-16 text-center text-[13px]" style={{ color: "var(--muted-foreground)" }}>Loading...</div>}
        {!loading && !sessions.length && <div className="py-16 text-center text-[13px]" style={{ color: "var(--muted-foreground)" }}>{error || "No sessions found."}</div>}
      </div>
      <div className="flex items-center justify-end gap-2 mt-4">
        <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="px-3 py-1.5 rounded border text-[12px] disabled:opacity-40" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>Previous</button>
        <span className="font-mono text-[11px]" style={{ color: "var(--muted-foreground)" }}>{page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="px-3 py-1.5 rounded border text-[12px] disabled:opacity-40" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>Next</button>
      </div>
    </Layout>
  );
}
