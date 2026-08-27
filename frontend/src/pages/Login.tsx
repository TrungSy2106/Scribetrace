import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { request } from "../lib/request";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await request("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      navigate("/dashboard");
    } catch {
      setError("Email hoặc mật khẩu không đúng.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
            style={{ background: "var(--primary)" }}
          >
            <Activity size={20} color="white" />
          </div>
          <h1 className="text-[18px] font-semibold mb-1" style={{ color: "var(--foreground)" }}>
            NewsTracker Admin
          </h1>
          <p className="text-[13px] text-center" style={{ color: "var(--muted-foreground)" }}>
            Restricted to administrators only
          </p>
        </div>

        {/* Admin notice */}
        <div
          className="flex items-start gap-2.5 px-3.5 py-3 rounded mb-5 text-[12px]"
          style={{ background: "#1a1508", border: "1px solid #422006", color: "#fbbf24" }}
        >
          <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
          <span>Trang này chỉ dành cho quản trị viên hệ thống. Nếu bạn không có quyền truy cập, vui lòng liên hệ bộ phận kỹ thuật.</span>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border p-5"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="mb-4">
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full px-3 py-2 rounded text-[13px] outline-none transition-colors"
              style={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--ring)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <div className="mb-5">
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              Mật khẩu
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 pr-10 rounded text-[13px] outline-none transition-colors"
                style={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--ring)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--muted-foreground)" }}
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-[12px] mb-4" style={{ color: "#f87171" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded text-[13px] font-medium transition-opacity"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Đang xác thực..." : "Đăng nhập"}
          </button>
        </form>

      </div>
    </div>
  );
}
