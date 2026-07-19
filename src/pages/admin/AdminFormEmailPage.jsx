import { useEffect, useState } from "react";
import { CheckCircle2, Link2, Loader2, MailCheck, RefreshCw, Send, XCircle } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { invokeFormEmailAdmin } from "../../lib/formSubmissions";

const publicMailboxes = [
  { email: "hr@facs.vn", name: "FACS Careers" },
  { email: "contact@facs.vn", name: "FACS Contact" },
];

export default function AdminFormEmailPage() {
  const [connection, setConnection] = useState({ loading: true, connected: false });
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => { setError(""); try { const data = await invokeFormEmailAdmin("oauth_status"); setConnection({ ...data, loading: false }); } catch (loadError) { setConnection({ loading: false, connected: false }); setError(loadError.message); } };
  useEffect(() => { let active = true; invokeFormEmailAdmin("oauth_status").then((data) => { if (active) setConnection({ ...data, loading: false }); }).catch((loadError) => { if (active) { setConnection({ loading: false, connected: false }); setError(loadError.message); } }); return () => { active = false; }; }, []);
  const connect = async () => { setWorking("connect"); setError(""); try { const data = await invokeFormEmailAdmin("oauth_url"); window.location.href = data.url; } catch (connectError) { setError(connectError.message); setWorking(""); } };
  const testAlias = async (email) => { setWorking(email); setMessage(""); setError(""); try { await invokeFormEmailAdmin("test", { sender_email: email }); setMessage(`Đã gửi email thử từ ${email} đến tunguyen@facs.vn. Hãy kiểm tra From trong hộp thư.`); } catch (testError) { setError(testError.message); } finally { setWorking(""); } };

  return (
    <AdminLayout>
      <div><div className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Email automation</div><h1 className="mt-2 text-3xl font-bold md:text-4xl">Email biểu mẫu</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">Kết nối một lần bằng thành viên tunguyen@facs.vn, sau đó gửi trực tiếp từ Public Mailbox hr@facs.vn hoặc contact@facs.vn.</p></div>
      {(message || error) && <div className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${error ? "border-red-300/20 bg-red-400/8 text-red-200" : "border-emerald-300/20 bg-emerald-300/8 text-emerald-200"}`}>{error || message}</div>}
      <section className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.035] p-6 md:p-8"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-3"><MailCheck className="text-cyan-300" /><h2 className="text-xl font-semibold">Tài khoản Lark chính</h2></div><div className="mt-4 flex items-center gap-2 text-sm">{connection.loading ? <><Loader2 size={17} className="animate-spin" /> Đang kiểm tra...</> : connection.connected ? <><CheckCircle2 size={18} className="text-emerald-300" /><span className="text-emerald-200">Đã kết nối {connection.mailbox_email}</span></> : <><XCircle size={18} className="text-amber-300" /><span className="text-amber-200">Chưa kết nối tunguyen@facs.vn</span></>}</div></div><div className="flex gap-3"><button onClick={load} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm"><RefreshCw size={17} /> Kiểm tra</button><button disabled={working === "connect"} onClick={connect} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421]"><Link2 size={18} /> {connection.connected ? "Kết nối lại" : "Kết nối Lark"}</button></div></div></section>
      <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.035] p-6 md:p-8"><h2 className="text-xl font-semibold">Kiểm tra Public Mailbox</h2><p className="mt-2 text-sm text-slate-500">Sau khi kết nối, gửi thử từng hộp thư công khai và kiểm tra email nhận được hiển thị đúng trường From.</p><div className="mt-5 grid gap-4 md:grid-cols-2">{publicMailboxes.map((mailbox) => <div key={mailbox.email} className="rounded-2xl border border-white/10 bg-[#081321]/60 p-5"><div className="font-semibold">{mailbox.name}</div><div className="mt-1 text-sm text-cyan-200">{mailbox.email}</div><button disabled={!connection.connected || working === mailbox.email} onClick={() => testAlias(mailbox.email)} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold disabled:opacity-40">{working === mailbox.email ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Gửi thử</button></div>)}</div></section>
    </AdminLayout>
  );
}
