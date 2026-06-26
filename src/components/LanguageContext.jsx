/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const LanguageContext = createContext({ language: "en", setLanguage: () => {} });

const translations = {
  "Your growth starts": "Tăng trưởng bền vững",
  "here with us": "khởi nguồn cùng FACS",
  "Let's Talk": "Trao đổi cùng FACS",
  "Let's Connect": "Kết nối cùng FACS",
  "Home": "Trang chủ",
  "About": "Giới thiệu",
  "Services": "Dịch vụ",
  "Industries": "Lĩnh vực",
  "Insights": "Góc nhìn",
  "Careers": "Tuyển dụng",
  "Contact": "Liên hệ",
  "Navigation": "Điều hướng",
  "Privacy Policy": "Chính sách bảo mật",
  "Terms of Service": "Điều khoản sử dụng",
  "All rights reserved.": "Bảo lưu mọi quyền.",
  "Strategic financial, legal and operational consulting infrastructure for modern enterprises in Vietnam.": "Nền tảng tư vấn chiến lược về tài chính, pháp lý và vận hành dành cho doanh nghiệp hiện đại tại Việt Nam.",
  "Head Office": "Văn phòng chính",
  "Branch Office": "Văn phòng chi nhánh",
  "Schedule Consultation": "Đặt lịch tư vấn",
  "Request Consultation": "Yêu cầu tư vấn",
  "Learn More →": "Tìm hiểu thêm →",
  "Read Article →": "Đọc bài viết →",
  "Talk With FACS": "Trao đổi cùng FACS",
  "Explore Industries": "Khám phá lĩnh vực",
  "Explore Our Services": "Khám phá dịch vụ",
  "View all services": "Xem tất cả dịch vụ",
  "View all industries": "Xem tất cả lĩnh vực",
  "Let’s Build Together": "Cùng kiến tạo giá trị bền vững",
  "Ready To Grow?": "Sẵn sàng tăng trưởng?",
  "Need A Tailored Solution?": "Cần một giải pháp chuyên biệt?",
  "FACS – YOUR TRUSTED PARTNER": "FACS – ĐỐI TÁC TIN CẬY CỦA DOANH NGHIỆP",
  "Empowering Businesses with Confidence": "Đồng hành cùng doanh nghiệp phát triển vững tin",
  "We provide integrated solutions in Accounting, Tax, Audit and Advisory to help your business grow sustainably.": "Chúng tôi cung cấp các giải pháp tích hợp về kế toán, thuế, kiểm toán và tư vấn nhằm hỗ trợ doanh nghiệp phát triển bền vững.",
  "Clients Served": "Khách hàng đã phục vụ",
  "Years of Experience": "Năm kinh nghiệm",
  "Professionals": "Chuyên gia",
  "Service Quality": "Chất lượng dịch vụ",
  "Top-tier": "Chuẩn chuyên nghiệp",
  "About FACS": "Về FACS",
  "Strategic Financial Infrastructure For Modern Enterprises": "Nền tảng tài chính chiến lược cho doanh nghiệp hiện đại",
  "FACS is a comprehensive strategic consulting partner providing accounting, taxation, legal and enterprise operational solutions for startups, SMEs and growing businesses in Vietnam.": "FACS là đối tác tư vấn chiến lược toàn diện, cung cấp các giải pháp kế toán, thuế, pháp lý và vận hành doanh nghiệp cho startup, doanh nghiệp vừa và nhỏ, cũng như các doanh nghiệp đang tăng trưởng tại Việt Nam.",
  "FACS is a strategic consulting partner delivering accounting, taxation, legal and operational solutions designed for sustainable enterprise growth.": "FACS là đối tác tư vấn chiến lược, cung cấp các giải pháp kế toán, thuế, pháp lý và vận hành được thiết kế nhằm hỗ trợ doanh nghiệp tăng trưởng bền vững.",
  "Trusted By 100+ Enterprises": "Được tin cậy bởi hơn 100 doanh nghiệp",
  "Enterprise Clients": "Khách hàng doanh nghiệp",
  "Compliance": "Tuân thủ",
  "Clients": "Khách hàng",
  "Efficiency": "Hiệu quả vận hành",
  "Enterprise Financial Intelligence": "Năng lực tài chính doanh nghiệp",
  "Modern consulting systems designed to optimize operations, compliance and sustainable growth.": "Hệ thống tư vấn hiện đại được thiết kế để tối ưu vận hành, tăng cường tuân thủ và hỗ trợ tăng trưởng bền vững.",
  "Strategic Advisory": "Tư vấn chiến lược",
  "Accounting · Tax · Legal · Governance": "Kế toán · Thuế · Pháp lý · Quản trị",
  "Building Smarter Business Infrastructure": "Kiến tạo nền tảng vận hành doanh nghiệp thông minh hơn",
  "FACS provides integrated consulting solutions across accounting, taxation, corporate legal advisory and operational governance.": "FACS cung cấp các giải pháp tư vấn tích hợp trong lĩnh vực kế toán, thuế, tư vấn pháp lý doanh nghiệp và quản trị vận hành.",
  "Our approach focuses on helping enterprises simplify complexity, strengthen compliance and build scalable internal systems that support long-term sustainable growth.": "Cách tiếp cận của chúng tôi tập trung vào việc giúp doanh nghiệp đơn giản hóa các vấn đề phức tạp, tăng cường tuân thủ và xây dựng hệ thống nội bộ có khả năng mở rộng, phục vụ tăng trưởng bền vững dài hạn.",
  "By combining strategic thinking, regulatory expertise and enterprise-level execution, FACS enables organizations to operate with greater transparency, efficiency and confidence.": "Bằng việc kết hợp tư duy chiến lược, chuyên môn pháp lý – tuân thủ và năng lực triển khai ở cấp độ doanh nghiệp, FACS giúp tổ chức vận hành minh bạch, hiệu quả và tự tin hơn.",
  "What We Do": "Chúng tôi làm gì",
  "Integrated Consulting Solutions": "Giải pháp tư vấn tích hợp",
  "Modernize Your Business Infrastructure": "Hiện đại hóa nền tảng vận hành doanh nghiệp",
  "Partner with FACS to simplify operations, strengthen compliance and accelerate sustainable business growth.": "Đồng hành cùng FACS để đơn giản hóa vận hành, tăng cường tuân thủ và thúc đẩy tăng trưởng bền vững.",
  "Market Context": "Bối cảnh thị trường",
  "Why FACS Exists": "Vì sao FACS ra đời",
  "Value Delivered": "Giá trị mang lại",
  "Vietnamese enterprises are operating in a more demanding environment, where finance, tax, legal and governance decisions must be aligned from the beginning.": "Doanh nghiệp Việt Nam đang vận hành trong một môi trường ngày càng đòi hỏi cao hơn, nơi các quyết định về tài chính, thuế, pháp lý và quản trị cần được đồng bộ ngay từ đầu.",
  "FACS was established to help businesses replace fragmented administration with clear, reliable and scalable professional infrastructure.": "FACS được thành lập nhằm giúp doanh nghiệp thay thế cách quản trị rời rạc bằng một nền tảng chuyên nghiệp rõ ràng, tin cậy và có khả năng mở rộng.",
  "We help management reduce compliance risk, improve decision quality and build operating systems that support sustainable growth.": "Chúng tôi giúp ban lãnh đạo giảm thiểu rủi ro tuân thủ, nâng cao chất lượng ra quyết định và xây dựng hệ thống vận hành hỗ trợ tăng trưởng bền vững.",
  "Industry Sectors": "Lĩnh vực chuyên sâu",
  "Strategic Partners": "Đối tác chiến lược",
  "Our Mission": "Sứ mệnh của chúng tôi",
  "We understand the challenges businesses face in finance, taxation, legal compliance and operational management.": "Chúng tôi thấu hiểu những thách thức mà doanh nghiệp gặp phải trong tài chính, thuế, tuân thủ pháp lý và quản trị vận hành.",
  "FACS was established to simplify complexity, optimize systems and empower enterprises to focus on sustainable growth.": "FACS được thành lập để đơn giản hóa sự phức tạp, tối ưu hệ thống và giúp doanh nghiệp tập trung vào tăng trưởng bền vững.",
  "Enterprise Consulting Solutions": "Giải pháp tư vấn doanh nghiệp",
  "Integrated Consulting Infrastructure": "Nền tảng tư vấn tích hợp",
  "Comprehensive accounting, taxation, legal and operational consulting solutions designed for modern enterprises.": "Các giải pháp tư vấn toàn diện về kế toán, thuế, pháp lý và vận hành được thiết kế cho doanh nghiệp hiện đại.",
  "Regulatory Compliance": "Tuân thủ pháp luật",
  "Operational Efficiency": "Hiệu quả vận hành",
  "Service Pillars": "Nhóm dịch vụ",
  "Advisory Coverage": "Phạm vi tư vấn 360°",
  "360°": "360°",
  "Modern consulting systems designed to optimize operations, governance and sustainable business growth.": "Hệ thống tư vấn hiện đại được thiết kế nhằm tối ưu vận hành, quản trị và tăng trưởng bền vững.",
  "What We Provide": "Phạm vi dịch vụ",
  "Assessment": "Đánh giá",
  "Analyze enterprise operations, compliance status and organizational structure.": "Phân tích hoạt động doanh nghiệp, tình trạng tuân thủ và cấu trúc tổ chức.",
  "Implementation": "Triển khai",
  "Build scalable accounting, taxation and governance systems.": "Xây dựng hệ thống kế toán, thuế và quản trị có khả năng mở rộng.",
  "Optimization": "Tối ưu hóa",
  "Continuously improve efficiency, transparency and operational performance.": "Liên tục cải thiện hiệu quả, tính minh bạch và hiệu suất vận hành.",
  "Build Smarter Business Operations": "Xây dựng vận hành doanh nghiệp thông minh hơn",
  "Partner with FACS to modernize your financial and operational infrastructure.": "Đồng hành cùng FACS để hiện đại hóa nền tảng tài chính và vận hành của doanh nghiệp.",
  "Service Detail": "Chi tiết dịch vụ",
  "Back to Services": "Quay lại Dịch vụ",
  "Strategic Perspective": "Góc nhìn chiến lược",
  "Why This Service Matters": "Vì sao dịch vụ này quan trọng",
  "Why Choose This Service": "Vì sao cần lựa chọn dịch vụ này",
  "What FACS Delivers": "FACS mang lại giá trị gì",
  "What FACS Brings": "FACS mang lại giá trị gì",
  "Why FACS": "Vì sao lựa chọn FACS",
  "Service Overview": "Tổng quan dịch vụ",
  "Key Deliverables": "Phạm vi triển khai chính",
  "Discuss This Service With FACS": "Trao đổi dịch vụ này cùng FACS",
  "Partner with FACS to design a practical and compliant operating model for your enterprise.": "Đồng hành cùng FACS để thiết kế mô hình vận hành thực tiễn, tuân thủ và phù hợp với doanh nghiệp của bạn.",
  "Financial Reporting": "Báo cáo tài chính",
  "Accounting Reports": "Kế toán & Báo cáo",
  "Accounting & Reporting": "Kế toán & Báo cáo",
  "Comprehensive accounting systems, bookkeeping and enterprise reporting infrastructure.": "Hệ thống kế toán, ghi sổ và báo cáo quản trị toàn diện cho doanh nghiệp.",
  "Comprehensive accounting systems, bookkeeping and financial reporting infrastructure.": "Hệ thống kế toán, ghi sổ và báo cáo tài chính toàn diện cho doanh nghiệp.",
  "Bookkeeping and accounting system setup for daily business operations.": "Thiết lập hệ thống kế toán và ghi nhận giao dịch phục vụ vận hành hằng ngày.",
  "Monthly, quarterly and annual financial reporting support.": "Hỗ trợ lập báo cáo tài chính theo tháng, quý và năm.",
  "Management reporting infrastructure for enterprise decision-making.": "Xây dựng hệ thống báo cáo quản trị phục vụ ra quyết định của doanh nghiệp.",
  "Reliable accounting information is the foundation for every sustainable business decision. Without a structured reporting system, management may face delayed insights, inconsistent records and avoidable compliance exposure.": "Thông tin kế toán đáng tin cậy là nền tảng cho mọi quyết định kinh doanh bền vững. Khi thiếu một hệ thống báo cáo có cấu trúc, ban lãnh đạo có thể đối mặt với thông tin chậm trễ, dữ liệu thiếu nhất quán và các rủi ro tuân thủ có thể phòng tránh.",
  "FACS helps enterprises build a disciplined accounting workflow that connects daily transactions, statutory reporting and management-level financial visibility. Our approach is practical, documentation-driven and designed to support both compliance and decision-making.": "FACS hỗ trợ doanh nghiệp xây dựng quy trình kế toán kỷ luật, kết nối giao dịch hằng ngày, báo cáo theo quy định và khả năng quan sát tài chính ở cấp quản trị. Cách tiếp cận của chúng tôi thực tiễn, dựa trên hồ sơ chứng từ và phục vụ đồng thời mục tiêu tuân thủ lẫn ra quyết định.",
  "We combine technical accounting knowledge with an advisory mindset, helping clients not only prepare reports, but also understand the financial story behind their numbers.": "Chúng tôi kết hợp chuyên môn kế toán với tư duy tư vấn, giúp khách hàng không chỉ lập báo cáo mà còn hiểu được câu chuyện tài chính đằng sau các con số.",
  "Tax Compliance": "Tuân thủ thuế",
  "Strategic taxation consulting, declarations and regulatory compliance systems.": "Tư vấn thuế chiến lược, kê khai và xây dựng hệ thống tuân thủ theo quy định.",
  "Strategic taxation consulting, declarations and enterprise tax optimization.": "Tư vấn thuế chiến lược, kê khai và tối ưu hóa thuế phù hợp với hoạt động doanh nghiệp.",
  "Periodic tax declaration and compliance review support.": "Hỗ trợ kê khai thuế định kỳ và rà soát tuân thủ.",
  "Tax risk assessment for transactions and enterprise operations.": "Đánh giá rủi ro thuế đối với giao dịch và hoạt động doanh nghiệp.",
  "Advisory support for sustainable and compliant tax planning.": "Tư vấn lập kế hoạch thuế bền vững và tuân thủ.",
  "Tax compliance is no longer a routine administrative function. Enterprises must manage changing regulations, transaction risks and documentation requirements with a clear and proactive tax governance framework.": "Tuân thủ thuế không còn là một công việc hành chính đơn thuần. Doanh nghiệp cần quản trị các thay đổi pháp luật, rủi ro giao dịch và yêu cầu hồ sơ chứng từ thông qua một khung quản trị thuế rõ ràng, chủ động.",
  "FACS supports periodic declarations, reviews tax positions and identifies risk areas before they become costly issues. We focus on sustainable compliance, transparent documentation and commercially sensible tax planning.": "FACS hỗ trợ kê khai định kỳ, rà soát vị thế thuế và nhận diện các khu vực rủi ro trước khi phát sinh chi phí đáng kể. Chúng tôi tập trung vào tuân thủ bền vững, hồ sơ minh bạch và hoạch định thuế phù hợp thực tiễn kinh doanh.",
  "Our tax advisory style is clear, conservative where needed and business-oriented, helping management remain compliant while protecting operational flexibility.": "Phong cách tư vấn thuế của chúng tôi rõ ràng, thận trọng khi cần thiết và định hướng kinh doanh, giúp ban lãnh đạo duy trì tuân thủ mà vẫn bảo toàn sự linh hoạt trong vận hành.",
  "Corporate Legal": "Pháp lý doanh nghiệp",
  "Enterprise legal advisory, licensing and business compliance consulting.": "Tư vấn pháp lý doanh nghiệp, giấy phép và tuân thủ hoạt động kinh doanh.",
  "Enterprise legal advisory, licensing and business compliance solutions.": "Giải pháp tư vấn pháp lý doanh nghiệp, giấy phép và tuân thủ kinh doanh.",
  "Enterprise licensing, amendment and business registration support.": "Hỗ trợ giấy phép doanh nghiệp, thay đổi đăng ký và thủ tục đăng ký kinh doanh.",
  "Corporate legal documentation and compliance advisory.": "Tư vấn hồ sơ pháp lý doanh nghiệp và tuân thủ.",
  "Regulatory support for internal governance and business operations.": "Hỗ trợ pháp lý – tuân thủ cho quản trị nội bộ và hoạt động kinh doanh.",
  "Corporate legal compliance directly affects business continuity, investor confidence and operational legitimacy. Missing licenses, outdated records or weak documentation can create unnecessary legal and governance risks.": "Tuân thủ pháp lý doanh nghiệp ảnh hưởng trực tiếp đến tính liên tục trong kinh doanh, niềm tin của nhà đầu tư và tính hợp pháp của hoạt động. Thiếu giấy phép, hồ sơ lỗi thời hoặc tài liệu yếu có thể tạo ra rủi ro pháp lý và quản trị không cần thiết.",
  "FACS assists enterprises in managing corporate records, licensing procedures and legal documentation with a structured and business-friendly approach. We help align legal formalities with real operating needs.": "FACS hỗ trợ doanh nghiệp quản lý hồ sơ pháp lý, thủ tục giấy phép và tài liệu doanh nghiệp bằng cách tiếp cận có cấu trúc, thân thiện với hoạt động kinh doanh. Chúng tôi giúp kết nối yêu cầu pháp lý với nhu cầu vận hành thực tế.",
  "We understand that legal advisory must be both accurate and practical. Our work is designed to help clients move forward confidently, not slow them down with unnecessary complexity.": "Chúng tôi hiểu rằng tư vấn pháp lý cần vừa chính xác vừa thực tiễn. Công việc của chúng tôi được thiết kế để giúp khách hàng tiến về phía trước một cách tự tin, thay vì bị chậm lại bởi sự phức tạp không cần thiết.",
  "Payroll & Insurance": "Tiền lương & Bảo hiểm",
  "Payroll Services": "Dịch vụ tiền lương",
  "Workforce management, labor contracts and insurance operations.": "Quản trị nhân sự, hợp đồng lao động và nghiệp vụ bảo hiểm.",
  "Salary management, labor contracts and workforce compliance systems.": "Hệ thống quản lý tiền lương, hợp đồng lao động và tuân thủ nhân sự.",
  "Payroll calculation and salary operation support.": "Hỗ trợ tính lương và vận hành quy trình tiền lương.",
  "Labor contract and workforce compliance review.": "Rà soát hợp đồng lao động và tuân thủ nhân sự.",
  "Social insurance, health insurance and related labor compliance support.": "Hỗ trợ tuân thủ bảo hiểm xã hội, bảo hiểm y tế và các nghĩa vụ lao động liên quan.",
  "Payroll and workforce compliance require accuracy, confidentiality and consistency. Errors in salary, contracts or compulsory insurance can affect employee trust and create regulatory exposure.": "Tiền lương và tuân thủ nhân sự đòi hỏi tính chính xác, bảo mật và nhất quán. Sai sót trong lương, hợp đồng hoặc bảo hiểm bắt buộc có thể ảnh hưởng đến niềm tin của người lao động và tạo ra rủi ro pháp lý.",
  "FACS helps businesses establish payroll routines, review labor documentation and maintain insurance-related compliance. Our support reduces administrative pressure while improving transparency for both management and employees.": "FACS giúp doanh nghiệp thiết lập quy trình tiền lương, rà soát hồ sơ lao động và duy trì tuân thủ về bảo hiểm. Sự hỗ trợ của chúng tôi giúp giảm áp lực hành chính, đồng thời nâng cao tính minh bạch cho cả ban quản lý và người lao động.",
  "We approach payroll as part of a broader people-risk and compliance system, ensuring that workforce administration is clear, controlled and professionally maintained.": "Chúng tôi tiếp cận tiền lương như một phần của hệ thống quản trị rủi ro nhân sự và tuân thủ tổng thể, bảo đảm hoạt động quản trị nhân sự rõ ràng, kiểm soát tốt và được duy trì chuyên nghiệp.",
  "Enterprise Governance": "Quản trị doanh nghiệp",
  "Strategic governance structures and internal operational systems.": "Cấu trúc quản trị chiến lược và hệ thống vận hành nội bộ.",
  "Strategic governance structures and operational system consulting.": "Tư vấn cấu trúc quản trị chiến lược và hệ thống vận hành.",
  "Internal control framework and governance process advisory.": "Tư vấn khung kiểm soát nội bộ và quy trình quản trị.",
  "Operational structure review for growing enterprises.": "Rà soát cấu trúc vận hành cho doanh nghiệp đang tăng trưởng.",
  "Business process documentation and compliance infrastructure.": "Chuẩn hóa quy trình kinh doanh và nền tảng tuân thủ.",
  "As enterprises grow, informal processes often become a constraint. Clear governance, internal controls and documented workflows help management scale with confidence and reduce dependency on individuals.": "Khi doanh nghiệp phát triển, các quy trình phi chính thức thường trở thành điểm nghẽn. Quản trị rõ ràng, kiểm soát nội bộ và quy trình được tài liệu hóa giúp ban lãnh đạo mở rộng quy mô với sự tự tin và giảm phụ thuộc vào từng cá nhân.",
  "FACS reviews operating structures, identifies control gaps and designs practical governance processes. We help businesses improve accountability, consistency and management visibility across functions.": "FACS rà soát cấu trúc vận hành, nhận diện khoảng trống kiểm soát và thiết kế các quy trình quản trị thực tiễn. Chúng tôi giúp doanh nghiệp tăng cường trách nhiệm giải trình, tính nhất quán và khả năng giám sát ở cấp quản trị.",
  "Our governance advisory balances professional standards with real-world implementation, creating systems that people can actually use and management can actually monitor.": "Tư vấn quản trị của chúng tôi cân bằng giữa chuẩn mực chuyên nghiệp và khả năng triển khai thực tế, tạo ra hệ thống mà đội ngũ có thể sử dụng và ban lãnh đạo có thể theo dõi hiệu quả.",
  "Internal Training": "Đào tạo nội bộ",
  "Professional finance, accounting and compliance training programs.": "Chương trình đào tạo chuyên môn về tài chính, kế toán và tuân thủ.",
  "Professional accounting, finance and compliance training programs.": "Chương trình đào tạo chuyên môn về kế toán, tài chính và tuân thủ.",
  "Accounting, taxation and compliance training for internal teams.": "Đào tạo kế toán, thuế và tuân thủ cho đội ngũ nội bộ.",
  "Customized workshops based on enterprise operating models.": "Các buổi đào tạo chuyên biệt theo mô hình vận hành của doanh nghiệp.",
  "Practical training materials for finance and administrative personnel.": "Tài liệu đào tạo thực tiễn cho nhân sự tài chính và hành chính.",
  "A capable internal team is essential for sustainable compliance and operational efficiency. Training helps reduce repeated errors, improve coordination and strengthen internal understanding of finance and compliance obligations.": "Một đội ngũ nội bộ có năng lực là điều kiện thiết yếu cho tuân thủ bền vững và hiệu quả vận hành. Đào tạo giúp giảm sai sót lặp lại, cải thiện phối hợp và nâng cao hiểu biết nội bộ về tài chính cũng như nghĩa vụ tuân thủ.",
  "FACS develops practical training sessions tailored to the enterprise’s actual transactions, workflows and internal roles. Our programs are designed to be clear, applicable and immediately useful for daily operations.": "FACS xây dựng các chương trình đào tạo thực tiễn, được điều chỉnh theo giao dịch, quy trình và vai trò nội bộ thực tế của doanh nghiệp. Chương trình của chúng tôi được thiết kế rõ ràng, có khả năng áp dụng và hữu ích ngay trong vận hành hằng ngày.",
  "We translate technical accounting, tax and compliance matters into business language, helping teams understand not only what to do, but why it matters.": "Chúng tôi chuyển hóa các vấn đề kỹ thuật về kế toán, thuế và tuân thủ thành ngôn ngữ kinh doanh dễ hiểu, giúp đội ngũ không chỉ biết cần làm gì mà còn hiểu vì sao điều đó quan trọng.",
  "Audit & Assurance": "Kiểm toán & Đảm bảo",
  "Business Advisory": "Tư vấn kinh doanh",
  "Corporate Secretarial": "Thư ký doanh nghiệp",
  "Industries We Serve": "Ngành nghề chúng tôi phục vụ",
  "Specialized Expertise Across Industries": "Chuyên môn sâu theo từng ngành nghề",
  "FACS delivers tailored financial, taxation and legal consulting infrastructure across diverse industries and enterprise sectors.": "FACS cung cấp nền tảng tư vấn tài chính, thuế và pháp lý được thiết kế phù hợp với nhiều ngành nghề và lĩnh vực doanh nghiệp.",
  "Manufacturing": "Sản xuất",
  "Financial systems and compliance infrastructure for industrial operations and manufacturing enterprises.": "Hệ thống tài chính và nền tảng tuân thủ cho hoạt động công nghiệp và doanh nghiệp sản xuất.",
  "Technology": "Công nghệ",
  "Scalable accounting and legal frameworks for startups and technology companies.": "Khung kế toán và pháp lý có khả năng mở rộng cho startup và doanh nghiệp công nghệ.",
  "E-Commerce": "Thương mại điện tử",
  "Modern taxation and operational consulting for digital commerce ecosystems.": "Tư vấn thuế và vận hành hiện đại cho hệ sinh thái thương mại số.",
  "Construction & Infrastructure": "Xây dựng & Hạ tầng",
  "Strategic financial and compliance consulting for construction, engineering and infrastructure projects.": "Tư vấn tài chính và tuân thủ chiến lược cho các dự án xây dựng, kỹ thuật và hạ tầng.",
  "F&B": "Dịch vụ ăn uống",
  "Operational and taxation systems for restaurants, chains and hospitality brands.": "Hệ thống vận hành và thuế cho nhà hàng, chuỗi dịch vụ và thương hiệu hospitality.",
  "Real Estate": "Bất động sản",
  "Enterprise governance and financial consulting for property businesses.": "Tư vấn quản trị doanh nghiệp và tài chính cho lĩnh vực bất động sản.",
  "Healthcare": "Y tế",
  "Regulatory compliance and accounting infrastructure for healthcare providers.": "Nền tảng tuân thủ và kế toán cho đơn vị cung cấp dịch vụ y tế.",
  "Foreign Enterprises": "Doanh nghiệp nước ngoài",
  "Business structuring and legal consulting for international investors in Vietnam.": "Tư vấn cấu trúc kinh doanh và pháp lý cho nhà đầu tư quốc tế tại Việt Nam.",
  "Industry-Focused Consulting": "Tư vấn chuyên biệt theo ngành",
  "Modern Solutions For Modern Enterprises": "Giải pháp hiện đại cho doanh nghiệp hiện đại",
  "Partner with FACS to build scalable operational and financial systems tailored to your industry.": "Đồng hành cùng FACS để xây dựng hệ thống vận hành và tài chính có khả năng mở rộng, phù hợp với đặc thù ngành của doanh nghiệp.",
  "Insights & Perspectives": "Góc nhìn & Phân tích",
  "Professional insights on accounting, tax, legal compliance and business advisory for enterprises in Vietnam.": "Các góc nhìn chuyên môn về kế toán, thuế, tuân thủ pháp lý và tư vấn kinh doanh cho doanh nghiệp tại Việt Nam.",
  "Strategic Business Intelligence": "Tri thức kinh doanh chiến lược",
  "Enterprise Tax Strategy In 2026": "Chiến lược thuế doanh nghiệp năm 2026",
  "Modern Financial Infrastructure": "Nền tảng tài chính hiện đại",
  "Corporate Governance Transformation": "Chuyển đổi quản trị doanh nghiệp",
  "Tax": "Thuế",
  "Finance": "Tài chính",
  "Legal": "Pháp lý",
  "Build Your Career With FACS": "Xây dựng sự nghiệp cùng FACS",
  "Join a professional services environment where expertise, responsibility and long-term growth are valued.": "Gia nhập môi trường dịch vụ chuyên nghiệp, nơi chuyên môn, trách nhiệm và sự phát triển dài hạn được đề cao.",
  "Innovation": "Đổi mới",
  "We embrace modern systems, digital transformation and continuous improvement.": "Chúng tôi đón nhận các hệ thống hiện đại, chuyển đổi số và tinh thần cải tiến liên tục.",
  "Professionalism": "Chuyên nghiệp",
  "We maintain high standards in expertise, ethics and enterprise consulting.": "Chúng tôi duy trì các tiêu chuẩn cao về chuyên môn, đạo đức nghề nghiệp và tư vấn doanh nghiệp.",
  "Growth": "Phát triển",
  "We invest in learning, leadership development and long-term career growth.": "Chúng tôi đầu tư vào học hỏi, phát triển năng lực lãnh đạo và tăng trưởng nghề nghiệp dài hạn.",
  "Open Positions": "Vị trí đang tuyển dụng",
  "Senior Tax Consultant": "Chuyên viên tư vấn thuế cao cấp",
  "Accounting Specialist": "Chuyên viên kế toán",
  "Corporate Legal Consultant": "Chuyên viên tư vấn pháp lý doanh nghiệp",
  "Business Development Executive": "Chuyên viên phát triển kinh doanh",
  "Full-time": "Toàn thời gian",
  "Ho Chi Minh City": "TP. Hồ Chí Minh",
  "Hybrid": "Làm việc kết hợp",
  "Remote": "Làm việc từ xa",
  "Apply Now": "Ứng tuyển ngay",
  "A trusted comprehensive strategic partner": "Đối tác chiến lược toàn diện đáng tin cậy",
  "FACS is built to support startups, small and medium-sized enterprises and growing businesses with integrated financial, legal and operational consulting solutions.": "FACS được xây dựng để đồng hành cùng doanh nghiệp khởi nghiệp, doanh nghiệp vừa và nhỏ và các doanh nghiệp đang tăng trưởng thông qua các giải pháp tư vấn tích hợp về tài chính, pháp lý và vận hành.",
  "We listen to each client’s operating context, identify practical needs and design tailored solutions that help simplify complexity, strengthen compliance and improve management confidence.": "Chúng tôi lắng nghe bối cảnh vận hành của từng khách hàng, xác định nhu cầu thực tiễn và thiết kế các giải pháp phù hợp nhằm đơn giản hóa sự phức tạp, tăng cường tuân thủ và nâng cao sự tự tin trong quản trị.",
  "From accounting and tax to corporate legal advisory and governance infrastructure, FACS works alongside enterprises to establish a more transparent, disciplined and scalable business foundation.": "Từ kế toán, thuế đến tư vấn pháp lý doanh nghiệp và nền tảng quản trị, FACS đồng hành cùng doanh nghiệp để xây dựng một nền tảng kinh doanh minh bạch, kỷ luật và có khả năng mở rộng hơn.",
  "Our Vision": "Tầm nhìn của chúng tôi",
  "To become a trusted strategic partner for sustainable growth": "Trở thành đối tác chiến lược tin cậy cho tăng trưởng bền vững",
  "FACS aims to accompany enterprises from formation to growth by simplifying compliance, improving transparency and supporting operational excellence.": "FACS hướng đến việc đồng hành cùng doanh nghiệp từ giai đoạn hình thành đến tăng trưởng thông qua đơn giản hóa tuân thủ, nâng cao tính minh bạch và hỗ trợ hiệu quả vận hành.",
  "To deliver professional, practical and timely solutions": "Mang đến các giải pháp chuyên nghiệp, thực tiễn và kịp thời",
  "We provide integrated consulting support that helps businesses save time, control costs and focus on their core growth agenda.": "Chúng tôi cung cấp hỗ trợ tư vấn tích hợp, giúp doanh nghiệp tiết kiệm thời gian, kiểm soát chi phí và tập trung vào định hướng tăng trưởng cốt lõi.",
  "Our Core Values": "Giá trị cốt lõi",
  "Professionalism, transparency and dedicated partnership": "Chuyên nghiệp, minh bạch và đồng hành tận tâm",
  "Our work is grounded in accuracy, integrity, responsiveness and a service mindset that places long-term client value at the center.": "Công việc của chúng tôi dựa trên sự chính xác, chính trực, phản hồi kịp thời và tinh thần dịch vụ đặt giá trị dài hạn của khách hàng làm trọng tâm.",
  "Accuracy and integrity": "Chính xác và chính trực",
  "Compliance and transparency": "Tuân thủ và minh bạch",
  "Timely and responsive execution": "Triển khai kịp thời và linh hoạt",
  "Professional and optimized delivery": "Cung cấp dịch vụ chuyên nghiệp và tối ưu",
  "Client partnership and care": "Đồng hành và chăm sóc khách hàng",
  "Practical and cost-effective solutions": "Giải pháp thực tiễn và hiệu quả chi phí",
  "Dedicated and dynamic service mindset": "Tinh thần phục vụ tận tâm và năng động",
  "Personalized and simplified implementation": "Triển khai cá nhân hóa và đơn giản hóa",
  "Leadership Team": "Đội ngũ điều hành",
  "Experienced leadership for professional enterprise advisory": "Đội ngũ lãnh đạo giàu kinh nghiệm cho tư vấn doanh nghiệp chuyên nghiệp",
  "Our leadership team combines financial, tax, legal, client relationship and operational advisory experience to help clients make confident decisions with clarity and discipline.": "Đội ngũ điều hành của chúng tôi kết hợp kinh nghiệm về tài chính, thuế, pháp lý, quan hệ khách hàng và tư vấn vận hành nhằm giúp khách hàng ra quyết định rõ ràng, kỷ luật và tự tin hơn.",
  "Nguyễn Hoàng Tú": "Nguyễn Hoàng Tú",
  "General Director & Chief Executive Officer": "Tổng Giám đốc kiêm Giám đốc điều hành",
  "Director of Business Advisory": "Giám đốc Tư vấn Doanh nghiệp",
  "Huỳnh Thị Ngọc Thanh": "Huỳnh Thị Ngọc Thanh",
  "Deputy General Director & Chief Financial Officer": "Phó Tổng Giám đốc kiêm Giám đốc Tài chính",
  "Director of Tax and Legal Advisory": "Giám đốc Tư vấn Thuế và Pháp lý",
  "Đoàn Hoàng Kim Yến": "Đoàn Hoàng Kim Yến",
  "Deputy General Director, Client Relationship & Marketing": "Phó Tổng Giám đốc phụ trách Quan hệ khách hàng và Tiếp thị",
  "Director of Tax and Accounting Advisory": "Giám đốc Tư vấn Thuế và Kế toán",
  "Build The Future With FACS": "Cùng FACS xây dựng tương lai nghề nghiệp",
  "Join a modern consulting environment focused on innovation, strategic thinking and sustainable enterprise growth.": "Gia nhập môi trường tư vấn hiện đại, đề cao đổi mới, tư duy chiến lược và tăng trưởng bền vững của doanh nghiệp.",
  "Explore Career Opportunities": "Khám phá cơ hội nghề nghiệp",
  "More Details": "Xem chi tiết",
  "Join Our Team": "Gia nhập đội ngũ FACS",
  "Shape The Future Of Enterprise Consulting": "Cùng định hình tương lai tư vấn doanh nghiệp",
  "Build your career in a modern consulting environment focused on impact, innovation and sustainable growth.": "Phát triển sự nghiệp trong môi trường tư vấn hiện đại, tập trung vào giá trị tạo ra, đổi mới và tăng trưởng bền vững.",
  "Submit Your CV": "Gửi hồ sơ ứng tuyển",
  "Career Application": "Thông tin ứng tuyển",
  "Share your profile with FACS and connect with our team for suitable professional opportunities.": "Chia sẻ hồ sơ của bạn với FACS để kết nối cùng đội ngũ của chúng tôi trong các cơ hội nghề nghiệp phù hợp.",
  "Full Name": "Họ và tên",
  "Applied Position": "Vị trí ứng tuyển",
  "Message To FACS": "Nội dung gửi đến FACS",
  "Attach CV": "Đính kèm CV",
  "The form will prepare an email to hr@facs.vn. Please attach your CV again in your email application before sending.": "Biểu mẫu sẽ tạo email gửi đến hr@facs.vn. Vui lòng đính kèm lại CV trong ứng dụng email trước khi gửi.",
  "Submit Application": "Gửi hồ sơ ứng tuyển",
  "This form opens your email application and prepares the message to contact@facs.vn for submission.": "Biểu mẫu sẽ mở ứng dụng email và chuẩn bị nội dung gửi đến contact@facs.vn.",
  "31/3A Nguyen Van Lac Street, Ward 21, Binh Thanh District, Ho Chi Minh City, Vietnam": "31/3A Nguyễn Văn Lạc, Phường 21, Quận Bình Thạnh, Thành phố Hồ Chí Minh, Việt Nam",
  "309 Bach Dang Street, Ward 2, Binh Thanh District, Ho Chi Minh City, Vietnam": "309 Bạch Đằng, Phường 2, Quận Bình Thạnh, Thành phố Hồ Chí Minh, Việt Nam",
  "Contact FACS": "Liên hệ FACS",
  "Contact FACS for strategic financial, taxation, legal and enterprise consulting solutions.": "Liên hệ FACS để được tư vấn các giải pháp chiến lược về tài chính, thuế, pháp lý và vận hành doanh nghiệp.",
  "Send Inquiry": "Gửi thông tin tư vấn",
  "Your Name": "Họ và tên",
  "Email Address": "Địa chỉ email",
  "Phone Number": "Số điện thoại",
  "Message": "Nội dung cần tư vấn",
  "Send Message": "Gửi yêu cầu",
  "Hotline": "Điện thoại",
  "Hotline: (+84) 972 798 424": "Điện thoại: (+84) 972 798 424",
  "Email: contact@facs.vn": "Email: contact@facs.vn",
  "Email": "Email",
  "Explore Services": "Khám phá dịch vụ",
  "View Industries": "Xem lĩnh vực",
  "Learn More": "Tìm hiểu thêm",
  "8 Industry Focuses": "8 lĩnh vực chuyên sâu",
  "6 Service Pillars": "6 nhóm dịch vụ",
};

const reverseTranslations = Object.fromEntries(Object.entries(translations).map(([en, vi]) => [vi, en]));

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function translateNodeText(raw, map) {
  const normalized = normalizeText(raw);
  const mapped = map[normalized];
  if (!mapped) return raw;
  const leading = raw.match(/^\s*/)?.[0] || "";
  const trailing = raw.match(/\s*$/)?.[0] || "";
  return `${leading}${mapped}${trailing}`;
}

function applyTranslations(language) {
  const map = language === "vi" ? translations : reverseTranslations;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !normalizeText(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || parent.closest("script, style, textarea, [data-no-translate]")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    const nextValue = translateNodeText(node.nodeValue, map);
    if (nextValue !== node.nodeValue) node.nodeValue = nextValue;
  });

  document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((el) => {
    if (el.closest("[data-no-translate]")) return;
    const text = el.getAttribute("placeholder");
    const mapped = map[text];
    if (mapped) el.setAttribute("placeholder", mapped);
  });

  document.documentElement.lang = language === "vi" ? "vi" : "en";
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("facs-language") || "en");
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem("facs-language", language);

    const run = () => applyTranslations(language);
    const timers = [0, 40, 120, 260, 520].map((delay) => window.setTimeout(run, delay));

    const observer = new MutationObserver(() => run());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      observer.disconnect();
    };
  }, [language, location.pathname, location.search, location.hash]);

  const value = useMemo(() => ({ language, setLanguage }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
