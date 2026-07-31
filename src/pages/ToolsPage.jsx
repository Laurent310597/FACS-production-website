import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Banknote, Calculator, CalendarRange, Coins, Landmark, PiggyBank, RefreshCw, ShieldCheck, TrendingUp } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../components/LanguageContext";

const money = (value, language = "vi") => new Intl.NumberFormat(language === "vi" ? "vi-VN" : "en-US", { maximumFractionDigits: 0 }).format(Number(value) || 0);
const numberValue = (value) => Math.max(0, Number(String(value).replace(/[^0-9.-]/g, "")) || 0);

const toolList = [
  { slug: "gross-net", icon: Banknote, vi: "Tính lương Gross – Net", en: "Gross – Net Salary", descVi: "Ước tính lương thực nhận, bảo hiểm và thuế TNCN theo quy định 2026.", descEn: "Estimate take-home pay, compulsory insurance and PIT under the 2026 rules." },
  { slug: "personal-income-tax", icon: Calculator, vi: "Tính thuế TNCN", en: "Personal Income Tax", descVi: "Tính thuế tiền lương theo biểu thuế lũy tiến từng phần 5 bậc.", descEn: "Calculate salary income tax using the five-band progressive schedule." },
  { slug: "unemployment-benefit", icon: ShieldCheck, vi: "Tính BHTN", en: "Unemployment Benefit", descVi: "Ước tính mức hưởng hằng tháng và thời gian hưởng trợ cấp thất nghiệp.", descEn: "Estimate monthly unemployment benefit and entitlement duration." },
  { slug: "one-time-social-insurance", icon: Landmark, vi: "Tính BHXH một lần", en: "One-time Social Insurance", descVi: "Ước tính quyền lợi theo thời gian đóng trước và từ năm 2014.", descEn: "Estimate the benefit based on contribution periods before and from 2014." },
  { slug: "savings-plan", icon: PiggyBank, vi: "Lập kế hoạch tiết kiệm", en: "Savings Planner", descVi: "Mô phỏng lãi kép, mục tiêu tài chính và khoản tiết kiệm định kỳ.", descEn: "Model compound growth, financial targets and recurring savings." },
  { slug: "rates-and-gold", icon: Coins, vi: "Tỷ giá & giá vàng", en: "FX & Gold Monitor", descVi: "Theo dõi tỷ giá tham khảo, giá vàng quốc tế quy đổi và nguồn chính thức.", descEn: "Monitor reference FX rates, converted global gold price and official sources." },
];

const fieldClass = "mt-2 w-full rounded-2xl border border-white/10 bg-[#091422] px-4 py-3 text-white outline-none transition focus:border-cyan-300/45";
const panelClass = "rounded-[28px] border border-cyan-200/12 bg-white/[0.035] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-7";

function Field({ label, value, onChange, suffix, type = "number", min = 0, step = 1 }) {
  return <label className="block text-sm font-semibold text-slate-300">{label}<div className="relative"><input className={`${fieldClass} ${suffix ? "pr-16" : ""}`} type={type} min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} />{suffix && <span className="pointer-events-none absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-xs text-slate-500">{suffix}</span>}</div></label>;
}

function Result({ label, value, accent = false }) {
  return <div className={`flex items-center justify-between gap-4 border-b border-white/8 py-3 last:border-0 ${accent ? "text-cyan-200" : "text-slate-300"}`}><span className="text-sm">{label}</span><strong className="text-right text-base text-white">{value}</strong></div>;
}

const calculatePit = (taxable) => {
  const bands = [[10e6, .05], [30e6, .10], [60e6, .20], [100e6, .30], [Infinity, .35]];
  let remaining = Math.max(0, taxable), lower = 0, tax = 0;
  for (const [upper, rate] of bands) { const slice = Math.min(remaining, upper - lower); tax += slice * rate; remaining -= slice; lower = upper; if (remaining <= 0) break; }
  return tax;
};

function SalaryCalculator({ isVi, pitOnly = false }) {
  const [gross, setGross] = useState(30000000);
  const [dependants, setDependants] = useState(0);
  const [insuranceSalary, setInsuranceSalary] = useState(30000000);
  const [region, setRegion] = useState("1");
  const [otherDeduction, setOtherDeduction] = useState(0);
  const regionMinimum = { 1: 5310000, 2: 4730000, 3: 4140000, 4: 3700000 }[region];
  const result = useMemo(() => {
    const income = numberValue(gross), base = Math.min(numberValue(insuranceSalary), 50600000);
    const social = pitOnly ? 0 : base * .08;
    const health = pitOnly ? 0 : base * .015;
    const unemployment = pitOnly ? 0 : Math.min(numberValue(insuranceSalary), regionMinimum * 20) * .01;
    const taxable = Math.max(0, income - social - health - unemployment - 15500000 - numberValue(dependants) * 6200000 - numberValue(otherDeduction));
    const pit = calculatePit(taxable);
    return { social, health, unemployment, taxable, pit, net: income - social - health - unemployment - pit };
  }, [gross, dependants, insuranceSalary, regionMinimum, otherDeduction, pitOnly]);
  return <div className="grid gap-6 lg:grid-cols-2"><div className={panelClass}><div className="grid gap-5 sm:grid-cols-2"><Field label={isVi ? "Thu nhập Gross/tháng" : "Monthly gross income"} value={gross} onChange={setGross} suffix="VND" />{!pitOnly && <Field label={isVi ? "Lương đóng bảo hiểm" : "Insurance salary"} value={insuranceSalary} onChange={setInsuranceSalary} suffix="VND" />}<Field label={isVi ? "Số người phụ thuộc" : "Number of dependants"} value={dependants} onChange={setDependants} />{!pitOnly && <label className="block text-sm font-semibold text-slate-300">{isVi ? "Vùng lương tối thiểu" : "Minimum-wage region"}<select className={fieldClass} value={region} onChange={(e) => setRegion(e.target.value)}>{[1,2,3,4].map((item) => <option key={item} value={item}>{isVi ? `Vùng ${item}` : `Region ${item}`}</option>)}</select></label>}<Field label={isVi ? "Khoản giảm trừ khác" : "Other deductible amount"} value={otherDeduction} onChange={setOtherDeduction} suffix="VND" /></div><p className="mt-5 text-xs leading-relaxed text-slate-500">{isVi ? "Mặc định áp dụng cá nhân cư trú, thu nhập từ tiền lương; giảm trừ bản thân 15,5 triệu đồng/tháng và người phụ thuộc 6,2 triệu đồng/tháng." : "Default assumptions: resident individual and employment income; monthly personal allowance of VND 15.5 million and dependant allowance of VND 6.2 million."}</p></div><div className={panelClass}>{!pitOnly && <><Result label={isVi ? "BHXH (8%)" : "Social insurance (8%)"} value={`${money(result.social)} VND`} /><Result label={isVi ? "BHYT (1,5%)" : "Health insurance (1.5%)"} value={`${money(result.health)} VND`} /><Result label={isVi ? "BHTN (1%)" : "Unemployment insurance (1%)"} value={`${money(result.unemployment)} VND`} /></>}<Result label={isVi ? "Thu nhập tính thuế" : "Taxable income"} value={`${money(result.taxable)} VND`} /><Result label={isVi ? "Thuế TNCN tạm tính" : "Estimated PIT"} value={`${money(result.pit)} VND`} /><Result accent label={isVi ? (pitOnly ? "Thu nhập sau thuế" : "Lương Net ước tính") : (pitOnly ? "Income after tax" : "Estimated net salary")} value={`${money(pitOnly ? numberValue(gross) - result.pit : result.net)} VND`} /></div></div>;
}

function UnemploymentCalculator({ isVi }) {
  const [averageSalary, setAverageSalary] = useState(12000000), [months, setMonths] = useState(48), [region, setRegion] = useState("1");
  const minimum = { 1: 5310000, 2: 4730000, 3: 4140000, 4: 3700000 }[region];
  const cap = minimum * 5;
  const duration = months < 12 ? 0 : Math.min(12, months <= 36 ? 3 : 3 + Math.floor((months - 36) / 12));
  const monthly = Math.min(numberValue(averageSalary) * .6, cap);
  return <div className="grid gap-6 lg:grid-cols-2"><div className={panelClass}><div className="grid gap-5"><Field label={isVi ? "Bình quân lương đóng BHTN 6 tháng cuối" : "Average UI salary for the last six months"} value={averageSalary} onChange={setAverageSalary} suffix="VND" /><Field label={isVi ? "Tổng thời gian đã đóng BHTN" : "Total UI contribution period"} value={months} onChange={setMonths} suffix={isVi ? "tháng" : "months"} /><label className="block text-sm font-semibold text-slate-300">{isVi ? "Vùng lương tối thiểu" : "Minimum-wage region"}<select className={fieldClass} value={region} onChange={(e) => setRegion(e.target.value)}>{[1,2,3,4].map((item) => <option key={item} value={item}>{isVi ? `Vùng ${item}` : `Region ${item}`}</option>)}</select></label></div></div><div className={panelClass}><Result label={isVi ? "Mức hưởng mỗi tháng" : "Monthly benefit"} value={`${money(monthly)} VND`} /><Result label={isVi ? "Thời gian hưởng ước tính" : "Estimated benefit duration"} value={`${duration} ${isVi ? "tháng" : "months"}`} /><Result accent label={isVi ? "Tổng trợ cấp ước tính" : "Estimated total benefit"} value={`${money(monthly * duration)} VND`} /><p className="mt-5 text-xs leading-relaxed text-slate-500">{isVi ? "Theo Luật Việc làm 2025, mức tối đa thống nhất bằng 5 lần lương tối thiểu vùng. Điều kiện hưởng, thời hạn nộp hồ sơ và thời gian đóng chưa hưởng cần được cơ quan có thẩm quyền xác nhận." : "Under the 2025 Employment Law, the cap is uniformly five times the regional minimum wage. Eligibility, filing deadlines and unused contribution periods remain subject to competent-authority confirmation."}</p></div></div>;
}

function OneTimeSocialInsurance({ isVi }) {
  const [before, setBefore] = useState(0), [after, setAfter] = useState(72), [average, setAverage] = useState(12000000);
  const years = (months) => { const full = Math.floor(months / 12), rest = months % 12; return full + (rest === 0 ? 0 : rest <= 6 ? .5 : 1); };
  const beforeYears = years(numberValue(before)), afterYears = years(numberValue(after));
  const benefit = numberValue(average) * (beforeYears * 1.5 + afterYears * 2);
  return <div className="grid gap-6 lg:grid-cols-2"><div className={panelClass}><div className="grid gap-5"><Field label={isVi ? "Thời gian đóng trước năm 2014" : "Contributions before 2014"} value={before} onChange={setBefore} suffix={isVi ? "tháng" : "months"} /><Field label={isVi ? "Thời gian đóng từ năm 2014" : "Contributions from 2014"} value={after} onChange={setAfter} suffix={isVi ? "tháng" : "months"} /><Field label={isVi ? "Mức bình quân tiền lương đóng BHXH" : "Average adjusted contribution salary"} value={average} onChange={setAverage} suffix="VND" /></div></div><div className={panelClass}><Result label={isVi ? "Thời gian quy đổi trước 2014" : "Converted period before 2014"} value={`${beforeYears} ${isVi ? "năm" : "years"}`} /><Result label={isVi ? "Thời gian quy đổi từ 2014" : "Converted period from 2014"} value={`${afterYears} ${isVi ? "năm" : "years"}`} /><Result accent label={isVi ? "BHXH một lần ước tính" : "Estimated lump-sum benefit"} value={`${money(benefit)} VND`} /><p className="mt-5 text-xs leading-relaxed text-slate-500">{isVi ? "Mức bình quân cần là mức đã điều chỉnh theo hệ số từng năm. Công cụ chưa thay thế dữ liệu quá trình đóng chính thức trên VssID/BHXH." : "The average salary should reflect statutory annual adjustment factors. This tool does not replace the official contribution record in VssID/social insurance records."}</p></div></div>;
}

function SavingsCalculator({ isVi }) {
  const [initial, setInitial] = useState(100000000), [monthly, setMonthly] = useState(10000000), [rate, setRate] = useState(6), [years, setYears] = useState(5), [target, setTarget] = useState(1000000000);
  const n = Math.round(numberValue(years) * 12), r = numberValue(rate) / 1200;
  const future = numberValue(initial) * Math.pow(1 + r, n) + (r ? numberValue(monthly) * ((Math.pow(1 + r, n) - 1) / r) : numberValue(monthly) * n);
  const needed = n ? Math.max(0, r ? (numberValue(target) - numberValue(initial) * Math.pow(1 + r, n)) * r / (Math.pow(1 + r, n) - 1) : (numberValue(target) - numberValue(initial)) / n) : 0;
  return <div className="grid gap-6 lg:grid-cols-2"><div className={panelClass}><div className="grid gap-5 sm:grid-cols-2"><Field label={isVi ? "Số tiền ban đầu" : "Initial savings"} value={initial} onChange={setInitial} suffix="VND" /><Field label={isVi ? "Tiết kiệm mỗi tháng" : "Monthly contribution"} value={monthly} onChange={setMonthly} suffix="VND" /><Field label={isVi ? "Lợi suất kỳ vọng/năm" : "Expected annual return"} value={rate} onChange={setRate} suffix="%" step="0.1" /><Field label={isVi ? "Thời gian" : "Time horizon"} value={years} onChange={setYears} suffix={isVi ? "năm" : "years"} /><Field label={isVi ? "Mục tiêu tài chính" : "Financial target"} value={target} onChange={setTarget} suffix="VND" /></div></div><div className={panelClass}><Result label={isVi ? "Tổng vốn tự tích lũy" : "Total principal contributed"} value={`${money(numberValue(initial) + numberValue(monthly) * n)} VND`} /><Result label={isVi ? "Giá trị dự kiến cuối kỳ" : "Projected ending value"} value={`${money(future)} VND`} /><Result label={isVi ? "Phần tăng trưởng dự kiến" : "Projected investment growth"} value={`${money(Math.max(0, future - numberValue(initial) - numberValue(monthly) * n))} VND`} /><Result accent label={isVi ? "Cần tiết kiệm mỗi tháng để đạt mục tiêu" : "Monthly saving required for target"} value={`${money(needed)} VND`} /><p className="mt-5 text-xs leading-relaxed text-slate-500">{isVi ? "Mô phỏng giả định lợi suất ổn định và góp tiền cuối mỗi tháng; không phải cam kết lợi nhuận hay tư vấn đầu tư." : "The model assumes a stable return and end-of-month contributions; it is not a return guarantee or investment advice."}</p></div></div>;
}

function RatesAndGold({ isVi }) {
  const [data, setData] = useState({ loading: true, error: "", rates: {}, gold: null, updated: null });
  const load = async () => { setData((d) => ({ ...d, loading: true, error: "" })); try { const [fxRes, goldRes] = await Promise.all([fetch("https://open.er-api.com/v6/latest/USD"), fetch("https://api.gold-api.com/price/XAU")]); const fx = await fxRes.json(); const gold = goldRes.ok ? await goldRes.json() : null; setData({ loading: false, error: "", rates: fx.rates || {}, gold, updated: new Date() }); } catch { setData((d) => ({ ...d, loading: false, error: isVi ? "Không thể tải dữ liệu tham khảo lúc này." : "Reference data is temporarily unavailable." })); } };
  useEffect(() => {
    let active = true;
    Promise.all([fetch("https://open.er-api.com/v6/latest/USD"), fetch("https://api.gold-api.com/price/XAU")])
      .then(async ([fxRes, goldRes]) => ({ fx: await fxRes.json(), gold: goldRes.ok ? await goldRes.json() : null }))
      .then(({ fx, gold }) => { if (active) setData({ loading: false, error: "", rates: fx.rates || {}, gold, updated: new Date() }); })
      .catch(() => { if (active) setData((d) => ({ ...d, loading: false, error: isVi ? "Không thể tải dữ liệu tham khảo lúc này." : "Reference data is temporarily unavailable." })); });
    return () => { active = false; };
  }, [isVi]);
  const vnd = data.rates.VND || 0, currencies = ["EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "KRW", "CNY"];
  const perTael = data.gold?.price && vnd ? data.gold.price * vnd * (37.5 / 31.1034768) : 0;
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-slate-400">{isVi ? "Dữ liệu quốc tế tham khảo; tỷ giá giao dịch và giá vàng trong nước có thể khác." : "International reference data; transaction rates and domestic gold prices may differ."}</p><button type="button" onClick={load} disabled={data.loading} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/20 px-4 py-2 text-sm font-semibold text-cyan-100"><RefreshCw size={15} className={data.loading ? "animate-spin" : ""} />{isVi ? "Làm mới" : "Refresh"}</button></div>{data.error && <div className="rounded-2xl border border-rose-300/20 bg-rose-300/5 p-4 text-rose-200">{data.error}</div>}<div className="grid gap-6 xl:grid-cols-2"><div className={panelClass}><h2 className="text-xl font-bold">{isVi ? "Tỷ giá tham khảo quy đổi qua USD" : "USD cross-rate reference"}</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-500"><tr><th className="py-3">{isVi ? "Ngoại tệ" : "Currency"}</th><th className="py-3 text-right">{isVi ? "VND/đơn vị" : "VND/unit"}</th></tr></thead><tbody>{["USD", ...currencies].map((code) => <tr key={code} className="border-t border-white/8"><td className="py-3 font-semibold text-white">{code}</td><td className="py-3 text-right text-slate-300">{money(code === "USD" ? vnd : vnd / (data.rates[code] || 1))}</td></tr>)}</tbody></table></div></div><div className={panelClass}><h2 className="text-xl font-bold">{isVi ? "Vàng quốc tế quy đổi" : "Converted global gold price"}</h2><div className="mt-4"><Result label={isVi ? "Giá vàng giao ngay" : "Spot gold"} value={data.gold?.price ? `${money(data.gold.price, "en")} USD/oz` : "—"} /><Result accent label={isVi ? "Quy đổi tham khảo/lượng" : "Reference conversion/tael"} value={perTael ? `${money(perTael)} VND` : "—"} /></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><a href="https://sbv.gov.vn/vi/t%E1%BB%B7-gi%C3%A1" target="_blank" rel="noreferrer" className="rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.05] p-4 text-sm font-semibold text-cyan-100">{isVi ? "Tỷ giá chính thức NHNN" : "Official SBV rates"} ↗</a><a href="https://sjc.com.vn/giavang/textContent.php" target="_blank" rel="noreferrer" className="rounded-2xl border border-amber-200/15 bg-amber-300/[0.05] p-4 text-sm font-semibold text-amber-100">{isVi ? "Giá vàng SJC" : "SJC gold prices"} ↗</a></div><p className="mt-5 text-xs leading-relaxed text-slate-500">{isVi ? "Đề xuất giai đoạn tiếp theo: kết nối nguồn ngân hàng và doanh nghiệp vàng trong nước qua lớp máy chủ, lưu lịch sử và biểu đồ chênh lệch mua–bán." : "Next-phase proposal: connect domestic bank and gold-company feeds through a server layer, with history and bid–ask spread charts."}</p></div></div>{data.updated && <p className="text-xs text-slate-600">{isVi ? "Cập nhật lúc" : "Updated"}: {data.updated.toLocaleString(isVi ? "vi-VN" : "en-US")}</p>}</div>;
}

function ToolHub({ isVi }) { return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{toolList.map(({ slug, icon: Icon, vi, en, descVi, descEn }) => <Link key={slug} to={`/tools/${slug}`} className="group rounded-[28px] border border-cyan-200/12 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:border-cyan-200/30 hover:bg-cyan-300/[0.055]"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200"><Icon size={23} /></span><h2 className="mt-5 text-xl font-bold text-white">{isVi ? vi : en}</h2><p className="mt-3 text-sm leading-relaxed text-slate-400">{isVi ? descVi : descEn}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">{isVi ? "Mở công cụ" : "Open tool"}<ArrowRight size={15} className="transition group-hover:translate-x-1" /></span></Link>)}</div>; }

export default function ToolsPage() {
  const { slug } = useParams(), { language } = useLanguage(), isVi = language === "vi";
  const tool = toolList.find((item) => item.slug === slug);
  const title = tool ? (isVi ? tool.vi : tool.en) : (isVi ? "Công cụ dành cho doanh nghiệp & cá nhân" : "Business & Personal Tools");
  const description = tool ? (isVi ? tool.descVi : tool.descEn) : (isVi ? "Các công cụ tính toán và tra cứu thực tiễn do FACS xây dựng, cập nhật theo quy định Việt Nam năm 2026." : "Practical calculators and reference tools developed by FACS and aligned with Vietnam's 2026 rules.");
  let content = <ToolHub isVi={isVi} />;
  if (slug === "gross-net") content = <SalaryCalculator isVi={isVi} />;
  if (slug === "personal-income-tax") content = <SalaryCalculator isVi={isVi} pitOnly />;
  if (slug === "unemployment-benefit") content = <UnemploymentCalculator isVi={isVi} />;
  if (slug === "one-time-social-insurance") content = <OneTimeSocialInsurance isVi={isVi} />;
  if (slug === "savings-plan") content = <SavingsCalculator isVi={isVi} />;
  if (slug === "rates-and-gold") content = <RatesAndGold isVi={isVi} />;
  return <div className="min-h-screen bg-[#0d1726] text-white"><Navbar /><main><section className="relative overflow-hidden border-b border-cyan-200/10 py-16 md:py-24"><div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(34,211,238,0.14),transparent_32%)]" /><div className="container relative mx-auto px-6 lg:px-12"><div className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/80">FACS Resources</div><h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">{title}</h1><p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-400 md:text-lg">{description}</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/legal-calendar" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"><CalendarRange size={16} />{isVi ? "Lịch pháp lý" : "Legal Calendar"}</Link>{slug && <Link to="/tools" className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/20 bg-cyan-300/[0.06] px-4 py-2 text-sm text-cyan-100"><TrendingUp size={16} />{isVi ? "Tất cả công cụ" : "All tools"}</Link>}</div></div></section><section className="container mx-auto px-6 py-12 lg:px-12 lg:py-16">{content}<div className="mt-10 rounded-2xl border border-amber-200/12 bg-amber-200/[0.035] px-5 py-4 text-xs leading-relaxed text-slate-500">{isVi ? "Kết quả chỉ nhằm mục đích tham khảo trên cơ sở dữ liệu nhập và giả định hiển thị. Cách xử lý cuối cùng có thể thay đổi theo hồ sơ, thời điểm, tình trạng cư trú, đối tượng bảo hiểm và hướng dẫn của cơ quan có thẩm quyền." : "Results are for reference only, based on the entered data and displayed assumptions. Final treatment may vary with the supporting records, period, residence status, insurance coverage and competent-authority guidance."}</div></section></main><Footer /></div>;
}
