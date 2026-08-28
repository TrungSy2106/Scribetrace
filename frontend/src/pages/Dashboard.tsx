import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ArrowUpRight, Clock, FileText, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Layout from "../components/Layout";
import { formatDuration, formatTime } from "../lib/format";
import { request, SOCKET_URL } from "../lib/request";
import type {
  ArticleListItem,
  DashboardOverview,
  EventType,
  LiveReadingEvent,
  Paginated,
  ReadingByWebsite,
  ReadingTrend,
} from "../types/api";

const EVENT_COLORS: Record<EventType, string> = {
  PAGE_ENTER: "#3b82f6",
  PAGE_ACTIVE: "#22c55e",
  PAGE_INACTIVE: "#f59e0b",
  PAGE_LEAVE: "#71717a",
};

const EVENT_BG: Record<EventType, string> = {
  PAGE_ENTER: "#1d2d3e",
  PAGE_ACTIVE: "#14280e",
  PAGE_INACTIVE: "#2a1f08",
  PAGE_LEAVE: "#1c1c1f",
};

function KpiCard({ label, value, sub, icon: Icon, accent }: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>{label}</span>
        <Icon size={14} style={{ color: accent ? "var(--primary)" : "var(--muted-foreground)" }} />
      </div>
      <div className="text-[22px] font-semibold tracking-tight">{value}</div>
      <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>{sub}</p>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border text-[11px] px-3 py-2" style={{ background: "#1c1c1f", borderColor: "var(--border)" }}>
      <p className="font-mono mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      {payload.map((item: any) => <p key={item.name} style={{ color: item.color }}>{item.name}: <strong>{item.value}</strong></p>)}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<DashboardOverview>({
    totalArticles: 0,
    totalReadingMs: 0,
    averageReadingMs: 0,
    activeSessions: 0,
  });
  const [trend, setTrend] = useState<Array<{ date: string; readingMinutes: number }>>([]);
  const [byWebsite, setByWebsite] = useState<Array<{ name: string; readingMinutes: number }>>([]);
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveReadingEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [overviewData, trendData, websiteData, articleData] = await Promise.all([
        request<DashboardOverview>("/dashboard/overview"),
        request<ReadingTrend[]>("/dashboard/reading-trend"),
        request<ReadingByWebsite[]>("/dashboard/reading-by-website"),
        request<Paginated<ArticleListItem>>("/articles?page=1&limit=5&sort=latest"),
      ]);
      setOverview(overviewData);
      setTrend(trendData.map((item) => ({
        date: new Date(`${item.date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" }),
        readingMinutes: Math.round((item.totalReadingMs / 60000) * 10) / 10,
      })));
      const sortedWebsites = [...websiteData].sort((a, b) => b.totalReadingMs - a.totalReadingMs);
      const topWebsites = sortedWebsites.slice(0, 5).map((item) => ({
        name: item.name,
        readingMinutes: Math.round((item.totalReadingMs / 60000) * 10) / 10,
      }));
      const remainingWebsites = sortedWebsites.slice(5);

      if (remainingWebsites.length) {
        topWebsites.push({
          name: "Others",
          readingMinutes: Math.round((remainingWebsites.reduce((sum, item) => sum + item.totalReadingMs, 0) / 60000) * 10) / 10,
        });
      }

      setByWebsite(topWebsites);
      setArticles(articleData.data);
      setError("");
    } catch {
      setError("Unable to load dashboard data.");
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const socket = io(`${SOCKET_URL}/dashboard`, { withCredentials: true });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("reading:event", (event: LiveReadingEvent) => {
      setLiveEvents((items) => [event, ...items].slice(0, 8));
    });
    socket.on("reading:session-updated", () => {
      void loadData();
    });
    return () => {
      socket.disconnect();
    };
  }, [loadData]);

  return (
    <Layout title="Dashboard">
      {error && <p className="text-[12px] mb-3" style={{ color: "#f87171" }}>{error}</p>}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <KpiCard label="Total Articles" value={String(overview.totalArticles)} sub="All tracked articles" icon={FileText} />
        <KpiCard label="Total Reading Time" value={formatDuration(overview.totalReadingMs)} sub="All sessions" icon={Clock} />
        <KpiCard label="Avg Reading Time" value={formatDuration(overview.averageReadingMs)} sub="Per session" icon={Activity} />
        <KpiCard label="Active Sessions" value={String(overview.activeSessions)} sub="Right now" icon={Wifi} accent />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="col-span-2 rounded-lg border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[13px] font-semibold">Reading Time Over Time</h3>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>Active reading minutes by day</p>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: connected ? "#14280e" : "#1c1c1f", color: connected ? "#4ade80" : "#71717a" }}>
              {connected ? "LIVE" : "OFFLINE"}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="readingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} unit="m" />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="readingMinutes" name="Minutes" stroke="#3b82f6" fill="url(#readingGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <h3 className="text-[13px] font-semibold mb-0.5">Reading Time by Website</h3>
          <p className="text-[11px] mb-4" style={{ color: "var(--muted-foreground)" }}>Last 7 days</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={byWebsite} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#a1a1aa" }} tickLine={false} axisLine={false} width={90} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="readingMinutes" name="Minutes" fill="#3b82f6" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 rounded-lg border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-[13px] font-semibold">Recent Articles</h3>
            <button onClick={() => navigate("/articles")} className="flex items-center gap-1 text-[11px]" style={{ color: "var(--primary)" }}>View all <ArrowUpRight size={11} /></button>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Title", "Domain", "Read Time", "Time"].map((label) => <th key={label} className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {articles.map((article, index) => (
                <tr key={article.id} onClick={() => navigate(`/articles/${article.id}`)} className="cursor-pointer hover:bg-[#1c1c1f]" style={{ borderBottom: index < articles.length - 1 ? "1px solid var(--border)" : undefined }}>
                  <td className="px-4 py-2.5 max-w-[240px]">
                    <div className="flex items-center gap-2">
                      {article.isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-400 animate-pulse" />}
                      <span className="text-[12px] line-clamp-1">{article.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: "var(--muted-foreground)" }}>{article.website.domain}</td>
                  <td className="px-4 py-2.5 font-mono text-[12px]">{formatDuration(article.totalReadingMs)}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: "var(--muted-foreground)" }}>{formatTime(article.latestReadingAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-[13px] font-semibold">Live Activity</h3>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: connected ? "#4ade80" : "#71717a" }} />
          </div>
          <div className="overflow-y-auto max-h-[280px]">
            {liveEvents.map((event) => (
              <div key={event.eventId} className="flex items-start gap-2.5 px-4 py-2.5 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded mt-0.5" style={{ background: EVENT_BG[event.eventType], color: EVENT_COLORS[event.eventType] }}>{event.eventType.replace("PAGE_", "")}</span>
                <div className="min-w-0">
                  <p className="text-[11px] truncate">{event.article.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                    <span>{event.article.domain}</span><span>·</span><span>{formatTime(event.occurredAt)}</span>
                  </div>
                </div>
              </div>
            ))}
            {!liveEvents.length && <div className="px-4 py-8 text-center text-[11px]" style={{ color: "var(--muted-foreground)" }}>{connected ? "Waiting for activity..." : "Realtime disconnected"}</div>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
