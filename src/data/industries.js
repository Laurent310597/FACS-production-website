import {
  Factory,
  Laptop,
  ShoppingCart,
  Construction,
  Utensils,
  Building2,
  HeartPulse,
  Globe,
} from "lucide-react";

export const industries = [
  {
    slug: "manufacturing",
    icon: Factory,
    title: "Manufacturing",
    titleVi: "Sản xuất",
    desc: "Financial systems and compliance infrastructure for industrial operations and manufacturing enterprises.",
    descVi: "Hệ thống tài chính và nền tảng tuân thủ cho hoạt động công nghiệp và doanh nghiệp sản xuất.",
    market: "Vietnam remains a strategic manufacturing base for regional supply chains, supported by export-oriented production, foreign investment and increasing demand for operational transparency. Manufacturing businesses must manage cost structures, inventory, production capacity and supplier relationships with greater discipline as competition and compliance requirements increase.",
    marketVi: "Việt Nam tiếp tục là trung tâm sản xuất chiến lược trong chuỗi cung ứng khu vực, được hỗ trợ bởi hoạt động sản xuất định hướng xuất khẩu, dòng vốn đầu tư nước ngoài và nhu cầu ngày càng cao về tính minh bạch trong vận hành. Doanh nghiệp sản xuất cần quản trị tốt hơn cơ cấu chi phí, hàng tồn kho, năng lực sản xuất và quan hệ với nhà cung cấp trong bối cảnh cạnh tranh và yêu cầu tuân thủ ngày càng gia tăng.",
    challenges: [
      "Complex cost allocation across materials, labor, overheads and work-in-progress.",
      "VAT, customs, contractor tax and transfer pricing exposure in cross-border supply chains.",
      "Inventory control, production variance, internal controls and documentation gaps."
    ],
    challengesVi: [
      "Phân bổ chi phí phức tạp giữa nguyên vật liệu, nhân công, chi phí sản xuất chung và sản phẩm dở dang.",
      "Rủi ro về VAT, hải quan, thuế nhà thầu và giao dịch liên kết trong chuỗi cung ứng xuyên biên giới.",
      "Kiểm soát hàng tồn kho, chênh lệch sản xuất, kiểm soát nội bộ và thiếu hụt hồ sơ chứng từ."
    ],
    value: "FACS supports manufacturers in building reliable accounting systems, optimizing tax positions within compliant boundaries and improving operational visibility for management decision-making.",
    valueVi: "FACS hỗ trợ doanh nghiệp sản xuất xây dựng hệ thống kế toán tin cậy, tối ưu vị thế thuế trong khuôn khổ tuân thủ và nâng cao khả năng quan sát vận hành phục vụ quyết định quản trị."
  },
  {
    slug: "technology",
    icon: Laptop,
    title: "Technology",
    titleVi: "Công nghệ",
    desc: "Scalable accounting and legal frameworks for startups and technology companies.",
    descVi: "Khung kế toán và pháp lý có khả năng mở rộng cho startup và doanh nghiệp công nghệ.",
    market: "Technology companies in Vietnam are scaling through software services, digital platforms, SaaS models and cross-border clients. Growth often happens faster than the company’s finance, tax and internal governance infrastructure, creating pressure around revenue recognition, contracts, intellectual property and investor readiness.",
    marketVi: "Doanh nghiệp công nghệ tại Việt Nam đang tăng trưởng thông qua dịch vụ phần mềm, nền tảng số, mô hình SaaS và khách hàng xuyên biên giới. Tốc độ tăng trưởng thường nhanh hơn năng lực hạ tầng tài chính, thuế và quản trị nội bộ, tạo áp lực về ghi nhận doanh thu, hợp đồng, tài sản trí tuệ và mức độ sẵn sàng với nhà đầu tư.",
    challenges: [
      "Revenue recognition for subscriptions, milestones, maintenance and bundled services.",
      "Cross-border withholding tax, VAT treatment and transfer pricing for related-party arrangements.",
      "Founder-led operations may lack formal policies, management reports and internal controls."
    ],
    challengesVi: [
      "Ghi nhận doanh thu đối với thuê bao, milestone, bảo trì và dịch vụ kết hợp.",
      "Thuế nhà thầu, VAT và giao dịch liên kết đối với giao dịch xuyên biên giới hoặc bên liên quan.",
      "Mô hình vận hành do founder dẫn dắt thường thiếu chính sách chính thức, báo cáo quản trị và kiểm soát nội bộ."
    ],
    value: "FACS helps technology businesses establish scalable accounting, tax and governance models that support fundraising, market expansion and sustainable compliance.",
    valueVi: "FACS giúp doanh nghiệp công nghệ thiết lập mô hình kế toán, thuế và quản trị có khả năng mở rộng, hỗ trợ gọi vốn, mở rộng thị trường và tuân thủ bền vững."
  },
  {
    slug: "e-commerce",
    icon: ShoppingCart,
    title: "E-Commerce",
    titleVi: "Thương mại điện tử",
    desc: "Modern taxation and operational consulting for digital commerce ecosystems.",
    descVi: "Tư vấn thuế và vận hành hiện đại cho hệ sinh thái thương mại số.",
    market: "Vietnam’s e-commerce market is driven by marketplaces, social commerce, online payment systems and fast-changing customer behavior. High transaction volume and multiple sales channels create significant pressure on data reconciliation, invoice compliance, revenue reporting and cash flow control.",
    marketVi: "Thị trường thương mại điện tử Việt Nam phát triển nhờ sàn thương mại điện tử, social commerce, hệ thống thanh toán trực tuyến và hành vi tiêu dùng thay đổi nhanh. Khối lượng giao dịch lớn và nhiều kênh bán hàng tạo áp lực đáng kể lên đối soát dữ liệu, hóa đơn, báo cáo doanh thu và kiểm soát dòng tiền.",
    challenges: [
      "Multi-channel revenue reconciliation between marketplaces, payment gateways and internal records.",
      "E-invoice, VAT and promotional expense documentation requirements.",
      "Returns, discounts, platform fees and logistics costs may distort margin visibility."
    ],
    challengesVi: [
      "Đối soát doanh thu đa kênh giữa sàn, cổng thanh toán và dữ liệu nội bộ.",
      "Yêu cầu về hóa đơn điện tử, VAT và hồ sơ chi phí khuyến mại.",
      "Hoàn hàng, chiết khấu, phí nền tảng và logistics có thể làm sai lệch khả năng nhìn nhận biên lợi nhuận."
    ],
    value: "FACS helps e-commerce businesses strengthen transaction controls, improve tax documentation and design reporting systems that show real profitability by channel and product group.",
    valueVi: "FACS giúp doanh nghiệp thương mại điện tử tăng cường kiểm soát giao dịch, hoàn thiện hồ sơ thuế và thiết kế hệ thống báo cáo phản ánh lợi nhuận thực theo kênh bán hàng và nhóm sản phẩm."
  },
  {
    slug: "construction-infrastructure",
    icon: Construction,
    title: "Construction & Infrastructure",
    titleVi: "Xây dựng & Hạ tầng",
    desc: "Strategic financial and compliance consulting for construction, engineering and infrastructure projects.",
    descVi: "Tư vấn tài chính và tuân thủ chiến lược cho các dự án xây dựng, kỹ thuật và hạ tầng.",
    market: "Construction and infrastructure projects in Vietnam involve long project cycles, subcontractors, staged payments and strict documentation requirements. Profitability depends on disciplined project accounting, contract management, cost control and tax compliance throughout the project lifecycle.",
    marketVi: "Các dự án xây dựng và hạ tầng tại Việt Nam thường có chu kỳ dài, nhiều nhà thầu phụ, thanh toán theo giai đoạn và yêu cầu hồ sơ nghiêm ngặt. Lợi nhuận phụ thuộc vào kế toán dự án, quản trị hợp đồng, kiểm soát chi phí và tuân thủ thuế trong toàn bộ vòng đời dự án.",
    challenges: [
      "Revenue and cost recognition by project progress, contract terms and acceptance documents.",
      "VAT, contractor tax, withholding obligations and deductible expense documentation.",
      "Project overruns, subcontractor controls, advances and retention payments."
    ],
    challengesVi: [
      "Ghi nhận doanh thu và chi phí theo tiến độ, điều khoản hợp đồng và hồ sơ nghiệm thu.",
      "VAT, thuế nhà thầu, nghĩa vụ khấu trừ và hồ sơ chi phí được trừ.",
      "Vượt chi phí dự án, kiểm soát nhà thầu phụ, tạm ứng và khoản giữ lại bảo hành."
    ],
    value: "FACS assists construction businesses in structuring project accounting, strengthening contract-related documentation and improving tax-efficient yet compliant project execution.",
    valueVi: "FACS hỗ trợ doanh nghiệp xây dựng thiết lập kế toán dự án, tăng cường hồ sơ liên quan đến hợp đồng và cải thiện việc triển khai dự án theo hướng hiệu quả thuế nhưng vẫn tuân thủ."
  },
  {
    slug: "food-beverage",
    icon: Utensils,
    title: "F&B",
    titleVi: "Dịch vụ ăn uống",
    desc: "Operational and taxation systems for restaurants, chains and hospitality brands.",
    descVi: "Hệ thống vận hành và thuế cho nhà hàng, chuỗi dịch vụ và thương hiệu hospitality.",
    market: "Vietnam’s F&B sector is dynamic, competitive and operationally intensive. Restaurants, cafés and chains must manage high transaction volume, inventory loss, staff rotation, promotions and brand expansion while keeping finance and tax compliance under control.",
    marketVi: "Ngành F&B tại Việt Nam năng động, cạnh tranh và đòi hỏi vận hành cao. Nhà hàng, quán cà phê và chuỗi thương hiệu cần quản trị lượng giao dịch lớn, hao hụt tồn kho, biến động nhân sự, chương trình khuyến mại và mở rộng thương hiệu trong khi vẫn kiểm soát tài chính và thuế.",
    challenges: [
      "Cash/POS reconciliation, e-invoicing and revenue completeness across outlets.",
      "Inventory consumption, wastage, cost of goods sold and supplier documentation.",
      "Payroll, service charges, promotions and outlet-level profitability reporting."
    ],
    challengesVi: [
      "Đối soát tiền mặt/POS, hóa đơn điện tử và tính đầy đủ của doanh thu theo từng điểm bán.",
      "Tiêu hao tồn kho, hao hụt, giá vốn và hồ sơ nhà cung cấp.",
      "Tiền lương, phí dịch vụ, khuyến mại và báo cáo lợi nhuận theo từng cửa hàng."
    ],
    value: "FACS helps F&B operators build practical controls for outlets, optimize tax documentation and produce management reports that support pricing, expansion and margin protection.",
    valueVi: "FACS giúp doanh nghiệp F&B xây dựng kiểm soát thực tiễn tại điểm bán, tối ưu hồ sơ thuế và lập báo cáo quản trị hỗ trợ định giá, mở rộng và bảo vệ biên lợi nhuận."
  },
  {
    slug: "real-estate",
    icon: Building2,
    title: "Real Estate",
    titleVi: "Bất động sản",
    desc: "Enterprise governance and financial consulting for property businesses.",
    descVi: "Tư vấn quản trị doanh nghiệp và tài chính cho doanh nghiệp bất động sản.",
    market: "Real estate businesses in Vietnam operate in a highly regulated and capital-intensive environment. Projects require careful planning around legal structure, cash flow, capital contributions, revenue timing, land-related costs and stakeholder reporting.",
    marketVi: "Doanh nghiệp bất động sản tại Việt Nam vận hành trong môi trường chịu quản lý chặt chẽ và đòi hỏi vốn lớn. Dự án cần được hoạch định kỹ về cấu trúc pháp lý, dòng tiền, góp vốn, thời điểm ghi nhận doanh thu, chi phí liên quan đến đất và báo cáo cho các bên liên quan.",
    challenges: [
      "Project accounting, capitalized costs, revenue timing and allocation of shared costs.",
      "VAT, corporate income tax, land-related obligations and deductible expense documentation.",
      "Complex legal records, investor reporting and governance across project entities."
    ],
    challengesVi: [
      "Kế toán dự án, vốn hóa chi phí, thời điểm ghi nhận doanh thu và phân bổ chi phí chung.",
      "VAT, thuế thu nhập doanh nghiệp, nghĩa vụ liên quan đến đất và hồ sơ chi phí được trừ.",
      "Hồ sơ pháp lý phức tạp, báo cáo nhà đầu tư và quản trị giữa các pháp nhân dự án."
    ],
    value: "FACS supports real estate companies with structured project finance records, compliance review and tax planning aligned with commercial and regulatory requirements.",
    valueVi: "FACS hỗ trợ doanh nghiệp bất động sản xây dựng hồ sơ tài chính dự án có cấu trúc, rà soát tuân thủ và hoạch định thuế phù hợp với yêu cầu thương mại và pháp lý."
  },
  {
    slug: "healthcare",
    icon: HeartPulse,
    title: "Healthcare",
    titleVi: "Y tế",
    desc: "Regulatory compliance and accounting infrastructure for healthcare providers.",
    descVi: "Nền tảng kế toán và tuân thủ pháp lý cho đơn vị cung cấp dịch vụ y tế.",
    market: "Healthcare providers in Vietnam are facing rising demand, higher service expectations and stricter licensing and compliance requirements. Clinics, medical centers and healthcare businesses must balance service quality, pricing, professional regulations and financial sustainability.",
    marketVi: "Các đơn vị y tế tại Việt Nam đang đối mặt với nhu cầu tăng, kỳ vọng dịch vụ cao hơn và yêu cầu giấy phép, tuân thủ nghiêm ngặt hơn. Phòng khám, trung tâm y tế và doanh nghiệp chăm sóc sức khỏe cần cân bằng chất lượng dịch vụ, chính sách giá, quy định chuyên môn và tính bền vững tài chính.",
    challenges: [
      "Licensing, service scope, professional documentation and regulatory compliance.",
      "Revenue, medical supplies, equipment depreciation and cost center reporting.",
      "Payroll, practitioner arrangements and confidentiality-sensitive internal controls."
    ],
    challengesVi: [
      "Giấy phép, phạm vi dịch vụ, hồ sơ chuyên môn và tuân thủ quy định.",
      "Doanh thu, vật tư y tế, khấu hao thiết bị và báo cáo theo trung tâm chi phí.",
      "Tiền lương, cơ chế hợp tác với bác sĩ/chuyên gia và kiểm soát nội bộ liên quan đến dữ liệu nhạy cảm."
    ],
    value: "FACS helps healthcare businesses maintain disciplined compliance, improve cost visibility and build reliable finance processes that support service quality and controlled growth.",
    valueVi: "FACS giúp doanh nghiệp y tế duy trì tuân thủ có kỷ luật, nâng cao khả năng nhìn nhận chi phí và xây dựng quy trình tài chính đáng tin cậy hỗ trợ chất lượng dịch vụ và tăng trưởng có kiểm soát."
  },
  {
    slug: "foreign-enterprises",
    icon: Globe,
    title: "Foreign Enterprises",
    titleVi: "Doanh nghiệp nước ngoài",
    desc: "Business structuring and legal consulting for international investors in Vietnam.",
    descVi: "Tư vấn cấu trúc kinh doanh và pháp lý cho nhà đầu tư quốc tế tại Việt Nam.",
    market: "Foreign enterprises entering or operating in Vietnam must navigate licensing, tax registration, accounting standards, foreign exchange rules, related-party transactions and local reporting expectations. A clear local compliance model is critical from the beginning.",
    marketVi: "Doanh nghiệp nước ngoài đầu tư hoặc vận hành tại Việt Nam cần xử lý nhiều vấn đề như giấy phép, đăng ký thuế, chuẩn mực kế toán, quản lý ngoại hối, giao dịch liên kết và yêu cầu báo cáo tại địa phương. Một mô hình tuân thủ địa phương rõ ràng là yếu tố quan trọng ngay từ giai đoạn đầu.",
    challenges: [
      "Investment licensing, business registration and alignment between legal form and operations.",
      "CIT, VAT, withholding tax, transfer pricing and cross-border payment documentation.",
      "Local statutory accounting, reporting deadlines and communication with overseas management."
    ],
    challengesVi: [
      "Giấy phép đầu tư, đăng ký kinh doanh và sự phù hợp giữa hình thức pháp lý với hoạt động thực tế.",
      "Thuế TNDN, VAT, thuế nhà thầu, giao dịch liên kết và hồ sơ thanh toán xuyên biên giới.",
      "Kế toán theo quy định Việt Nam, thời hạn báo cáo và trao đổi thông tin với ban quản lý nước ngoài."
    ],
    value: "FACS acts as a local professional partner, helping foreign investors structure operations, optimize tax expense within compliance standards and maintain reliable reporting in Vietnam.",
    valueVi: "FACS đóng vai trò là đối tác chuyên nghiệp tại địa phương, hỗ trợ nhà đầu tư nước ngoài cấu trúc vận hành, tối ưu chi phí thuế trong chuẩn mực tuân thủ và duy trì báo cáo tin cậy tại Việt Nam."
  }
];
