import { Banknote, Calculator, CalendarRange, Coins, Landmark, PiggyBank, ShieldCheck } from "lucide-react";

// Danh sách trang chính và tiện ích – dùng chung cho thanh menu, menu điện thoại và ô Tìm nhanh.
export function siteNavItems(isVi) {
  return [
    ["/about", isVi ? "Giới thiệu" : "About"],
    ["/services", isVi ? "Dịch vụ" : "Services", "services"],
    ["/industries", isVi ? "Lĩnh vực" : "Industries", "industries"],
    ["/insights", isVi ? "Góc nhìn" : "Insights"],
    ["/tools", isVi ? "Tiện ích" : "Resources", "resources"],
    ["/careers", isVi ? "Tuyển dụng" : "Careers"],
    ["/contact", isVi ? "Liên hệ" : "Contact"],
  ];
}

export function siteResourceItems(isVi) {
  return [
    ["/legal-calendar", isVi ? "Lịch pháp lý doanh nghiệp" : "Corporate Legal Calendar", isVi ? "Theo dõi các mốc thuế, kế toán, lao động, bảo hiểm và HSE." : "Track tax, accounting, labour, insurance and HSE deadlines.", CalendarRange],
    ["/tools/gross-net", isVi ? "Tính lương Gross – Net" : "Gross – Net Salary", isVi ? "Ước tính lương thực nhận, bảo hiểm và thuế TNCN." : "Estimate take-home pay, insurance and PIT.", Banknote],
    ["/tools/personal-income-tax", isVi ? "Tính thuế TNCN" : "Personal Income Tax", isVi ? "Tính thuế tiền lương theo biểu lũy tiến 5 bậc." : "Calculate salary tax using the five-band schedule.", Calculator],
    ["/tools/unemployment-benefit", isVi ? "Tính BHTN" : "Unemployment Benefit", isVi ? "Ước tính mức hưởng và thời gian hưởng trợ cấp." : "Estimate benefit amount and entitlement duration.", ShieldCheck],
    ["/tools/one-time-social-insurance", isVi ? "Tính BHXH một lần" : "One-time Social Insurance", isVi ? "Ước tính quyền lợi theo quá trình đóng BHXH." : "Estimate benefits from contribution history.", Landmark],
    ["/tools/savings-plan", isVi ? "Kế hoạch tiết kiệm" : "Savings Planner", isVi ? "Mô phỏng lãi kép và khoản tiết kiệm định kỳ." : "Model compound growth and recurring savings.", PiggyBank],
    ["/tools/rates-and-gold", isVi ? "Thị trường tài chính" : "Financial Markets", isVi ? "Theo dõi tỷ giá, vàng và các chỉ số chứng khoán." : "Monitor FX, gold and securities market indices.", Coins],
  ];
}
