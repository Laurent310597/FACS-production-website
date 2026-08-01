import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import { useLanguage } from "../components/LanguageContext";

const content = {
  privacy: {
    en: {
      eyebrow: "FACS governance notice",
      title: "Privacy Policy",
      intro:
        "This Privacy Policy explains how FACS collects, uses, stores and protects personal information when you visit our website, contact our team or engage with our professional services.",
      updated: "Effective date: August 2026",
      sections: [
        {
          heading: "1. Information we may collect",
          body:
            "We may collect information you provide directly, including your name, company, job title, email address, phone number, service interests, career application details, CV documents and any information included in inquiry forms, emails or consultation requests. We may also collect limited technical information to maintain website performance, prevent spam and protect our systems.",
        },
        {
          heading: "2. How we use information",
          body:
            "FACS uses personal information to respond to inquiries, review career applications, contact suitable candidates, provide professional services, manage client relationships, improve our website, maintain internal records and comply with applicable obligations. We do not sell personal information.",
        },
        {
          heading: "3. Disclosure and professional confidentiality",
          body:
            "Information may be shared with FACS personnel, professional advisers, technology providers or competent authorities where required by law or necessary for service delivery. We apply a professional-services standard of confidentiality and require appropriate safeguards where third parties support our operations.",
        },
        {
          heading: "4. Data security and retention",
          body:
            "We maintain reasonable administrative, technical and organizational measures to protect information from unauthorized access, loss or misuse. Information is retained only for as long as necessary for the purposes described in this Policy, for legitimate business needs, or as required by law and professional record-keeping requirements.",
        },
        {
          heading: "5. Artificial intelligence features",
          body:
            "Public FACS Advisory AI questions are processed through Groq, including real-time web search restricted to a FACS-approved domain registry. The authenticated CMS assistant is separate: relevant excerpts from administrator-curated URLs or uploaded files may be sent to the OpenAI API only when the administrator asks a question, and this private library is not supplied to the public Groq assistant. FACS does not intentionally include raw public questions or AI answers in its metadata audit log, but each provider processes request content under its own terms and data controls. Do not submit confidential, privileged, client, credential, banking, tax-account, health or sensitive personal information to an AI feature or CMS library.",
        },
        {
          heading: "6. Your choices and contact",
          body:
            "You may contact FACS to request access, correction or deletion of your personal information, subject to applicable legal and professional limitations. For privacy-related requests, please contact us through the details provided on the Contact page.",
        },
      ],
    },
    vi: {
      eyebrow: "Thông báo quản trị của FACS",
      title: "Chính sách bảo mật",
      intro:
        "Chính sách bảo mật này giải thích cách FACS thu thập, sử dụng, lưu trữ và bảo vệ thông tin cá nhân khi Quý khách truy cập website, liên hệ với đội ngũ của chúng tôi hoặc sử dụng các dịch vụ chuyên nghiệp của FACS.",
      updated: "Ngày hiệu lực: Tháng 08/2026",
      sections: [
        {
          heading: "1. Thông tin chúng tôi có thể thu thập",
          body:
            "FACS có thể thu thập các thông tin do người dùng trực tiếp cung cấp, bao gồm họ tên, doanh nghiệp, chức danh, địa chỉ email, số điện thoại, nhu cầu dịch vụ, thông tin ứng tuyển, tài liệu CV và các thông tin được gửi qua biểu mẫu liên hệ, email hoặc yêu cầu tư vấn. Chúng tôi cũng có thể thu thập một số thông tin kỹ thuật giới hạn nhằm duy trì hiệu năng, ngăn chặn spam và bảo vệ hệ thống.",
        },
        {
          heading: "2. Mục đích sử dụng thông tin",
          body:
            "FACS sử dụng thông tin cá nhân để phản hồi yêu cầu, xem xét hồ sơ ứng tuyển, liên hệ ứng viên phù hợp, cung cấp dịch vụ chuyên nghiệp, quản lý quan hệ khách hàng, cải thiện website, duy trì hồ sơ nội bộ và đáp ứng các nghĩa vụ có liên quan. FACS không bán thông tin cá nhân.",
        },
        {
          heading: "3. Chia sẻ thông tin và bảo mật nghề nghiệp",
          body:
            "Thông tin có thể được chia sẻ với nhân sự FACS, cố vấn chuyên môn, nhà cung cấp công nghệ hoặc cơ quan có thẩm quyền khi pháp luật yêu cầu hoặc khi cần thiết để cung cấp dịch vụ. Chúng tôi áp dụng tiêu chuẩn bảo mật của lĩnh vực dịch vụ chuyên nghiệp và yêu cầu các biện pháp bảo vệ phù hợp đối với bên thứ ba hỗ trợ hoạt động của FACS.",
        },
        {
          heading: "4. An toàn dữ liệu và thời hạn lưu trữ",
          body:
            "FACS duy trì các biện pháp quản trị, kỹ thuật và tổ chức hợp lý để bảo vệ thông tin khỏi truy cập trái phép, thất lạc hoặc sử dụng sai mục đích. Thông tin được lưu trữ trong thời hạn cần thiết cho các mục đích nêu tại Chính sách này, cho nhu cầu kinh doanh hợp pháp hoặc theo yêu cầu của pháp luật và quy định lưu trữ hồ sơ nghề nghiệp.",
        },
        {
          heading: "5. Chức năng trí tuệ nhân tạo",
          body:
            "Câu hỏi gửi tới AI Tư vấn FACS được xử lý qua Groq, bao gồm web search theo thời gian thực nhưng chỉ trong registry tên miền do FACS phê duyệt. Trợ lý CMS đã đăng nhập được tách riêng: các trích đoạn liên quan từ URL hoặc file do quản trị viên biên soạn chỉ được gửi tới OpenAI API khi quản trị viên đặt câu hỏi, và thư viện riêng này không được cấp cho GROQ công khai. FACS chủ động không lưu nội dung câu hỏi công khai hoặc câu trả lời AI trong nhật ký siêu dữ liệu; tuy nhiên, từng nhà cung cấp vẫn xử lý nội dung yêu cầu theo điều khoản và cơ chế kiểm soát dữ liệu của họ. Không gửi thông tin mật, dữ liệu khách hàng, thông tin đăng nhập, ngân hàng, tài khoản thuế, sức khỏe hoặc dữ liệu cá nhân nhạy cảm vào chức năng AI hay thư viện CMS.",
        },
        {
          heading: "6. Quyền lựa chọn và liên hệ",
          body:
            "Quý khách có thể liên hệ FACS để yêu cầu truy cập, chỉnh sửa hoặc xóa thông tin cá nhân, tùy thuộc vào các giới hạn pháp lý và nghề nghiệp có liên quan. Đối với các yêu cầu về bảo mật thông tin, vui lòng liên hệ với chúng tôi thông qua thông tin tại trang Liên hệ.",
        },
      ],
    },
  },
  terms: {
    en: {
      eyebrow: "Website terms",
      title: "Terms of Use",
      intro:
        "These Terms of Use govern access to and use of the FACS website. By using this website, you agree to these terms. If you do not agree, please discontinue use of the website.",
      updated: "Effective date: August 2026",
      sections: [
        {
          heading: "1. Website content",
          body:
            "The information on this website is provided for general information only. It is not intended to constitute accounting, tax, legal, audit or other professional advice. Professional advice should be obtained before making decisions based on specific facts and circumstances.",
        },
        {
          heading: "2. No client relationship",
          body:
            "Use of this website, submission of an inquiry or receipt of general information does not create a client, adviser, fiduciary or professional relationship with FACS. A professional engagement is established only when FACS and the client agree separate engagement terms in writing.",
        },
        {
          heading: "3. AI-generated information",
          body:
            "AI outputs may be incomplete, outdated or incorrect. Groq web search is restricted to approved domains, but third-party legal databases remain secondary sources and are not issuing authorities. Source links and confidence indicators are aids, not guarantees. Users must verify the official instrument, effective status, supporting records and applicability before relying on any output. FACS may decline to answer when approved-source results are insufficient and may limit, suspend or change an AI feature without notice.",
        },
        {
          heading: "4. Intellectual property",
          body:
            "All website content, including text, layout, graphics, logos and visual elements, belongs to FACS or its licensors unless otherwise stated. You may view and download content for internal reference only and may not reproduce, distribute or modify it for commercial purposes without prior written consent.",
        },
        {
          heading: "5. External links and availability",
          body:
            "This website may include links to third-party websites for convenience. FACS is not responsible for third-party content, security or privacy practices. We aim to maintain website availability but do not guarantee uninterrupted, error-free or fully secure access.",
        },
        {
          heading: "6. Limitation and changes",
          body:
            "To the extent permitted by law, FACS is not liable for losses arising from reliance on general website information or from website access issues. FACS may update these Terms of Use from time to time, and the updated version will apply once published on this website.",
        },
      ],
    },
    vi: {
      eyebrow: "Điều khoản website",
      title: "Điều khoản sử dụng",
      intro:
        "Điều khoản sử dụng này điều chỉnh việc truy cập và sử dụng website của FACS. Khi sử dụng website này, Quý khách đồng ý với các điều khoản dưới đây. Nếu không đồng ý, vui lòng ngừng sử dụng website.",
      updated: "Ngày hiệu lực: Tháng 08/2026",
      sections: [
        {
          heading: "1. Nội dung trên website",
          body:
            "Thông tin trên website này chỉ nhằm mục đích tham khảo chung. Nội dung không được xem là tư vấn kế toán, thuế, pháp lý, kiểm toán hoặc bất kỳ tư vấn chuyên môn nào khác. Quý khách nên tìm kiếm tư vấn chuyên môn phù hợp trước khi đưa ra quyết định dựa trên tình huống và dữ kiện cụ thể.",
        },
        {
          heading: "2. Không hình thành quan hệ khách hàng",
          body:
            "Việc sử dụng website, gửi yêu cầu liên hệ hoặc tiếp nhận thông tin chung không tạo lập quan hệ khách hàng, tư vấn, ủy thác hoặc quan hệ nghề nghiệp với FACS. Quan hệ dịch vụ chuyên nghiệp chỉ được xác lập khi FACS và khách hàng thống nhất các điều khoản dịch vụ riêng bằng văn bản.",
        },
        {
          heading: "3. Thông tin do AI tạo ra",
          body:
            "Kết quả AI có thể chưa đầy đủ, chưa cập nhật hoặc không chính xác. GROQ web search bị giới hạn trong các tên miền đã phê duyệt, nhưng cơ sở dữ liệu pháp luật của bên thứ ba vẫn là nguồn thứ cấp và không phải cơ quan ban hành. Liên kết nguồn và chỉ báo mức độ tin cậy chỉ là công cụ hỗ trợ, không phải sự bảo đảm. Người dùng phải kiểm tra văn bản chính thức, tình trạng hiệu lực, hồ sơ liên quan và phạm vi áp dụng trước khi sử dụng kết quả. FACS có thể từ chối trả lời khi kết quả nguồn được phép chưa đủ và có thể giới hạn, tạm dừng hoặc thay đổi chức năng AI mà không cần thông báo trước.",
        },
        {
          heading: "4. Quyền sở hữu trí tuệ",
          body:
            "Toàn bộ nội dung website, bao gồm văn bản, bố cục, đồ họa, logo và các yếu tố nhận diện, thuộc quyền sở hữu của FACS hoặc bên cấp phép, trừ khi có quy định khác. Quý khách có thể xem và tải nội dung cho mục đích tham khảo nội bộ, nhưng không được sao chép, phân phối hoặc chỉnh sửa cho mục đích thương mại nếu chưa có sự đồng ý trước bằng văn bản.",
        },
        {
          heading: "5. Liên kết bên ngoài và khả năng truy cập",
          body:
            "Website có thể bao gồm liên kết đến các trang của bên thứ ba nhằm tạo thuận tiện cho người dùng. FACS không chịu trách nhiệm đối với nội dung, bảo mật hoặc chính sách riêng tư của các website bên thứ ba. Chúng tôi nỗ lực duy trì khả năng truy cập website nhưng không bảo đảm việc truy cập luôn liên tục, không có lỗi hoặc hoàn toàn an toàn.",
        },
        {
          heading: "6. Giới hạn trách nhiệm và cập nhật",
          body:
            "Trong phạm vi pháp luật cho phép, FACS không chịu trách nhiệm đối với các tổn thất phát sinh từ việc dựa vào thông tin tham khảo chung trên website hoặc từ sự cố truy cập website. FACS có thể cập nhật Điều khoản sử dụng này theo từng thời điểm; phiên bản cập nhật sẽ có hiệu lực khi được công bố trên website.",
        },
      ],
    },
  },
};

export default function LegalPage({ type }) {
  const { language } = useLanguage();
  const page = content[type][language] || content[type].en;

  return (
    <PageTransition>
      <Navbar />
      <main className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.13),transparent_34%),linear-gradient(135deg,#0d1726_0%,#101b2f_52%,#132238_100%)] text-white">
        <section className="relative py-24 lg:py-28">
          <div className="absolute -top-24 right-10 h-80 w-80 rounded-full bg-cyan-400/10 blur-[110px]" />
          <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-blue-500/10 blur-[100px]" />
          <div className="container relative z-10 mx-auto px-6 lg:px-12">
            <div className="mx-auto max-w-4xl">
              <div className="mb-5 text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300/90">{page.eyebrow}</div>
              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">{page.title}</h1>
              <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-300">{page.intro}</p>
              <div className="mt-6 inline-flex rounded-full border border-cyan-200/15 bg-white/[0.04] px-4 py-2 text-sm text-cyan-100/85">{page.updated}</div>
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="mx-auto max-w-4xl space-y-6">
              {page.sections.map((section) => (
                <article
                  key={section.heading}
                  className="rounded-3xl border border-cyan-200/12 bg-white/[0.035] p-7 shadow-[0_22px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.055]"
                >
                  <h2 className="text-xl font-semibold text-white">{section.heading}</h2>
                  <p className="mt-4 leading-8 text-slate-300">{section.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </PageTransition>
  );
}
