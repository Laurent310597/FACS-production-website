// Kiểm thử logic thuần của FACS Hub Content Studio:  npm run qa:hub
import assert from "node:assert/strict";
import test from "node:test";
import { buildUserMessage, htmlToText, HUB_RESPONSE_SCHEMA, normalizeOutputs, validateSourceUrl } from "../supabase/functions/_shared/hub-content.ts";

test("chặn link nội bộ, không https, có thông tin đăng nhập", () => {
  for (const bad of [
    "http://example.com/a", "https://localhost/x", "https://127.0.0.1/", "https://10.0.0.5/a", "https://169.254.169.254/latest/meta-data",
    "https://[::1]/", "https://2130706433/", "https://0x7f.1/", "https://user:pw@example.com/", "https://example.com:8443/", "https://intranet/",
    "https://db.internal/x", "file:///etc/passwd", "khong-phai-link",
  ]) assert.throws(() => validateSourceUrl(bad), undefined, bad);
  assert.equal(validateSourceUrl(" https://thuvienphapluat.vn/bai-viet?id=1 ").hostname, "thuvienphapluat.vn");
});

test("rút văn bản từ HTML, bỏ script/nav, giải mã ký tự", () => {
  const filler = "<p>Nội dung chi tiết của bài viết về thuế giá trị gia tăng. </p>".repeat(15);
  const { title, text } = htmlToText(`<html><head><title>Thu&#7871; GTGT &amp; h&#243;a &#273;&#417;n</title><style>p{}</style></head>
    <body><nav>Menu chính</nav><script>alert(1)</script><article><h1>Tiêu đề</h1>${filler}<p>Hạn nộp: 31/01&nbsp;2027</p></article><footer>Chân trang</footer></body></html>`);
  assert.equal(title, "Thuế GTGT & hóa đơn");
  assert.ok(text.includes("Hạn nộp: 31/01 2027"));
  assert.ok(!text.includes("alert(1)") && !text.includes("Menu chính") && !text.includes("Chân trang"));
});

test("chuẩn hóa đầu ra và thông điệp gửi AI", () => {
  assert.deepEqual(normalizeOutputs(["linkedin", "hack", "website"]), ["website", "linkedin"]);
  assert.deepEqual(normalizeOutputs(null), ["website"]);
  const msg = buildUserMessage({ outputs: ["facebook"], brief: "Viết ngắn", pastedText: "", sources: [{ url: "https://a.vn/x", title: 'A "B"', text: "x".repeat(20000) }] });
  assert.ok(msg.includes("CÁC ĐẦU RA CẦN TẠO: facebook") && msg.includes("tieu_de=\"A 'B'\""));
  assert.ok(msg.length < 15000);
});

test("schema hợp lệ cho chế độ strict của OpenAI", () => {
  const check = (node, path) => {
    if (node.type === "object") {
      assert.equal(node.additionalProperties, false, path);
      assert.deepEqual([...node.required].sort(), Object.keys(node.properties).sort(), path);
      for (const [k, v] of Object.entries(node.properties)) check(v, `${path}.${k}`);
    } else if (node.type === "array") check(node.items, `${path}[]`);
  };
  check(HUB_RESPONSE_SCHEMA.schema, "root");
});
