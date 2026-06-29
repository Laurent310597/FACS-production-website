import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const write = (relativePath, content) => {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content.trimStart(), "utf8");
  console.log(`Updated ${relativePath}`);
};

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const servicesJs = String.raw`import {
  Calculator,
  ShieldCheck,
  Scale,
  Briefcase,
  Building2,
  GraduationCap,
  FileCheck2,
  Cog,
  Puzzle,
} from "lucide-react";

export const services = [
  {
    slug: "accounting-reports",
    icon: Calculator,
    title: "Accounting & Financial Reporting",
    titleVi: "Dịch vụ kế toán và báo cáo tài chính",
    desc: "Comprehensive accounting systems, bookkeeping and financial reporting infrastructure.",
    descVi: "Thiết lập hệ thống kế toán, ghi sổ và hạ tầng báo cáo tài chính toàn diện cho doanh nghiệp.",
    details: [
      "Bookkeeping and accounting system setup for daily business operations.",
      "Monthly, quarterly and annual financial reporting support.",
      "Management reporting infrastructure for enterprise decision-making.",
    ],
    detailsVi: [
      "Thiết lập hệ thống kế toán và ghi nhận giao dịch phục vụ hoạt động vận hành hằng ngày.",
      "Hỗ trợ lập báo cáo tài chính, báo cáo quản trị theo tháng, quý và năm.",
      "Xây dựng nền tảng báo cáo phục vụ quản trị và ra quyết định của ban lãnh đạo.",
    ],
    overview:
      "This service helps enterprises establish reliable accounting records and reporting routines that support compliance, management visibility and sustainable business control.",
    overviewVi:
      "Dịch vụ này giúp doanh nghiệp thiết lập hệ thống kế toán và báo cáo đáng tin cậy, phục vụ tuân thủ, quản trị nội bộ và kiểm soát hoạt động bền vững.",
    typicalClients: [
      "Startups and newly established companies",
      "SMEs requiring structured accounting operations",
      "FDI enterprises needing monthly reporting discipline",
      "Growing companies moving from Excel-based records to formal reporting",
    ],
    typicalClientsVi: [
      "Doanh nghiệp mới thành lập và startup",
      "Doanh nghiệp vừa và nhỏ cần chuẩn hóa vận hành kế toán",
      "Doanh nghiệp FDI cần báo cáo định kỳ có kỷ luật",
      "Doanh nghiệp đang chuyển từ quản lý bằng Excel sang hệ thống báo cáo chính thức",
    ],
    challenges: [
      "Inconsistent bookkeeping and supporting documentation",
      "Delayed monthly closing and unreliable management reports",
      "Weak reconciliation discipline across cash, bank, receivables, payables and inventory",
      "Limited visibility over financial performance and compliance exposure",
    ],
    challengesVi: [
      "Ghi sổ và chứng từ hỗ trợ chưa nhất quán",
      "Chậm khóa sổ tháng và báo cáo quản trị chưa đủ tin cậy",
      "Đối chiếu tiền, ngân hàng, công nợ và hàng tồn kho chưa chặt chẽ",
      "Thiếu khả năng nhìn rõ hiệu quả tài chính và rủi ro tuân thủ",
    ],
    approach: [
      "Review current records, reporting needs and internal workflows",
      "Design accounting routines, closing checklists and reporting templates",
      "Support implementation, reconciliation and periodic reporting",
      "Continuously improve documentation quality and management visibility",
    ],
    approachVi: [
      "Rà soát sổ sách, nhu cầu báo cáo và quy trình nội bộ hiện tại",
      "Thiết kế quy trình kế toán, checklist khóa sổ và mẫu báo cáo",
      "Hỗ trợ triển khai, đối chiếu và lập báo cáo định kỳ",
      "Liên tục cải thiện chất lượng chứng từ và khả năng quản trị thông tin",
    ],
    deliverables: [
      "Accounting workflow and closing checklist",
      "Monthly bookkeeping and reporting package",
      "Management reporting templates",
      "Reconciliation files and supporting schedules",
    ],
    deliverablesVi: [
      "Quy trình kế toán và checklist khóa sổ",
      "Bộ ghi sổ và báo cáo định kỳ",
      "Mẫu báo cáo quản trị",
      "File đối chiếu và bảng thuyết minh hỗ trợ",
    ],
    whyChoose:
      "Reliable accounting information is the foundation for every sustainable business decision. Without a structured reporting system, management may face delayed insights, inconsistent records and avoidable compliance exposure.",
    whyChooseVi:
      "Thông tin kế toán đáng tin cậy là nền tảng cho mọi quyết định kinh doanh bền vững. Nếu thiếu hệ thống báo cáo có cấu trúc, ban lãnh đạo có thể đối mặt với dữ liệu chậm, sổ sách thiếu nhất quán và rủi ro tuân thủ không cần thiết.",
    facsValue:
      "FACS helps enterprises build a disciplined accounting workflow that connects daily transactions, statutory reporting and management-level financial visibility. Our approach is practical, documentation-driven and designed to support both compliance and decision-making.",
    facsValueVi:
      "FACS giúp doanh nghiệp xây dựng quy trình kế toán có kỷ luật, kết nối giao dịch hằng ngày, báo cáo pháp định và thông tin quản trị. Cách tiếp cận của chúng tôi thực tế, dựa trên chứng từ và phục vụ đồng thời yêu cầu tuân thủ lẫn ra quyết định.",
    whyFacs:
      "We combine technical accounting knowledge with an advisory mindset, helping clients not only prepare reports, but also understand the financial story behind their numbers.",
    whyFacsVi:
      "Chúng tôi kết hợp chuyên môn kế toán với tư duy tư vấn, giúp khách hàng không chỉ lập báo cáo mà còn hiểu được câu chuyện tài chính phía sau các con số.",
  },
  {
    slug: "tax-compliance",
    icon: ShieldCheck,
    title: "Tax Compliance & Advisory",
    titleVi: "Dịch vụ tuân thủ và tư vấn thuế",
    desc: "Strategic taxation consulting, declarations and enterprise tax optimization.",
    descVi: "Tư vấn thuế, kê khai thuế và tối ưu hóa nghĩa vụ thuế doanh nghiệp theo hướng tuân thủ.",
    details: [
      "Periodic tax declaration and compliance review support.",
      "Tax risk assessment for transactions and enterprise operations.",
      "Advisory support for sustainable and compliant tax planning.",
    ],
    detailsVi: [
      "Hỗ trợ kê khai thuế định kỳ và rà soát tuân thủ.",
      "Đánh giá rủi ro thuế đối với giao dịch và hoạt động doanh nghiệp.",
      "Tư vấn lập kế hoạch thuế bền vững, phù hợp quy định.",
    ],
    overview:
      "This service supports enterprises in managing tax filing obligations, transaction-level tax risks and tax positions with a clear compliance and documentation framework.",
    overviewVi:
      "Dịch vụ này hỗ trợ doanh nghiệp quản lý nghĩa vụ kê khai thuế, rủi ro thuế theo từng giao dịch và các vị thế thuế thông qua một khung tuân thủ và hồ sơ rõ ràng.",
    typicalClients: [
      "FDI companies operating in Vietnam",
      "SMEs with recurring tax filing obligations",
      "Companies preparing for tax inspection or review",
      "Businesses with complex transactions or cross-border elements",
    ],
    typicalClientsVi: [
      "Doanh nghiệp FDI hoạt động tại Việt Nam",
      "Doanh nghiệp vừa và nhỏ có nghĩa vụ kê khai thuế định kỳ",
      "Doanh nghiệp chuẩn bị thanh tra, kiểm tra hoặc rà soát thuế",
      "Doanh nghiệp có giao dịch phức tạp hoặc yếu tố xuyên biên giới",
    ],
    challenges: [
      "Frequent changes in tax regulations and administrative practice",
      "Insufficient supporting documents for tax positions",
      "Unclear VAT, CIT, PIT or contractor tax treatment",
      "Potential exposure during tax audits and inspections",
    ],
    challengesVi: [
      "Quy định và thực tiễn quản lý thuế thường xuyên thay đổi",
      "Hồ sơ chứng minh cho vị thế thuế chưa đầy đủ",
      "Chưa rõ cách xử lý VAT, CIT, PIT hoặc thuế nhà thầu",
      "Tiềm ẩn rủi ro khi thanh tra, kiểm tra thuế",
    ],
    approach: [
      "Review tax obligations, filing calendar and supporting documents",
      "Assess key tax risks and transaction treatment",
      "Prepare or review declarations and tax working files",
      "Recommend practical remediation and documentation improvements",
    ],
    approachVi: [
      "Rà soát nghĩa vụ thuế, lịch kê khai và hồ sơ hỗ trợ",
      "Đánh giá rủi ro thuế trọng yếu và cách xử lý giao dịch",
      "Lập hoặc soát xét tờ khai và file làm việc thuế",
      "Đề xuất phương án khắc phục và hoàn thiện hồ sơ thực tế",
    ],
    deliverables: [
      "Tax filing and compliance calendar",
      "Tax risk review memo",
      "Tax declaration support files",
      "Tax remediation and documentation checklist",
    ],
    deliverablesVi: [
      "Lịch kê khai và tuân thủ thuế",
      "Bản ghi nhớ rà soát rủi ro thuế",
      "Hồ sơ hỗ trợ kê khai thuế",
      "Checklist khắc phục và hoàn thiện hồ sơ thuế",
    ],
    whyChoose:
      "Tax compliance is no longer a routine administrative function. Enterprises must manage changing regulations, transaction risks and documentation requirements with a clear and proactive tax governance framework.",
    whyChooseVi:
      "Tuân thủ thuế không còn là công việc hành chính đơn thuần. Doanh nghiệp cần quản lý thay đổi pháp luật, rủi ro giao dịch và yêu cầu hồ sơ bằng một khung quản trị thuế rõ ràng, chủ động.",
    facsValue:
      "FACS supports periodic declarations, reviews tax positions and identifies risk areas before they become costly issues. We focus on sustainable compliance, transparent documentation and commercially sensible tax planning.",
    facsValueVi:
      "FACS hỗ trợ kê khai định kỳ, rà soát vị thế thuế và nhận diện khu vực rủi ro trước khi phát sinh chi phí lớn. Chúng tôi tập trung vào tuân thủ bền vững, hồ sơ minh bạch và kế hoạch thuế hợp lý về mặt thương mại.",
    whyFacs:
      "Our tax advisory style is clear, conservative where needed and business-oriented, helping management remain compliant while protecting operational flexibility.",
    whyFacsVi:
      "Phong cách tư vấn thuế của chúng tôi rõ ràng, thận trọng khi cần thiết và định hướng kinh doanh, giúp ban lãnh đạo duy trì tuân thủ mà vẫn bảo vệ sự linh hoạt vận hành.",
  },
  {
    slug: "corporate-legal",
    icon: Scale,
    title: "Corporate Legal Services",
    titleVi: "Dịch vụ pháp lý doanh nghiệp",
    desc: "Enterprise legal advisory, licensing and business compliance solutions.",
    descVi: "Tư vấn pháp lý doanh nghiệp, giấy phép và tuân thủ pháp lý trong hoạt động kinh doanh.",
    details: [
      "Enterprise licensing, amendment and business registration support.",
      "Corporate legal documentation and compliance advisory.",
      "Regulatory support for internal governance and business operations.",
    ],
    detailsVi: [
      "Hỗ trợ đăng ký, điều chỉnh giấy phép và hồ sơ doanh nghiệp.",
      "Tư vấn hồ sơ pháp lý và tuân thủ pháp lý doanh nghiệp.",
      "Hỗ trợ pháp lý cho quản trị nội bộ và vận hành kinh doanh.",
    ],
    overview:
      "This service helps enterprises maintain legal continuity, corporate records and licensing compliance throughout their business lifecycle.",
    overviewVi:
      "Dịch vụ này giúp doanh nghiệp duy trì tính liên tục pháp lý, hồ sơ doanh nghiệp và tuân thủ giấy phép trong suốt vòng đời hoạt động.",
    typicalClients: [
      "Newly established companies",
      "FDI enterprises requiring licensing support",
      "Companies changing business lines, capital or legal representatives",
      "Management teams needing corporate governance documentation",
    ],
    typicalClientsVi: [
      "Doanh nghiệp mới thành lập",
      "Doanh nghiệp FDI cần hỗ trợ giấy phép",
      "Doanh nghiệp thay đổi ngành nghề, vốn hoặc người đại diện theo pháp luật",
      "Ban lãnh đạo cần hồ sơ quản trị doanh nghiệp",
    ],
    challenges: [
      "Outdated corporate records or inconsistent internal documentation",
      "Licensing changes not aligned with actual business operations",
      "Weak legal documentation for governance decisions",
      "Regulatory uncertainty affecting business continuity",
    ],
    challengesVi: [
      "Hồ sơ doanh nghiệp lỗi thời hoặc tài liệu nội bộ thiếu nhất quán",
      "Giấy phép chưa phù hợp với hoạt động thực tế",
      "Hồ sơ pháp lý cho quyết định quản trị còn yếu",
      "Không chắc chắn về quy định ảnh hưởng đến tính liên tục kinh doanh",
    ],
    approach: [
      "Review legal status, licenses and corporate records",
      "Identify required amendments or compliance actions",
      "Prepare documentation and coordinate submission processes",
      "Maintain clear records for management and regulatory purposes",
    ],
    approachVi: [
      "Rà soát tình trạng pháp lý, giấy phép và hồ sơ doanh nghiệp",
      "Xác định thủ tục điều chỉnh hoặc hành động tuân thủ cần thiết",
      "Soạn hồ sơ và phối hợp quá trình nộp hồ sơ",
      "Duy trì hồ sơ rõ ràng phục vụ quản trị và cơ quan quản lý",
    ],
    deliverables: [
      "Corporate legal review checklist",
      "Licensing and amendment documents",
      "Internal governance documentation",
      "Regulatory filing support package",
    ],
    deliverablesVi: [
      "Checklist rà soát pháp lý doanh nghiệp",
      "Hồ sơ giấy phép và điều chỉnh",
      "Tài liệu quản trị nội bộ",
      "Bộ hồ sơ hỗ trợ nộp cho cơ quan quản lý",
    ],
    whyChoose:
      "Corporate legal compliance directly affects business continuity, investor confidence and operational legitimacy. Missing licenses, outdated records or weak documentation can create unnecessary legal and governance risks.",
    whyChooseVi:
      "Tuân thủ pháp lý doanh nghiệp ảnh hưởng trực tiếp đến tính liên tục kinh doanh, niềm tin của nhà đầu tư và tính hợp pháp của hoạt động. Thiếu giấy phép, hồ sơ lỗi thời hoặc tài liệu yếu có thể tạo ra rủi ro pháp lý và quản trị không cần thiết.",
    facsValue:
      "FACS assists enterprises in managing corporate records, licensing procedures and legal documentation with a structured and business-friendly approach. We help align legal formalities with real operating needs.",
    facsValueVi:
      "FACS hỗ trợ doanh nghiệp quản lý hồ sơ doanh nghiệp, thủ tục giấy phép và tài liệu pháp lý bằng cách tiếp cận có cấu trúc và thân thiện với hoạt động kinh doanh. Chúng tôi giúp gắn kết thủ tục pháp lý với nhu cầu vận hành thực tế.",
    whyFacs:
      "We understand that legal advisory must be both accurate and practical. Our work is designed to help clients move forward confidently, not slow them down with unnecessary complexity.",
    whyFacsVi:
      "Chúng tôi hiểu rằng tư vấn pháp lý phải vừa chính xác vừa thực tế. Công việc của chúng tôi được thiết kế để giúp khách hàng tiến lên một cách tự tin, không bị chậm lại bởi sự phức tạp không cần thiết.",
  },
  {
    slug: "payroll-insurance",
    icon: Briefcase,
    title: "Payroll & HR Compliance",
    titleVi: "Dịch vụ tiền lương, bảo hiểm và tuân thủ lao động",
    desc: "Salary management, labor contracts and workforce compliance systems.",
    descVi: "Quản lý tiền lương, hợp đồng lao động, bảo hiểm và hệ thống tuân thủ nhân sự.",
    details: [
      "Payroll calculation and salary operation support.",
      "Labor contract and workforce compliance review.",
      "Social insurance, health insurance and related labor compliance support.",
    ],
    detailsVi: [
      "Hỗ trợ tính lương và vận hành quy trình tiền lương.",
      "Rà soát hợp đồng lao động và tuân thủ nhân sự.",
      "Hỗ trợ bảo hiểm xã hội, bảo hiểm y tế và các nghĩa vụ liên quan đến lao động.",
    ],
    overview:
      "This service helps companies operate payroll, labor documentation and compulsory insurance compliance with accuracy and confidentiality.",
    overviewVi:
      "Dịch vụ này giúp doanh nghiệp vận hành tiền lương, hồ sơ lao động và tuân thủ bảo hiểm bắt buộc một cách chính xác và bảo mật.",
    typicalClients: [
      "Companies with monthly payroll operations",
      "FDI enterprises with local and foreign employees",
      "Businesses scaling headcount",
      "Companies needing labor compliance review",
    ],
    typicalClientsVi: [
      "Doanh nghiệp có hoạt động tính lương hằng tháng",
      "Doanh nghiệp FDI có lao động Việt Nam và lao động nước ngoài",
      "Doanh nghiệp đang mở rộng nhân sự",
      "Doanh nghiệp cần rà soát tuân thủ lao động",
    ],
    challenges: [
      "Payroll errors affecting employee trust",
      "Unclear PIT, insurance and labor contract treatment",
      "Inconsistent HR records and approval workflow",
      "Risk exposure from labor and insurance compliance gaps",
    ],
    challengesVi: [
      "Sai sót tiền lương ảnh hưởng đến niềm tin của nhân viên",
      "Chưa rõ cách xử lý PIT, bảo hiểm và hợp đồng lao động",
      "Hồ sơ nhân sự và quy trình phê duyệt chưa nhất quán",
      "Rủi ro từ khoảng trống tuân thủ lao động và bảo hiểm",
    ],
    approach: [
      "Review payroll inputs, employment records and insurance status",
      "Set up payroll calculation and approval workflow",
      "Support periodic payroll, PIT and insurance processes",
      "Advise on documentation and compliance improvement",
    ],
    approachVi: [
      "Rà soát dữ liệu lương, hồ sơ lao động và tình trạng bảo hiểm",
      "Thiết lập quy trình tính lương và phê duyệt",
      "Hỗ trợ quy trình lương, PIT và bảo hiểm định kỳ",
      "Tư vấn hoàn thiện hồ sơ và cải thiện tuân thủ",
    ],
    deliverables: [
      "Payroll calculation files",
      "Payroll and insurance compliance checklist",
      "Labor documentation review notes",
      "Monthly payroll support package",
    ],
    deliverablesVi: [
      "File tính lương",
      "Checklist tuân thủ lương và bảo hiểm",
      "Ghi chú rà soát hồ sơ lao động",
      "Bộ hỗ trợ tiền lương hằng tháng",
    ],
    whyChoose:
      "Payroll and workforce compliance require accuracy, confidentiality and consistency. Errors in salary, contracts or compulsory insurance can affect employee trust and create regulatory exposure.",
    whyChooseVi:
      "Tiền lương và tuân thủ nhân sự đòi hỏi sự chính xác, bảo mật và nhất quán. Sai sót trong lương, hợp đồng hoặc bảo hiểm bắt buộc có thể ảnh hưởng đến niềm tin của nhân viên và tạo ra rủi ro pháp lý.",
    facsValue:
      "FACS helps businesses establish payroll routines, review labor documentation and maintain insurance-related compliance. Our support reduces administrative pressure while improving transparency for both management and employees.",
    facsValueVi:
      "FACS giúp doanh nghiệp thiết lập quy trình tiền lương, rà soát hồ sơ lao động và duy trì tuân thủ liên quan đến bảo hiểm. Hỗ trợ của chúng tôi giảm áp lực hành chính và tăng tính minh bạch cho cả ban lãnh đạo và người lao động.",
    whyFacs:
      "We approach payroll as part of a broader people-risk and compliance system, ensuring that workforce administration is clear, controlled and professionally maintained.",
    whyFacsVi:
      "Chúng tôi tiếp cận tiền lương như một phần của hệ thống quản trị rủi ro nhân sự và tuân thủ, bảo đảm hoạt động quản lý nhân sự rõ ràng, có kiểm soát và được duy trì chuyên nghiệp.",
  },
  {
    slug: "enterprise-governance",
    icon: Building2,
    title: "Enterprise Governance",
    titleVi: "Dịch vụ quản trị doanh nghiệp",
    desc: "Strategic governance structures and operational system consulting.",
    descVi: "Tư vấn cấu trúc quản trị, kiểm soát nội bộ và hệ thống vận hành doanh nghiệp.",
    details: [
      "Internal control framework and governance process advisory.",
      "Operational structure review for growing enterprises.",
      "Business process documentation and compliance infrastructure.",
    ],
    detailsVi: [
      "Tư vấn khung kiểm soát nội bộ và quy trình quản trị.",
      "Rà soát cấu trúc vận hành cho doanh nghiệp đang tăng trưởng.",
      "Tài liệu hóa quy trình kinh doanh và hạ tầng tuân thủ.",
    ],
    overview:
      "This service helps enterprises move from informal operating habits to documented governance, internal controls and scalable management routines.",
    overviewVi:
      "Dịch vụ này giúp doanh nghiệp chuyển từ cách vận hành phi chính thức sang hệ thống quản trị, kiểm soát nội bộ và quy trình quản lý có thể mở rộng.",
    typicalClients: [
      "Growing owner-managed businesses",
      "Companies preparing for investment or expansion",
      "FDI enterprises needing governance documentation",
      "Management teams seeking stronger internal controls",
    ],
    typicalClientsVi: [
      "Doanh nghiệp do chủ sở hữu điều hành đang tăng trưởng",
      "Doanh nghiệp chuẩn bị gọi vốn hoặc mở rộng",
      "Doanh nghiệp FDI cần tài liệu quản trị",
      "Ban lãnh đạo muốn tăng cường kiểm soát nội bộ",
    ],
    challenges: [
      "Informal approvals and unclear accountability",
      "Process dependency on individuals",
      "Weak internal control documentation",
      "Limited monitoring of operational and compliance risks",
    ],
    challengesVi: [
      "Phê duyệt phi chính thức và trách nhiệm chưa rõ ràng",
      "Quy trình phụ thuộc vào cá nhân",
      "Tài liệu kiểm soát nội bộ còn yếu",
      "Khả năng theo dõi rủi ro vận hành và tuân thủ còn hạn chế",
    ],
    approach: [
      "Map governance structure and key operating workflows",
      "Identify control gaps and accountability issues",
      "Design practical processes, checklists and reporting routines",
      "Support implementation and management monitoring",
    ],
    approachVi: [
      "Sơ đồ hóa cấu trúc quản trị và quy trình vận hành trọng yếu",
      "Nhận diện khoảng trống kiểm soát và vấn đề trách nhiệm",
      "Thiết kế quy trình, checklist và cơ chế báo cáo thực tế",
      "Hỗ trợ triển khai và theo dõi quản trị",
    ],
    deliverables: [
      "Governance and process review report",
      "Internal control matrix",
      "Process documentation package",
      "Management monitoring checklist",
    ],
    deliverablesVi: [
      "Báo cáo rà soát quản trị và quy trình",
      "Ma trận kiểm soát nội bộ",
      "Bộ tài liệu quy trình",
      "Checklist theo dõi quản trị",
    ],
    whyChoose:
      "As enterprises grow, informal processes often become a constraint. Clear governance, internal controls and documented workflows help management scale with confidence and reduce dependency on individuals.",
    whyChooseVi:
      "Khi doanh nghiệp tăng trưởng, quy trình phi chính thức thường trở thành điểm nghẽn. Quản trị rõ ràng, kiểm soát nội bộ và quy trình được tài liệu hóa giúp ban lãnh đạo mở rộng tự tin hơn và giảm phụ thuộc vào cá nhân.",
    facsValue:
      "FACS reviews operating structures, identifies control gaps and designs practical governance processes. We help businesses improve accountability, consistency and management visibility across functions.",
    facsValueVi:
      "FACS rà soát cấu trúc vận hành, nhận diện khoảng trống kiểm soát và thiết kế quy trình quản trị thực tế. Chúng tôi giúp doanh nghiệp cải thiện trách nhiệm giải trình, tính nhất quán và khả năng nhìn thấy hoạt động giữa các phòng ban.",
    whyFacs:
      "Our governance advisory balances professional standards with real-world implementation, creating systems that people can actually use and management can actually monitor.",
    whyFacsVi:
      "Tư vấn quản trị của chúng tôi cân bằng giữa chuẩn mực chuyên nghiệp và khả năng triển khai thực tế, tạo ra hệ thống mà nhân sự có thể sử dụng và ban lãnh đạo có thể theo dõi.",
  },
  {
    slug: "internal-training",
    icon: GraduationCap,
    title: "Corporate Training",
    titleVi: "Dịch vụ đào tạo nội bộ doanh nghiệp",
    desc: "Professional accounting, finance and compliance training programs.",
    descVi: "Chương trình đào tạo kế toán, tài chính, thuế và tuân thủ dành cho đội ngũ nội bộ.",
    details: [
      "Accounting, taxation and compliance training for internal teams.",
      "Customized workshops based on enterprise operating models.",
      "Practical training materials for finance and administrative personnel.",
    ],
    detailsVi: [
      "Đào tạo kế toán, thuế và tuân thủ cho đội ngũ nội bộ.",
      "Workshop tùy chỉnh theo mô hình vận hành của doanh nghiệp.",
      "Tài liệu đào tạo thực tế cho nhân sự tài chính và hành chính.",
    ],
    overview:
      "This service strengthens internal capability by translating technical finance, tax and compliance matters into practical training for daily operations.",
    overviewVi:
      "Dịch vụ này tăng cường năng lực nội bộ bằng cách chuyển hóa các vấn đề kỹ thuật về tài chính, thuế và tuân thủ thành nội dung đào tạo thực tế cho công việc hằng ngày.",
    typicalClients: [
      "Finance and accounting teams",
      "Administrative and HR teams handling compliance tasks",
      "Newly established companies building internal capability",
      "Management teams requiring tailored workshops",
    ],
    typicalClientsVi: [
      "Đội ngũ tài chính và kế toán",
      "Bộ phận hành chính và nhân sự phụ trách tuân thủ",
      "Doanh nghiệp mới thành lập cần xây dựng năng lực nội bộ",
      "Ban lãnh đạo cần workshop theo yêu cầu",
    ],
    challenges: [
      "Repeated errors due to unclear technical understanding",
      "Limited coordination between finance, HR and operations",
      "Training materials not linked to real transactions",
      "Difficulty translating regulations into daily procedures",
    ],
    challengesVi: [
      "Lỗi lặp lại do chưa hiểu rõ kỹ thuật",
      "Phối hợp hạn chế giữa tài chính, nhân sự và vận hành",
      "Tài liệu đào tạo chưa gắn với giao dịch thực tế",
      "Khó chuyển hóa quy định thành quy trình hằng ngày",
    ],
    approach: [
      "Identify training needs and target audience",
      "Customize content based on actual transactions and workflows",
      "Deliver practical sessions with examples and templates",
      "Provide follow-up materials for daily reference",
    ],
    approachVi: [
      "Xác định nhu cầu đào tạo và đối tượng tham gia",
      "Tùy chỉnh nội dung theo giao dịch và quy trình thực tế",
      "Triển khai buổi đào tạo với ví dụ và biểu mẫu thực hành",
      "Cung cấp tài liệu theo dõi để sử dụng hằng ngày",
    ],
    deliverables: [
      "Training agenda and materials",
      "Practical templates and examples",
      "Workshop delivery",
      "Post-training reference notes",
    ],
    deliverablesVi: [
      "Chương trình và tài liệu đào tạo",
      "Biểu mẫu và ví dụ thực hành",
      "Buổi đào tạo hoặc workshop",
      "Ghi chú tham khảo sau đào tạo",
    ],
    whyChoose:
      "A capable internal team is essential for sustainable compliance and operational efficiency. Training helps reduce repeated errors, improve coordination and strengthen internal understanding of finance and compliance obligations.",
    whyChooseVi:
      "Một đội ngũ nội bộ có năng lực là yếu tố thiết yếu cho tuân thủ bền vững và hiệu quả vận hành. Đào tạo giúp giảm lỗi lặp lại, cải thiện phối hợp và tăng hiểu biết nội bộ về tài chính, thuế và tuân thủ.",
    facsValue:
      "FACS develops practical training sessions tailored to the enterprise’s actual transactions, workflows and internal roles. Our programs are designed to be clear, applicable and immediately useful for daily operations.",
    facsValueVi:
      "FACS xây dựng chương trình đào tạo thực tế dựa trên giao dịch, quy trình và vai trò nội bộ của doanh nghiệp. Chương trình được thiết kế rõ ràng, có khả năng áp dụng và hữu ích ngay trong vận hành hằng ngày.",
    whyFacs:
      "We translate technical accounting, tax and compliance matters into business language, helping teams understand not only what to do, but why it matters.",
    whyFacsVi:
      "Chúng tôi chuyển hóa các vấn đề kỹ thuật về kế toán, thuế và tuân thủ thành ngôn ngữ kinh doanh, giúp đội ngũ hiểu không chỉ cần làm gì mà còn vì sao việc đó quan trọng.",
  },
  {
    slug: "audit-assurance-support",
    icon: FileCheck2,
    title: "Independent Audit & Audit Support",
    titleVi: "Dịch vụ kiểm toán độc lập và hỗ trợ kiểm toán",
    desc: "Independent audit coordination, audit-readiness review and practical support for financial statement audit processes.",
    descVi: "Hỗ trợ kiểm toán độc lập, rà soát mức độ sẵn sàng kiểm toán và đồng hành trong quá trình kiểm toán báo cáo tài chính.",
    details: [
      "Audit-readiness review of accounting records, supporting documents and financial statement schedules.",
      "Coordination support during independent audit fieldwork, information requests and management explanations.",
      "Post-audit follow-up support for adjustment tracking, documentation improvement and closing-file discipline.",
    ],
    detailsVi: [
      "Rà soát mức độ sẵn sàng kiểm toán của sổ sách, chứng từ và bảng biểu phục vụ báo cáo tài chính.",
      "Hỗ trợ phối hợp trong quá trình kiểm toán, cung cấp thông tin và giải trình với kiểm toán viên.",
      "Theo dõi điều chỉnh sau kiểm toán, hoàn thiện hồ sơ và tăng cường kỷ luật khóa sổ.",
    ],
    overview:
      "This service helps enterprises prepare for independent audit, manage audit requests and strengthen financial reporting documentation before, during and after the audit process.",
    overviewVi:
      "Dịch vụ này giúp doanh nghiệp chuẩn bị cho kiểm toán độc lập, quản lý yêu cầu kiểm toán và củng cố hồ sơ báo cáo tài chính trước, trong và sau quá trình kiểm toán.",
    typicalClients: [
      "Companies subject to annual statutory audit",
      "FDI enterprises preparing audited financial statements",
      "Businesses with limited internal audit coordination capacity",
      "Companies needing support to improve audit documentation quality",
    ],
    typicalClientsVi: [
      "Doanh nghiệp thuộc diện kiểm toán báo cáo tài chính hằng năm",
      "Doanh nghiệp FDI chuẩn bị báo cáo tài chính đã kiểm toán",
      "Doanh nghiệp chưa có đủ năng lực nội bộ để điều phối kiểm toán",
      "Doanh nghiệp cần nâng cao chất lượng hồ sơ phục vụ kiểm toán",
    ],
    challenges: [
      "Audit schedules are not prepared or not reconciled",
      "Supporting documents are incomplete or difficult to trace",
      "Management responses to audit queries are delayed",
      "Post-audit adjustments are not tracked systematically",
    ],
    challengesVi: [
      "Bảng biểu phục vụ kiểm toán chưa được chuẩn bị hoặc chưa đối chiếu",
      "Chứng từ hỗ trợ chưa đầy đủ hoặc khó truy xuất",
      "Phản hồi yêu cầu kiểm toán bị chậm",
      "Điều chỉnh sau kiểm toán chưa được theo dõi có hệ thống",
    ],
    approach: [
      "Review audit readiness and identify documentation gaps",
      "Prepare audit schedules and support reconciliation",
      "Coordinate information flow and audit query responses",
      "Track proposed adjustments and post-audit improvement points",
    ],
    approachVi: [
      "Rà soát mức độ sẵn sàng kiểm toán và xác định khoảng trống hồ sơ",
      "Chuẩn bị bảng biểu kiểm toán và hỗ trợ đối chiếu",
      "Điều phối luồng thông tin và phản hồi yêu cầu kiểm toán",
      "Theo dõi điều chỉnh đề xuất và điểm cải thiện sau kiểm toán",
    ],
    deliverables: [
      "Audit-readiness checklist",
      "Audit schedules and supporting files",
      "Audit query tracker",
      "Post-audit adjustment and improvement summary",
    ],
    deliverablesVi: [
      "Checklist sẵn sàng kiểm toán",
      "Bảng biểu và hồ sơ hỗ trợ kiểm toán",
      "Bảng theo dõi yêu cầu kiểm toán",
      "Tổng hợp điều chỉnh và điểm cải thiện sau kiểm toán",
    ],
    whyChoose:
      "An audit process can become time-consuming and disruptive when accounting records, schedules and supporting documents are not prepared in a clear and consistent manner. Proper audit support helps management reduce delays, improve audit response quality and strengthen financial reporting discipline.",
    whyChooseVi:
      "Quá trình kiểm toán có thể mất nhiều thời gian và gây gián đoạn nếu sổ sách, bảng biểu và chứng từ chưa được chuẩn bị rõ ràng, nhất quán. Hỗ trợ kiểm toán phù hợp giúp ban lãnh đạo giảm chậm trễ, cải thiện chất lượng phản hồi và tăng cường kỷ luật báo cáo tài chính.",
    facsValue:
      "FACS supports enterprises before, during and after the audit process by reviewing audit readiness, preparing schedules, coordinating information flow and helping management address audit queries in a structured manner.",
    facsValueVi:
      "FACS hỗ trợ doanh nghiệp trước, trong và sau kiểm toán bằng việc rà soát mức độ sẵn sàng, chuẩn bị bảng biểu, điều phối thông tin và hỗ trợ ban lãnh đạo xử lý yêu cầu kiểm toán một cách có cấu trúc.",
    whyFacs:
      "We understand both accounting operations and audit expectations. Our role is to help clients communicate financial information clearly, reduce avoidable audit friction and build a stronger reporting foundation for future periods.",
    whyFacsVi:
      "Chúng tôi hiểu cả vận hành kế toán và kỳ vọng của kiểm toán. Vai trò của FACS là giúp khách hàng trình bày thông tin tài chính rõ ràng, giảm vướng mắc không cần thiết trong kiểm toán và xây dựng nền tảng báo cáo tốt hơn cho các kỳ sau.",
  },
  {
    slug: "erp-consulting-implementation",
    icon: Cog,
    title: "ERP Consulting & Implementation",
    titleVi: "Dịch vụ tư vấn và triển khai hệ thống ERP",
    desc: "ERP selection, process design, customization and implementation support for scalable business operations.",
    descVi: "Tư vấn lựa chọn, thiết kế quy trình, tùy chỉnh và triển khai ERP cho doanh nghiệp cần hệ thống vận hành có khả năng mở rộng.",
    details: [
      "ERP needs assessment, process mapping and system selection support for newly established or growing businesses.",
      "ERP customization and implementation coordination across accounting, inventory, purchasing, sales and reporting workflows.",
      "Data migration, user acceptance testing, go-live support and preparation of ad-hoc management reports.",
    ],
    detailsVi: [
      "Đánh giá nhu cầu ERP, sơ đồ hóa quy trình và hỗ trợ lựa chọn hệ thống cho doanh nghiệp mới hoặc đang tăng trưởng.",
      "Hỗ trợ tùy chỉnh và triển khai ERP cho kế toán, tồn kho, mua hàng, bán hàng và báo cáo.",
      "Hỗ trợ chuyển đổi dữ liệu, kiểm thử người dùng, go-live và lập báo cáo quản trị theo yêu cầu.",
    ],
    overview:
      "This service supports businesses in selecting and implementing ERP systems that are aligned with their accounting, inventory, reporting and operational control requirements.",
    overviewVi:
      "Dịch vụ này hỗ trợ doanh nghiệp lựa chọn và triển khai hệ thống ERP phù hợp với yêu cầu kế toán, hàng tồn kho, báo cáo và kiểm soát vận hành.",
    typicalClients: [
      "Newly established companies without an existing system",
      "Manufacturing, trading and distribution businesses",
      "Companies moving from Excel to ERP",
      "Management teams needing integrated operational reports",
    ],
    typicalClientsVi: [
      "Doanh nghiệp mới thành lập chưa có hệ thống",
      "Doanh nghiệp sản xuất, thương mại và phân phối",
      "Doanh nghiệp chuyển từ Excel sang ERP",
      "Ban lãnh đạo cần báo cáo vận hành tích hợp",
    ],
    challenges: [
      "ERP selection not aligned with real business processes",
      "Fragmented data across accounting, inventory and operations",
      "Poor implementation planning and unclear user responsibilities",
      "Reports not designed around management decision needs",
    ],
    challengesVi: [
      "Lựa chọn ERP chưa phù hợp với quy trình thực tế",
      "Dữ liệu rời rạc giữa kế toán, tồn kho và vận hành",
      "Kế hoạch triển khai yếu và trách nhiệm người dùng chưa rõ",
      "Báo cáo chưa được thiết kế theo nhu cầu ra quyết định của ban lãnh đạo",
    ],
    approach: [
      "Assess business model, transactions and reporting requirements",
      "Map target processes and define ERP selection criteria",
      "Coordinate configuration, customization and implementation tasks",
      "Support testing, migration, go-live and post-implementation reporting",
    ],
    approachVi: [
      "Đánh giá mô hình kinh doanh, giao dịch và nhu cầu báo cáo",
      "Sơ đồ hóa quy trình mục tiêu và tiêu chí lựa chọn ERP",
      "Điều phối cấu hình, tùy chỉnh và các công việc triển khai",
      "Hỗ trợ kiểm thử, chuyển đổi dữ liệu, go-live và báo cáo sau triển khai",
    ],
    deliverables: [
      "ERP needs assessment report",
      "Process mapping and gap analysis",
      "System selection and implementation roadmap",
      "Data migration and UAT support files",
      "Ad-hoc management reporting templates",
    ],
    deliverablesVi: [
      "Báo cáo đánh giá nhu cầu ERP",
      "Sơ đồ quy trình và phân tích khoảng cách",
      "Lộ trình lựa chọn và triển khai hệ thống",
      "Hồ sơ hỗ trợ chuyển đổi dữ liệu và UAT",
      "Mẫu báo cáo quản trị theo yêu cầu",
    ],
    whyChoose:
      "A poorly selected or poorly implemented ERP system can create duplicated work, unreliable reports and long-term operational inefficiency. Businesses need a practical bridge between finance, operations and system implementation.",
    whyChooseVi:
      "Một hệ thống ERP được lựa chọn hoặc triển khai chưa phù hợp có thể tạo ra công việc trùng lặp, báo cáo thiếu tin cậy và kém hiệu quả vận hành dài hạn. Doanh nghiệp cần một cầu nối thực tế giữa tài chính, vận hành và triển khai hệ thống.",
    facsValue:
      "FACS helps clients define system requirements, align ERP configuration with real business processes and support implementation in a practical, finance-driven manner. Our work focuses on usability, control and management visibility.",
    facsValueVi:
      "FACS giúp khách hàng xác định yêu cầu hệ thống, gắn cấu hình ERP với quy trình thực tế và hỗ trợ triển khai theo hướng thực tế, dựa trên tư duy tài chính. Chúng tôi tập trung vào tính sử dụng được, kiểm soát và khả năng nhìn thấy thông tin quản trị.",
    whyFacs:
      "We approach ERP not only as a software project, but as an operating model project. This allows us to connect accounting, tax, inventory, reporting and governance requirements into one coherent system design.",
    whyFacsVi:
      "Chúng tôi tiếp cận ERP không chỉ như một dự án phần mềm mà là một dự án thiết kế mô hình vận hành. Cách tiếp cận này giúp kết nối yêu cầu kế toán, thuế, tồn kho, báo cáo và quản trị vào một thiết kế hệ thống thống nhất.",
  },
  {
    slug: "tailored-business-support",
    icon: Puzzle,
    title: "Tailored Business Support",
    titleVi: "Dịch vụ hỗ trợ thiết kế riêng theo yêu cầu",
    desc: "Customized advisory and hands-on support for complex, urgent or non-standard accounting, tax, legal and reporting matters.",
    descVi: "Dịch vụ tư vấn và hỗ trợ thực hiện theo yêu cầu riêng cho các vấn đề kế toán, thuế, pháp lý, báo cáo hoặc vận hành phức tạp.",
    details: [
      "Merging two sets of books, cleaning accounting records and resolving historical bookkeeping inconsistencies.",
      "Financial statement review, tax and accounting health checks, legal document review and compliance gap assessment.",
      "Ad-hoc troubleshooting support for management reports, reconciliations, documentation gaps and operational bottlenecks.",
    ],
    detailsVi: [
      "Gộp hai hệ thống sổ sách, làm sạch dữ liệu kế toán và xử lý sai lệch lịch sử.",
      "Soát xét báo cáo tài chính, rà soát sức khỏe thuế - kế toán, rà soát pháp lý và đánh giá khoảng trống tuân thủ.",
      "Hỗ trợ gỡ rối báo cáo quản trị, đối chiếu, thiếu hụt hồ sơ và điểm nghẽn vận hành.",
    ],
    overview:
      "This service is designed for special situations that do not fit a standard service package, especially where accounting, tax, legal and operational issues overlap.",
    overviewVi:
      "Dịch vụ này được thiết kế cho các tình huống đặc thù không phù hợp với gói dịch vụ tiêu chuẩn, đặc biệt khi vấn đề kế toán, thuế, pháp lý và vận hành giao thoa với nhau.",
    typicalClients: [
      "Companies with historical accounting issues",
      "Businesses needing urgent clean-up or review support",
      "Management teams preparing for investment, audit or restructuring",
      "Enterprises facing non-standard tax, legal or reporting challenges",
    ],
    typicalClientsVi: [
      "Doanh nghiệp có tồn đọng kế toán lịch sử",
      "Doanh nghiệp cần làm sạch hoặc rà soát gấp",
      "Ban lãnh đạo chuẩn bị gọi vốn, kiểm toán hoặc tái cấu trúc",
      "Doanh nghiệp gặp vấn đề thuế, pháp lý hoặc báo cáo không theo khuôn mẫu",
    ],
    challenges: [
      "Two sets of books or inconsistent historical records",
      "Unreconciled balances and unclear supporting documents",
      "Financial statements requiring review before submission or audit",
      "Cross-functional issues without a clear owner or action plan",
    ],
    challengesVi: [
      "Tồn tại hai hệ thống sổ sách hoặc dữ liệu lịch sử thiếu nhất quán",
      "Số dư chưa đối chiếu và chứng từ hỗ trợ chưa rõ",
      "Báo cáo tài chính cần soát xét trước khi nộp hoặc kiểm toán",
      "Vấn đề liên phòng ban nhưng chưa có người phụ trách hoặc kế hoạch rõ ràng",
    ],
    approach: [
      "Clarify the problem, objective, records available and urgency",
      "Diagnose root causes across accounting, tax, legal and operations",
      "Prioritize remediation steps and define practical deliverables",
      "Execute clean-up, review, reconciliation or documentation support",
    ],
    approachVi: [
      "Làm rõ vấn đề, mục tiêu, hồ sơ hiện có và mức độ khẩn cấp",
      "Chẩn đoán nguyên nhân gốc từ góc độ kế toán, thuế, pháp lý và vận hành",
      "Ưu tiên bước xử lý và xác định đầu ra thực tế",
      "Thực hiện làm sạch, soát xét, đối chiếu hoặc hỗ trợ hồ sơ",
    ],
    deliverables: [
      "Issue diagnosis and remediation plan",
      "Accounting clean-up or reconciliation files",
      "Financial statement or legal document review notes",
      "Management-ready summary and next-step checklist",
    ],
    deliverablesVi: [
      "Báo cáo chẩn đoán vấn đề và kế hoạch xử lý",
      "File làm sạch sổ sách hoặc đối chiếu",
      "Ghi chú soát xét báo cáo tài chính hoặc hồ sơ pháp lý",
      "Tóm tắt phục vụ ban lãnh đạo và checklist bước tiếp theo",
    ],
    whyChoose:
      "Not every business issue fits neatly into a standard service package. Companies often face urgent, historical or cross-functional problems that require accounting, tax, legal and operational perspectives at the same time.",
    whyChooseVi:
      "Không phải vấn đề kinh doanh nào cũng phù hợp với một gói dịch vụ tiêu chuẩn. Doanh nghiệp thường gặp các vấn đề khẩn cấp, tồn đọng hoặc liên phòng ban đòi hỏi đồng thời góc nhìn kế toán, thuế, pháp lý và vận hành.",
    facsValue:
      "FACS designs tailored support based on the client’s actual problem, available records and desired outcome. We help clarify the issue, prioritize remediation steps and deliver practical documentation, review or implementation support.",
    facsValueVi:
      "FACS thiết kế hỗ trợ riêng dựa trên vấn đề thực tế, hồ sơ hiện có và kết quả mong muốn của khách hàng. Chúng tôi giúp làm rõ vấn đề, ưu tiên bước xử lý và cung cấp hỗ trợ thực tế về hồ sơ, soát xét hoặc triển khai.",
    whyFacs:
      "Our multidisciplinary advisory model allows us to handle non-standard assignments with structure and professional judgment, helping clients move from confusion to a clear and manageable action plan.",
    whyFacsVi:
      "Mô hình tư vấn đa chuyên môn cho phép chúng tôi xử lý các công việc không theo khuôn mẫu bằng cấu trúc và xét đoán chuyên nghiệp, giúp khách hàng chuyển từ tình trạng rối sang một kế hoạch hành động rõ ràng và có thể quản lý.",
  },
];

export function getServiceContent(service, isVi = false) {
  if (!service) return null;

  return {
    ...service,
    title: isVi && service.titleVi ? service.titleVi : service.title,
    desc: isVi && service.descVi ? service.descVi : service.desc,
    details: isVi && service.detailsVi ? service.detailsVi : service.details,
    whyChoose: isVi && service.whyChooseVi ? service.whyChooseVi : service.whyChoose,
    facsValue: isVi && service.facsValueVi ? service.facsValueVi : service.facsValue,
    whyFacs: isVi && service.whyFacsVi ? service.whyFacsVi : service.whyFacs,
    overview: isVi && service.overviewVi ? service.overviewVi : service.overview,
    typicalClients: isVi && service.typicalClientsVi ? service.typicalClientsVi : service.typicalClients,
    challenges: isVi && service.challengesVi ? service.challengesVi : service.challenges,
    approach: isVi && service.approachVi ? service.approachVi : service.approach,
    deliverables: isVi && service.deliverablesVi ? service.deliverablesVi : service.deliverables,
  };
}
`;

const serviceDetailPage = String.raw`import { Link, Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Layers3,
  Route,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import { useLanguage } from "../components/LanguageContext";
import { getServiceContent, services } from "../data/services";

const sectionCardClass =
  "group rounded-[32px] border border-white/10 bg-white/[0.045] p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.055] hover:shadow-[0_24px_80px_rgba(8,145,178,0.12)]";

function BulletList({ items }) {
  return (
    <div className="mt-6 space-y-4">
      {items.map((item) => (
        <div key={item} className="flex gap-4 rounded-3xl border border-white/10 bg-[#111827]/80 p-5 transition-all duration-300 hover:translate-x-1 hover:border-cyan-400/25 hover:bg-white/[0.05]">
          <CheckCircle2 className="mt-1 shrink-0 text-cyan-400" size={22} />
          <div className="leading-relaxed text-slate-300">{item}</div>
        </div>
      ))}
    </div>
  );
}

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const { language } = useLanguage();
  const isVi = language === "vi";

  const rawService = services.find((item) => item.slug === slug);
  const service = getServiceContent(rawService, isVi);

  if (!service) return <Navigate to="/services" replace />;

  const Icon = service.icon;

  const labels = {
    back: isVi ? "Quay lại Dịch vụ" : "Back to Services",
    serviceDetail: isVi ? "Chi tiết dịch vụ" : "Service Detail",
    overview: isVi ? "Tổng quan" : "Overview",
    scope: isVi ? "Phạm vi dịch vụ" : "Scope of Services",
    typicalClients: isVi ? "Khách hàng phù hợp" : "Typical Clients",
    challenges: isVi ? "Thách thức thường gặp" : "Business Challenges",
    approach: isVi ? "Cách FACS tiếp cận" : "Our Approach",
    deliverables: isVi ? "Đầu ra bàn giao" : "Deliverables",
    whyFacs: isVi ? "Vì sao chọn FACS" : "Why FACS",
    strategicPerspective: isVi ? "Góc nhìn chiến lược" : "Strategic Perspective",
    whyMatters: isVi ? "Vì sao dịch vụ này quan trọng" : "Why This Service Matters",
    whatDelivers: isVi ? "FACS mang lại gì" : "What FACS Delivers",
    tailoredSolution: isVi ? "Cần một giải pháp thiết kế riêng?" : "Need A Tailored Solution?",
    discuss: isVi ? "Trao đổi dịch vụ này với FACS" : "Discuss This Service With FACS",
    ctaText: isVi
      ? "Đồng hành cùng FACS để thiết kế một mô hình vận hành thực tế, tuân thủ và phù hợp với doanh nghiệp của bạn."
      : "Partner with FACS to design a practical and compliant operating model for your enterprise.",
    schedule: isVi ? "Đặt lịch tư vấn" : "Schedule Consultation",
  };

  const detailSections = [
    {
      icon: Target,
      title: labels.overview,
      body: service.overview,
      variant: "paragraph",
    },
    {
      icon: Layers3,
      title: labels.scope,
      items: service.details,
      variant: "list",
    },
    {
      icon: UsersRound,
      title: labels.typicalClients,
      items: service.typicalClients,
      variant: "list",
    },
    {
      icon: AlertTriangle,
      title: labels.challenges,
      items: service.challenges,
      variant: "list",
    },
    {
      icon: Route,
      title: labels.approach,
      items: service.approach,
      variant: "list",
    },
    {
      icon: ClipboardCheck,
      title: labels.deliverables,
      items: service.deliverables,
      variant: "list",
    },
  ];

  const strategicCards = [
    { icon: Target, title: labels.whyMatters, body: service.whyChoose },
    { icon: Layers3, title: labels.whatDelivers, body: service.facsValue },
    { icon: Sparkles, title: labels.whyFacs, body: service.whyFacs },
  ];

  return (
    <PageTransition>
      <Navbar />
      <main className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white">
        <section className="relative overflow-hidden border-b border-cyan-200/15 py-28">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5" />
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-200/45 to-transparent" />
          <div className="absolute right-0 top-0 h-[520px] w-[520px] rounded-full bg-cyan-500/12 blur-[120px]" />

          <div className="container relative z-10 mx-auto px-6 lg:px-12">
            <Link to="/services" className="inline-flex items-center gap-2 text-slate-400 transition-all hover:text-cyan-300">
              <ArrowLeft size={18} /> {labels.back}
            </Link>

            <div className="mt-12 grid items-center gap-16 lg:grid-cols-2">
              <motion.div initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400" /> {labels.serviceDetail}
                </div>

                <h1 className="mt-8 text-5xl font-bold leading-[1.05] tracking-[-3px] lg:text-7xl">{service.title}</h1>
                <p className="mt-10 text-xl leading-relaxed text-slate-400">{service.desc}</p>
              </motion.div>

              <motion.div whileHover={{ y: -10, scale: 1.01 }} transition={{ duration: 0.35 }} className="rounded-[40px] border border-white/10 bg-white/[0.045] p-10 backdrop-blur-xl hover:border-cyan-300/25 hover:shadow-[0_30px_90px_rgba(8,145,178,0.13)]">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-500/10 shadow-[0_0_40px_rgba(34,211,238,0.14)]">
                  <Icon size={40} className="text-cyan-400" />
                </div>

                <div className="mt-10">
                  <div className="text-cyan-300 text-base font-bold tracking-[0.03em]">{labels.scope}</div>
                  <BulletList items={service.details} />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="border-b border-cyan-200/15 py-28">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl">
              <div className="mb-5 font-medium text-cyan-400">{labels.strategicPerspective}</div>
              <h2 className="text-4xl font-bold leading-tight tracking-[-2px] lg:text-6xl">
                {labels.whyMatters}
              </h2>
              <p className="mt-8 text-lg leading-relaxed text-slate-300">{service.whyChoose}</p>
            </div>

            <div className="mt-16 grid gap-8 lg:grid-cols-3">
              {strategicCards.map((item) => {
                const CardIcon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    whileHover={{ y: -10, scale: 1.01 }}
                    transition={{ duration: 0.3 }}
                    className={sectionCardClass}
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 transition-all duration-500 group-hover:scale-110 group-hover:bg-cyan-500/15">
                      <CardIcon size={30} className="text-cyan-400" />
                    </div>
                    <h3 className="mt-8 text-2xl font-semibold leading-snug">{item.title}</h3>
                    <p className="mt-5 leading-relaxed text-slate-400">{item.body}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-cyan-200/15 py-28">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl">
              <div className="mb-5 font-medium text-cyan-400">{isVi ? "Cấu trúc dịch vụ" : "Service Structure"}</div>
              <h2 className="text-4xl font-bold leading-tight tracking-[-2px] lg:text-6xl">
                {isVi ? "Từ vấn đề thực tế đến đầu ra có thể sử dụng" : "From Business Need To Practical Deliverables"}
              </h2>
            </div>

            <div className="mt-16 grid gap-8 lg:grid-cols-2">
              {detailSections.map((item) => {
                const CardIcon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    whileHover={{ y: -8, scale: 1.005 }}
                    transition={{ duration: 0.3 }}
                    className={sectionCardClass}
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 transition-all duration-500 group-hover:scale-110 group-hover:bg-cyan-500/15">
                      <CardIcon size={30} className="text-cyan-400" />
                    </div>
                    <h3 className="mt-8 text-2xl font-semibold leading-snug">{item.title}</h3>
                    {item.variant === "paragraph" ? (
                      <p className="mt-5 text-lg leading-relaxed text-slate-400">{item.body}</p>
                    ) : (
                      <ul className="mt-6 space-y-4">
                        {item.items.map((point) => (
                          <li key={point} className="flex gap-3 text-slate-400">
                            <CheckCircle2 className="mt-1 shrink-0 text-cyan-400" size={18} />
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-28">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="rounded-[48px] border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-12 backdrop-blur-xl transition-all duration-500 hover:border-cyan-400/20 lg:p-20">
              <div className="max-w-3xl">
                <div className="mb-5 font-medium text-cyan-400">{labels.tailoredSolution}</div>
                <h2 className="text-4xl font-bold leading-tight lg:text-6xl">{labels.discuss}</h2>
                <p className="mt-8 text-lg leading-relaxed text-slate-300">{labels.ctaText}</p>
                <Link to="/contact" className="mt-10 inline-flex rounded-2xl bg-cyan-500 px-8 py-4 font-semibold text-[#06111f] transition-all duration-300 hover:-translate-y-1 hover:bg-cyan-400 hover:shadow-[0_18px_42px_rgba(6,182,212,0.26)]">
                  {labels.schedule}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </PageTransition>
  );
}
`;

write("src/data/services.js", servicesJs);
write("src/pages/ServiceDetailPage.jsx", serviceDetailPage);

const patchText = (relativePath, patches) => {
  let content = read(relativePath);
  for (const [from, to] of patches) {
    if (!content.includes(from)) {
      console.warn(`Skipped replacement in ${relativePath}: pattern not found.`);
      continue;
    }
    content = content.replace(from, to);
  }
  write(relativePath, content);
};

patchText("src/components/Navbar.jsx", [
  [
    'import { services } from "../data/services";',
    'import { getServiceContent, services } from "../data/services";'
  ],
  [
    '{isVi ? "6 nhóm dịch vụ" : "6 Service Pillars"}',
    '{isVi ? "9 nhóm dịch vụ" : "9 Service Pillars"}'
  ],
  [
    'title: service.title,\n                        desc: service.desc,',
    'title: getServiceContent(service, isVi).title,\n                        desc: getServiceContent(service, isVi).desc,'
  ],
]);

patchText("src/pages/HomePage.jsx", [
  [
    'import { services } from "../data/services";',
    'import { getServiceContent, services } from "../data/services";'
  ],
  [
    'const Icon = service.icon;\n                return (',
    'const Icon = service.icon;\n                const serviceContent = getServiceContent(service, isVi);\n                return ('
  ],
  [
    '{service.title}',
    '{serviceContent.title}'
  ],
  [
    '{service.desc}',
    '{serviceContent.desc}'
  ],
]);

patchText("src/pages/ServicesPage.jsx", [
  [
    'import { services } from "../data/services";',
    'import { getServiceContent, services } from "../data/services";\nimport { useLanguage } from "../components/LanguageContext";'
  ],
  [
    'export default function ServicesPage() {\n  const location = useLocation();',
    'export default function ServicesPage() {\n  const location = useLocation();\n  const { language } = useLanguage();\n  const isVi = language === "vi";'
  ],
  [
    'const Icon = service.icon;\n\n                return (',
    'const Icon = service.icon;\n                const serviceContent = getServiceContent(service, isVi);\n\n                return ('
  ],
  [
    '{service.title}',
    '{serviceContent.title}'
  ],
  [
    '{service.desc}',
    '{serviceContent.desc}'
  ],
  [
    '<AnimatedCounter value="6"',
    '<AnimatedCounter value="9"'
  ],
  [
    '{isVi ? "6 nhóm dịch vụ" : "6 Service Pillars"}',
    '{isVi ? "9 nhóm dịch vụ" : "9 Service Pillars"}'
  ],
]);

console.log("\nFACS v20.3 service detail + bilingual patch applied.");
console.log("Next: npm run lint && npm run build && git add . && git commit -m \"Complete bilingual service detail expansion\" && git push");
