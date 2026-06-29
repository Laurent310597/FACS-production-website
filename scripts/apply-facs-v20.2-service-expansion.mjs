import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => fs.writeFileSync(path.join(root, file), content, "utf8");

const servicesContent = fs.readFileSync(new URL("../src/data/services.js", import.meta.url), "utf8");
write("src/data/services.js", servicesContent);

let navbar = read("src/components/Navbar.jsx");
navbar = navbar.replace(
  'const dropdownClass = "pointer-events-none absolute left-1/2 top-full z-50 mt-4 w-[380px] -translate-x-1/2 translate-y-2 rounded-3xl border border-cyan-200/15 bg-[#0d1726]/96 p-3 opacity-0 shadow-[0_26px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100";',
  'const dropdownClass = "pointer-events-none absolute left-1/2 top-full z-50 mt-4 max-h-[calc(100vh-7rem)] w-[420px] -translate-x-1/2 translate-y-2 overflow-y-auto rounded-3xl border border-cyan-200/15 bg-[#0d1726]/96 p-3 opacity-0 shadow-[0_26px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100";'
);
navbar = navbar.replace(
  '<div className="px-4 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">{isVi ? "6 nhóm dịch vụ" : "6 Service Pillars"}</div>',
  '<div className="px-4 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">{isVi ? `${services.length} nhóm dịch vụ` : `${services.length} Service Pillars`}</div>'
);
write("src/components/Navbar.jsx", navbar);

let servicesPage = read("src/pages/ServicesPage.jsx");
servicesPage = servicesPage.replaceAll('AnimatedCounter value="6"', 'AnimatedCounter value="9"');
servicesPage = servicesPage.replace(
  "Comprehensive accounting, taxation, legal and operational consulting solutions designed for modern enterprises.",
  "Comprehensive accounting, taxation, legal, audit, ERP and operational consulting solutions designed for modern enterprises."
);
write("src/pages/ServicesPage.jsx", servicesPage);

let homePage = read("src/pages/HomePage.jsx");
homePage = homePage.replace(
`  const heroStats = [
    ["100+", isVi ? "Khách hàng doanh nghiệp" : "Enterprise Clients"],
    ["10+", isVi ? "Năm kinh nghiệm" : "Years of Experience"],
    ["8", isVi ? "Lĩnh vực chuyên sâu" : "Industry Sectors"],
    ["10+", isVi ? "Đối tác chiến lược" : "Strategic Partners"],
  ];`,
`  const heroStats = [
    ["100+", isVi ? "Khách hàng doanh nghiệp" : "Enterprise Clients"],
    ["9", isVi ? "Nhóm dịch vụ" : "Service Pillars"],
    ["8", isVi ? "Lĩnh vực chuyên sâu" : "Industry Sectors"],
    ["10+", isVi ? "Đối tác chiến lược" : "Strategic Partners"],
  ];`
);
homePage = homePage.replace(
`  const visualStats = [
    [ShieldCheck, "100%", isVi ? "Tuân thủ" : "Compliance"],
    [BarChart3, "3.2x", isVi ? "Hiệu quả vận hành" : "Efficiency"],
    [BriefcaseBusiness, "8", isVi ? "Lĩnh vực" : "Industry Sectors"],
    [Handshake, "10+", isVi ? "Đối tác" : "Strategic Partners"],
  ];`,
`  const visualStats = [
    [BriefcaseBusiness, "9", isVi ? "Nhóm dịch vụ" : "Service Pillars"],
    [ShieldCheck, "100%", isVi ? "Tuân thủ" : "Compliance"],
    [BarChart3, "8", isVi ? "Lĩnh vực" : "Industry Sectors"],
    [Handshake, "10+", isVi ? "Đối tác" : "Strategic Partners"],
  ];`
);
write("src/pages/HomePage.jsx", homePage);

console.log("FACS v20.2 Service Portfolio Expansion patch applied.");
console.log("Next: npm run lint && npm run build && git add . && git commit -m 'Add 9 service pillars' && git push");
