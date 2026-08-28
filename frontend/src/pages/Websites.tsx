import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Globe, Plus, Settings2, X } from "lucide-react";
import Layout from "../components/Layout";
import { request } from "../lib/request";
import type { Website } from "../types/api";

function WebsiteModal({ website, onClose, onSaved }: { website?: Website; onClose: () => void; onSaved: (website: Website) => void }) {
  const [name, setName] = useState(website?.name || "");
  const [domain, setDomain] = useState(website?.domain || "");
  const [titleSelector, setTitleSelector] = useState(website?.titleSelector || "");
  const [contentSelector, setContentSelector] = useState(website?.contentSelector || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const saved = await request<Website>(website ? `/websites/${website.id}` : "/websites", {
        method: website ? "PATCH" : "POST",
        body: {
          name: name.trim(),
          domain: domain.trim(),
          titleSelector: titleSelector.trim() || null,
          contentSelector: contentSelector.trim() || null,
        },
      });
      onSaved(saved);
      onClose();
    } catch {
      setError("Unable to save website.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveConfig() {
    if (!website) return;

    setLoading(true);
    setError("");
    try {
      const saved = await request<Website>(`/websites/${website.id}`, {
        method: "PATCH",
        body: {
          titleSelector: null,
          contentSelector: null,
        },
      });
      onSaved(saved);
      onClose();
    } catch {
      setError("Unable to remove configuration.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg border" style={{ background: "var(--card)", borderColor: "var(--border)" }} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-[14px] font-semibold">{website ? "Configure Website" : "Add Website"}</h2>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Website Name</label>
            <input value={name} onChange={(event) => setName(event.target.value)} required className="w-full px-3 py-2 rounded text-[13px] outline-none" style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Domain</label>
            <input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="example.com" required className="w-full px-3 py-2 rounded text-[13px] outline-none font-mono" style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Title Selector</label>
            <input value={titleSelector} onChange={(event) => setTitleSelector(event.target.value)} placeholder="h1.article-title" className="w-full px-3 py-2 rounded text-[13px] outline-none font-mono" style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Content Selector</label>
            <input value={contentSelector} onChange={(event) => setContentSelector(event.target.value)} placeholder="article .content" className="w-full px-3 py-2 rounded text-[13px] outline-none font-mono" style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
          </div>
          {error && <p className="text-[12px]" style={{ color: "#f87171" }}>{error}</p>}
          {website && (website.titleSelector || website.contentSelector) && (
            <button type="button" onClick={handleRemoveConfig} disabled={loading} className="w-full py-2 rounded text-[12px] disabled:opacity-50" style={{ border: "1px solid #7f1d1d", color: "#f87171" }}>Remove Configuration</button>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded text-[12px]" style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded text-[12px] font-medium disabled:opacity-50" style={{ background: "var(--primary)", color: "white" }}>{loading ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Websites() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [modalWebsite, setModalWebsite] = useState<Website | null>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    request<Website[]>("/websites")
      .then(setWebsites)
      .catch(() => setError("Unable to load websites."))
      .finally(() => setLoading(false));
  }, []);

  async function toggleEnabled(website: Website) {
    try {
      const updated = await request<Website>(`/websites/${website.id}`, {
        method: "PATCH",
        body: { isEnabled: !website.isEnabled },
      });
      setWebsites((items) => items.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
    } catch {
      setError("Unable to update website.");
    }
  }

  return (
    <Layout title="Websites">
      {modalWebsite !== undefined && (
        <WebsiteModal
          website={modalWebsite || undefined}
          onClose={() => setModalWebsite(undefined)}
          onSaved={(saved) => setWebsites((items) => items.some((item) => item.id === saved.id) ? items.map((item) => item.id === saved.id ? { ...item, ...saved } : item) : [...items, saved])}
        />
      )}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>{websites.length} tracked source{websites.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setModalWebsite(null)} className="flex items-center gap-1.5 px-3 py-2 rounded text-[12px] font-medium" style={{ background: "var(--primary)", color: "white" }}><Plus size={13} />Add Website</button>
      </div>
      {error && <p className="text-[12px] mb-3" style={{ color: "#f87171" }}>{error}</p>}
      {loading ? (
        <div className="py-16 text-center text-[13px]" style={{ color: "var(--muted-foreground)" }}>Loading...</div>
      ) : (
        <div className="space-y-2">
          {websites.map((website) => (
            <div key={website.id} className="rounded-lg border p-4 flex items-center gap-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: website.isEnabled ? "#1d2d3e" : "var(--muted)" }}>
                <Globe size={16} style={{ color: website.isEnabled ? "var(--primary)" : "var(--muted-foreground)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold">{website.name}</span>
                  {website.titleSelector && website.contentSelector && <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#1d2d3e", color: "var(--primary)" }}>CONFIGURED</span>}
                  {!website.isEnabled && <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>DISABLED</span>}
                </div>
                <a href={`https://${website.domain}`} target="_blank" className="font-mono text-[11px]" style={{ color: "var(--primary)" }}>{website.domain}</a>
                {website.extractionWarning && <p className="text-[11px] mt-1" style={{ color: "#fbbf24" }}>Extracted title or content may be incomplete.</p>}
              </div>
              <button onClick={() => setModalWebsite(website)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px]" style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }}><Settings2 size={13} />Configure</button>
              <button onClick={() => toggleEnabled(website)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px]" style={{ border: "1px solid var(--border)", color: website.isEnabled ? "#4ade80" : "var(--muted-foreground)" }}>
                {website.isEnabled ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                {website.isEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
