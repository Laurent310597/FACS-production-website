import {
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
    title: "Accounting Reports",
    desc: "Comprehensive accounting systems, bookkeeping and financial reporting infrastructure.",
    details: [
      "Bookkeeping and accounting system setup for daily business operations.",
      "Monthly, quarterly and annual financial reporting support.",
      "Management reporting infrastructure for enterprise decision-making.",
    ],
    whyChoose:
      "Reliable accounting information is the foundation for every sustainable business decision. Without a structured reporting system, management may face delayed insights, inconsistent records and avoidable compliance exposure.",
    facsValue:
      "FACS helps enterprises build a disciplined accounting workflow that connects daily transactions, statutory reporting and management-level financial visibility. Our approach is practical, documentation-driven and designed to support both compliance and decision-making.",
    whyFacs:
      "We combine technical accounting knowledge with an advisory mindset, helping clients not only prepare reports, but also understand the financial story behind their numbers.",
  },
  {
    slug: "tax-compliance",
    icon: ShieldCheck,
    title: "Tax Compliance",
    desc: "Strategic taxation consulting, declarations and enterprise tax optimization.",
    details: [
      "Periodic tax declaration and compliance review support.",
      "Tax risk assessment for transactions and enterprise operations.",
      "Advisory support for sustainable and compliant tax planning.",
    ],
    whyChoose:
      "Tax compliance is no longer a routine administrative function. Enterprises must manage changing regulations, transaction risks and documentation requirements with a clear and proactive tax governance framework.",
    facsValue:
      "FACS supports periodic declarations, reviews tax positions and identifies risk areas before they become costly issues. We focus on sustainable compliance, transparent documentation and commercially sensible tax planning.",
    whyFacs:
      "Our tax advisory style is clear, conservative where needed and business-oriented, helping management remain compliant while protecting operational flexibility.",
  },
  {
    slug: "corporate-legal",
    icon: Scale,
    title: "Corporate Legal",
    desc: "Enterprise legal advisory, licensing and business compliance solutions.",
    details: [
      "Enterprise licensing, amendment and business registration support.",
      "Corporate legal documentation and compliance advisory.",
      "Regulatory support for internal governance and business operations.",
    ],
    whyChoose:
      "Corporate legal compliance directly affects business continuity, investor confidence and operational legitimacy. Missing licenses, outdated records or weak documentation can create unnecessary legal and governance risks.",
    facsValue:
      "FACS assists enterprises in managing corporate records, licensing procedures and legal documentation with a structured and business-friendly approach. We help align legal formalities with real operating needs.",
    whyFacs:
      "We understand that legal advisory must be both accurate and practical. Our work is designed to help clients move forward confidently, not slow them down with unnecessary complexity.",
  },
  {
    slug: "payroll-insurance",
    icon: Briefcase,
    title: "Payroll & Insurance",
    desc: "Salary management, labor contracts and workforce compliance systems.",
    details: [
      "Payroll calculation and salary operation support.",
      "Labor contract and workforce compliance review.",
      "Social insurance, health insurance and related labor compliance support.",
    ],
    whyChoose:
      "Payroll and workforce compliance require accuracy, confidentiality and consistency. Errors in salary, contracts or compulsory insurance can affect employee trust and create regulatory exposure.",
    facsValue:
      "FACS helps businesses establish payroll routines, review labor documentation and maintain insurance-related compliance. Our support reduces administrative pressure while improving transparency for both management and employees.",
    whyFacs:
      "We approach payroll as part of a broader people-risk and compliance system, ensuring that workforce administration is clear, controlled and professionally maintained.",
  },
  {
    slug: "enterprise-governance",
    icon: Building2,
    title: "Enterprise Governance",
    desc: "Strategic governance structures and operational system consulting.",
    details: [
      "Internal control framework and governance process advisory.",
      "Operational structure review for growing enterprises.",
      "Business process documentation and compliance infrastructure.",
    ],
    whyChoose:
      "As enterprises grow, informal processes often become a constraint. Clear governance, internal controls and documented workflows help management scale with confidence and reduce dependency on individuals.",
    facsValue:
      "FACS reviews operating structures, identifies control gaps and designs practical governance processes. We help businesses improve accountability, consistency and management visibility across functions.",
    whyFacs:
      "Our governance advisory balances professional standards with real-world implementation, creating systems that people can actually use and management can actually monitor.",
  },
  {
    slug: "internal-training",
    icon: GraduationCap,
    title: "Internal Training",
    desc: "Professional accounting, finance and compliance training programs.",
    details: [
      "Accounting, taxation and compliance training for internal teams.",
      "Customized workshops based on enterprise operating models.",
      "Practical training materials for finance and administrative personnel.",
    ],
    whyChoose:
      "A capable internal team is essential for sustainable compliance and operational efficiency. Training helps reduce repeated errors, improve coordination and strengthen internal understanding of finance and compliance obligations.",
    facsValue:
      "FACS develops practical training sessions tailored to the enterprise’s actual transactions, workflows and internal roles. Our programs are designed to be clear, applicable and immediately useful for daily operations.",
    whyFacs:
      "We translate technical accounting, tax and compliance matters into business language, helping teams understand not only what to do, but why it matters.",
  },
  {
    slug: "audit-assurance-support",
    icon: FileCheck2,
    title: "Independent Audit & Audit Support",
    desc: "Independent audit coordination, audit-readiness review and practical support for financial statement audit processes.",
    details: [
      "Audit-readiness review of accounting records, supporting documents and financial statement schedules.",
      "Coordination support during independent audit fieldwork, information requests and management explanations.",
      "Post-audit follow-up support for adjustment tracking, documentation improvement and closing-file discipline.",
    ],
    whyChoose:
      "An audit process can become time-consuming and disruptive when accounting records, schedules and supporting documents are not prepared in a clear and consistent manner. Proper audit support helps management reduce delays, improve audit response quality and strengthen financial reporting discipline.",
    facsValue:
      "FACS supports enterprises before, during and after the audit process by reviewing audit readiness, preparing schedules, coordinating information flow and helping management address audit queries in a structured manner.",
    whyFacs:
      "We understand both accounting operations and audit expectations. Our role is to help clients communicate financial information clearly, reduce avoidable audit friction and build a stronger reporting foundation for future periods.",
  },
  {
    slug: "erp-consulting-implementation",
    icon: Cog,
    title: "ERP Consulting & Implementation",
    desc: "ERP selection, process design, customization and implementation support for scalable business operations.",
    details: [
      "ERP needs assessment, process mapping and system selection support for newly established or growing businesses.",
      "ERP customization and implementation coordination across accounting, inventory, purchasing, sales and reporting workflows.",
      "Data migration, user acceptance testing, go-live support and preparation of ad-hoc management reports.",
    ],
    whyChoose:
      "A poorly selected or poorly implemented ERP system can create duplicated work, unreliable reports and long-term operational inefficiency. Businesses need a practical bridge between finance, operations and system implementation.",
    facsValue:
      "FACS helps clients define system requirements, align ERP configuration with real business processes and support implementation in a practical, finance-driven manner. Our work focuses on usability, control and management visibility.",
    whyFacs:
      "We approach ERP not only as a software project, but as an operating model project. This allows us to connect accounting, tax, inventory, reporting and governance requirements into one coherent system design.",
  },
  {
    slug: "tailored-business-support",
    icon: Puzzle,
    title: "Tailored Business Support",
    desc: "Customized advisory and hands-on support for complex, urgent or non-standard accounting, tax, legal and reporting matters.",
    details: [
      "Merging two sets of books, cleaning accounting records and resolving historical bookkeeping inconsistencies.",
      "Financial statement review, tax and accounting health checks, legal document review and compliance gap assessment.",
      "Ad-hoc troubleshooting support for management reports, reconciliations, documentation gaps and operational bottlenecks.",
    ],
    whyChoose:
      "Not every business issue fits neatly into a standard service package. Companies often face urgent, historical or cross-functional problems that require accounting, tax, legal and operational perspectives at the same time.",
    facsValue:
      "FACS designs tailored support based on the client’s actual problem, available records and desired outcome. We help clarify the issue, prioritize remediation steps and deliver practical documentation, review or implementation support.",
    whyFacs:
      "Our multidisciplinary advisory model allows us to handle non-standard assignments with structure and professional judgment, helping clients move from confusion to a clear and manageable action plan.",
  },
];
