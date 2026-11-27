// Chủ thẻ tự chỉnh thẻ danh thiếp: đăng nhập bằng email @facs.vn + mật khẩu, sửa thông tin, đổi ảnh.
// Chỉ tải khi bấm "Chỉnh sửa thẻ" để khách xem thẻ không phải tải thêm gì.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, KeyRound, LoaderCircle, LogOut, Minus, Plus, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { CARD_COLUMNS, cardPhotoUrl } from "../../lib/cardProfile";

const PHOTO_SIZE = 800;
const VIEW = 248;
const MIN_PASSWORD = 8;

function authMessage(error, isVi) {
  const msg = String(error?.message || error || "");
  const map = [
    [/invalid login credentials/i, "Email hoặc mật khẩu không đúng.", "Incorrect email or password."],
    [/email not confirmed/i, "Email chưa được xác nhận. Mở hộp thư, bấm liên kết xác nhận rồi đăng nhập lại.", "Email not confirmed yet. Open the confirmation email, then sign in."],
    [/database error saving new user|signups not allowed|not allowed/i, "Email này không được tạo tài khoản. Chỉ dùng email @facs.vn của chủ thẻ.", "This email can't create an account. Use the card owner's @facs.vn email."],
    [/already registered|already been registered/i, "Email đã có tài khoản. Hãy đăng nhập, hoặc chọn “Quên mật khẩu”.", "This email already has an account. Sign in or use “Forgot password”."],
    [/rate limit|too many|security purposes/i, "Thao tác quá nhanh. Vui lòng đợi một phút rồi thử lại.", "Too many attempts. Please wait a minute and try again."],
    [/password should be|weak password/i, `Mật khẩu cần ít nhất ${MIN_PASSWORD} ký tự, nên có chữ và số.`, `Password needs at least ${MIN_PASSWORD} characters with letters and numbers.`],
    [/failed to fetch|network/i, "Không có kết nối mạng. Vui lòng thử lại.", "No connection. Please try again."],
  ];
  const hit = map.find(([re]) => re.test(msg));
  return hit ? (isVi ? hit[1] : hit[2]) : msg || (isVi ? "Có lỗi xảy ra. Vui lòng thử lại." : "Something went wrong. Please try again.");
}

/** Cắt ảnh vuông: kéo để căn, trượt để phóng to. Xuất JPEG 800×800. */
function PhotoCropper({ file, isVi, onDone, onCancel }) {
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () => onCancel(isVi ? "Không đọc được ảnh này. Hãy chọn ảnh JPG hoặc PNG." : "Couldn't read this image. Please choose a JPG or PNG.");
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, isVi, onCancel]);

  const base = img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const scale = base * zoom;
  const w = img ? img.naturalWidth * scale : 0;
  const h = img ? img.naturalHeight * scale : 0;
  const clamp = useCallback(
    (o, s = scale) => {
      if (!img) return o;
      const mx = Math.max(0, (img.naturalWidth * s - VIEW) / 2);
      const my = Math.max(0, (img.naturalHeight * s - VIEW) / 2);
      return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
    },
    [img, scale],
  );

  const setZoomClamped = (z) => {
    const nz = Math.min(3, Math.max(1, z));
    setZoom(nz);
    setOffset((o) => clamp(o, base * nz));
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, o: offset };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const d = drag.current;
    setOffset(clamp({ x: d.o.x + e.clientX - d.x, y: d.o.y + e.clientY - d.y }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const confirm = () => {
    if (!img) return;
    const left = VIEW / 2 - w / 2 + offset.x;
    const top = VIEW / 2 - h / 2 + offset.y;
    const canvas = document.createElement("canvas");
    canvas.width = PHOTO_SIZE;
    canvas.height = PHOTO_SIZE;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, -left / scale, -top / scale, VIEW / scale, VIEW / scale, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
    canvas.toBlob((blob) => (blob ? onDone(blob) : onCancel(isVi ? "Không xử lý được ảnh." : "Couldn't process the photo.")), "image/jpeg", 0.88);
  };

  return (
    <div className="cedit-crop">
      <div
        className="cedit-crop__view"
        style={{ width: VIEW, height: VIEW }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => setZoomClamped(zoom - e.deltaY * 0.0015)}
      >
        {img ? (
          <img
            src={img.src}
            alt=""
            draggable={false}
            style={{ width: w, height: h, transform: `translate(${VIEW / 2 - w / 2 + offset.x}px, ${VIEW / 2 - h / 2 + offset.y}px)` }}
          />
        ) : (
          <LoaderCircle className="cedit-spin" size={26} />
        )}
        <span className="cedit-crop__ring" aria-hidden="true" />
      </div>
      <div className="cedit-crop__zoom">
        <button type="button" className="hdr-tool" onClick={() => setZoomClamped(zoom - 0.2)} aria-label={isVi ? "Thu nhỏ" : "Zoom out"}><Minus size={16} /></button>
        <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoomClamped(Number(e.target.value))} aria-label={isVi ? "Phóng to ảnh" : "Zoom"} />
        <button type="button" className="hdr-tool" onClick={() => setZoomClamped(zoom + 0.2)} aria-label={isVi ? "Phóng to" : "Zoom in"}><Plus size={16} /></button>
      </div>
      <p className="dcard__muted">{isVi ? "Kéo ảnh để căn giữa khuôn mặt trong vòng tròn." : "Drag to center your face inside the circle."}</p>
      <div className="cedit-actions">
        <button type="button" className="dcard__chipbtn" onClick={() => onCancel("")}>{isVi ? "Hủy" : "Cancel"}</button>
        <button type="button" className="site-cta cedit-primary" onClick={confirm} disabled={!img}><Check size={16} /> {isVi ? "Dùng ảnh này" : "Use this photo"}</button>
      </div>
    </div>
  );
}

const toForm = (p) => ({
  name: p.name || "",
  titleVi: p.titleVi || "",
  title: p.title || "",
  roleVi: p.roleVi || "",
  role: p.role || "",
  phone: p.phone || "",
  email: p.email || "",
  credentialsVi: (p.credentialsVi || []).join(", "),
  credentials: (p.credentials || []).join(", "),
});
const splitList = (v) => v.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

function validate(f, isVi) {
  if (f.name.trim().length < 2 || f.name.trim().length > 80) return isVi ? "Họ và tên cần từ 2 đến 80 ký tự." : "Name must be 2–80 characters.";
  if (!/^[0-9+() .-]{8,24}$/.test(f.phone.trim())) return isVi ? "Số điện thoại chưa đúng (ví dụ 0971 268 298)." : "Phone number looks invalid (e.g. 0971 268 298).";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return isVi ? "Email liên hệ chưa đúng." : "Contact email looks invalid.";
  for (const k of ["titleVi", "title", "roleVi", "role"]) if (f[k].length > 140) return isVi ? "Chức danh tối đa 140 ký tự." : "Titles can be up to 140 characters.";
  for (const k of ["credentialsVi", "credentials"]) {
    const items = splitList(f[k]);
    if (items.length > 10 || items.some((x) => x.length > 40)) return isVi ? "Tối đa 10 chứng chỉ, mỗi mục tối đa 40 ký tự." : "Up to 10 credentials, 40 characters each.";
  }
  return "";
}

export default function CardEditor({ slug, isVi, person, row, initialMode, onSaved }) {
  const [session, setSession] = useState(undefined);
  const [access, setAccess] = useState({ user: null, ok: false });
  const [mode, setMode] = useState(initialMode || "login"); // login | signup | forgot | edit | password | sent
  const [email, setEmail] = useState(person.email || "");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(() => toForm(person));
  const [cropFile, setCropFile] = useState(null);
  const [photoBlob, setPhotoBlob] = useState(null);
  const fileInput = useRef(null);
  const cardHome = `${window.location.origin}/card/${slug}`;

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => alive && setSession(data.session || null));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (!alive) return;
      setSession(next || null);
      if (event === "PASSWORD_RECOVERY") setMode("password");
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user?.id || null;
  const canEdit = userId && access.user === userId ? access.ok : null;
  useEffect(() => {
    if (!userId) return undefined;
    let alive = true;
    supabase.rpc("card_can_edit", { p_slug: slug }).then(({ data, error: e }) => {
      if (!alive) return;
      setAccess({ user: userId, ok: !e && data === true });
      setMode((m) => (m === "password" ? m : "edit"));
    });
    return () => {
      alive = false;
    };
  }, [userId, slug]);

  const photoPreview = useMemo(() => (photoBlob ? URL.createObjectURL(photoBlob) : ""), [photoBlob]);
  useEffect(() => () => photoPreview && URL.revokeObjectURL(photoPreview), [photoPreview]);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(authMessage(e, isVi));
    } finally {
      setBusy(false);
    }
  };

  const signIn = (e) => {
    e.preventDefault();
    run(async () => {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (err) throw err;
      setPassword("");
    });
  };

  const signUp = (e) => {
    e.preventDefault();
    run(async () => {
      if (password.length < MIN_PASSWORD) throw new Error("password should be");
      if (password !== password2) throw new Error(isVi ? "Hai mật khẩu chưa khớp nhau." : "Passwords don't match.");
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo: `${cardHome}?confirmed=1` },
      });
      // Email ngoài danh sách được phép: máy chủ từ chối tạo tài khoản (lỗi 500 "Database error saving new user").
      if (err) throw err.status >= 500 ? new Error("database error saving new user") : err;
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error("already registered");
      setPassword("");
      setPassword2("");
      if (!data.session) {
        setNotice(
          isVi
            ? `Đã gửi email xác nhận tới ${email.trim()}. Mở email, bấm “Xác nhận”, rồi quay lại đây đăng nhập bằng mật khẩu vừa tạo.`
            : `A confirmation email was sent to ${email.trim()}. Open it, tap “Confirm”, then come back and sign in with your new password.`,
        );
        setMode("sent");
      }
    });
  };

  const forgot = (e) => {
    e.preventDefault();
    run(async () => {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${cardHome}?reset=1` });
      if (err) throw err;
      setNotice(
        isVi
          ? `Nếu ${email.trim()} có tài khoản, email đặt lại mật khẩu đã được gửi. Bấm liên kết trong email để đặt mật khẩu mới.`
          : `If ${email.trim()} has an account, a reset email is on its way. Use the link inside to set a new password.`,
      );
      setMode("sent");
    });
  };

  const changePassword = (e) => {
    e.preventDefault();
    run(async () => {
      if (password.length < MIN_PASSWORD) throw new Error("password should be");
      if (password !== password2) throw new Error(isVi ? "Hai mật khẩu chưa khớp nhau." : "Passwords don't match.");
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setPassword("");
      setPassword2("");
      setMode("edit");
      setNotice(isVi ? "Đã đổi mật khẩu." : "Password updated.");
    });
  };

  const signOut = () => run(async () => {
    await supabase.auth.signOut();
    setMode("login");
  });

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError(isVi ? "Vui lòng chọn tệp ảnh." : "Please choose an image file.");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setError(isVi ? "Ảnh quá lớn (tối đa 25 MB)." : "Image is too large (max 25 MB).");
      return;
    }
    setError("");
    setCropFile(f);
  };

  const save = (e) => {
    e.preventDefault();
    const problem = validate(form, isVi);
    if (problem) {
      setError(problem);
      return;
    }
    run(async () => {
      let photoPath = row?.photo_path ?? null;
      const oldPath = row?.photo_path || null;
      if (photoBlob) {
        const path = `${slug}/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from("card-photos").upload(path, photoBlob, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: false,
        });
        if (upErr) throw upErr;
        photoPath = path;
      }
      const { data, error: err } = await supabase
        .from("digital_cards")
        .update({
          name: form.name.trim(),
          title_vi: form.titleVi.trim(),
          title_en: form.title.trim(),
          role_vi: form.roleVi.trim(),
          role_en: form.role.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          credentials_vi: splitList(form.credentialsVi),
          credentials_en: splitList(form.credentials),
          photo_path: photoPath,
        })
        .eq("slug", slug)
        .select(CARD_COLUMNS)
        .single();
      if (err) throw err;
      if (photoBlob && oldPath && oldPath !== photoPath) supabase.storage.from("card-photos").remove([oldPath]).catch(() => {});
      setPhotoBlob(null);
      onSaved(data);
      setNotice(isVi ? "Đã lưu. Thẻ đã cập nhật – khách quét QR sẽ thấy thông tin mới ngay." : "Saved. Your card is updated – anyone scanning the QR sees it right away.");
    });
  };

  const field = (key, label, props = {}) => (
    <label className="cedit-field">
      <span>{label}</span>
      <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} {...props} />
    </label>
  );

  const banner = (
    <>
      {error && <p className="cedit-msg cedit-msg--error" role="alert">{error}</p>}
      {notice && <p className="cedit-msg cedit-msg--ok" role="status">{notice}</p>}
    </>
  );

  if (!supabase) {
    return <p className="dcard__muted">{isVi ? "Chức năng chỉnh sửa chưa được cấu hình." : "Editing is not configured."}</p>;
  }

  if (session === undefined) {
    return <div className="cedit-loading"><LoaderCircle className="cedit-spin" size={26} /></div>;
  }

  // Đặt mật khẩu mới (từ email quên mật khẩu, hoặc tự đổi khi đã đăng nhập)
  if (session && mode === "password") {
    return (
      <form className="cedit" onSubmit={changePassword}>
        <div className="dcard-sheet__name"><KeyRound size={20} aria-hidden="true" /> {isVi ? "Đặt mật khẩu mới" : "Set a new password"}</div>
        <p className="dcard__muted">{session.user.email}</p>
        <label className="cedit-field"><span>{isVi ? "Mật khẩu mới" : "New password"}</span><input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={MIN_PASSWORD} required /></label>
        <label className="cedit-field"><span>{isVi ? "Nhập lại mật khẩu" : "Repeat password"}</span><input type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} minLength={MIN_PASSWORD} required /></label>
        {banner}
        <div className="cedit-actions">
          <button type="button" className="dcard__chipbtn" onClick={() => setMode("edit")}>{isVi ? "Để sau" : "Later"}</button>
          <button type="submit" className="site-cta cedit-primary" disabled={busy}>{busy ? <LoaderCircle className="cedit-spin" size={16} /> : <Check size={16} />} {isVi ? "Lưu mật khẩu" : "Save password"}</button>
        </div>
      </form>
    );
  }

  // Đã đăng nhập
  if (session) {
    if (canEdit === null) return <div className="cedit-loading"><LoaderCircle className="cedit-spin" size={26} /></div>;
    if (!canEdit) {
      return (
        <div className="cedit">
          <div className="dcard-sheet__name">{isVi ? "Không có quyền chỉnh thẻ này" : "You can't edit this card"}</div>
          <p className="dcard__muted">
            {isVi
              ? `Bạn đang đăng nhập bằng ${session.user.email}. Mỗi tài khoản chỉ chỉnh được thẻ của chính mình.`
              : `You're signed in as ${session.user.email}. Each account can only edit its own card.`}
          </p>
          {banner}
          <div className="cedit-actions">
            <button type="button" className="dcard__chipbtn" onClick={signOut} disabled={busy}><LogOut size={15} /> {isVi ? "Đăng xuất" : "Sign out"}</button>
          </div>
        </div>
      );
    }
    if (cropFile) {
      return (
        <PhotoCropper
          file={cropFile}
          isVi={isVi}
          onDone={(blob) => {
            setPhotoBlob(blob);
            setCropFile(null);
          }}
          onCancel={(msg) => {
            setCropFile(null);
            if (msg) setError(msg);
          }}
        />
      );
    }
    return (
      <form className="cedit" onSubmit={save}>
        <div className="dcard-sheet__name">{isVi ? "Chỉnh sửa thẻ của bạn" : "Edit your card"}</div>
        <div className="cedit-photo">
          <img src={photoPreview || cardPhotoUrl(slug, row)} alt="" onError={(e) => { e.currentTarget.src = `/card/${slug}.jpg`; }} />
          <button type="button" className="dcard__chipbtn" onClick={() => fileInput.current?.click()}>
            <Camera size={15} /> {isVi ? "Đổi ảnh" : "Change photo"}
          </button>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={pickFile} />
          {photoBlob && <span className="cedit-pill">{isVi ? "Ảnh mới – bấm Lưu để áp dụng" : "New photo – press Save to apply"}</span>}
        </div>
        {field("name", isVi ? "Họ và tên" : "Full name", { autoComplete: "name", required: true, maxLength: 80 })}
        <div className="cedit-grid">
          {field("titleVi", isVi ? "Chức danh (tiếng Việt)" : "Title (Vietnamese)", { maxLength: 140 })}
          {field("title", isVi ? "Chức danh (tiếng Anh)" : "Title (English)", { maxLength: 140 })}
          {field("roleVi", isVi ? "Vai trò (tiếng Việt)" : "Role (Vietnamese)", { maxLength: 140 })}
          {field("role", isVi ? "Vai trò (tiếng Anh)" : "Role (English)", { maxLength: 140 })}
          {field("phone", isVi ? "Số điện thoại" : "Phone", { type: "tel", inputMode: "tel", autoComplete: "tel", required: true, maxLength: 24 })}
          {field("email", isVi ? "Email liên hệ" : "Contact email", { type: "email", autoComplete: "email", required: true, maxLength: 120 })}
          {field("credentialsVi", isVi ? "Chứng chỉ (tiếng Việt)" : "Credentials (Vietnamese)", { placeholder: "MBA, CPA, ACCA" })}
          {field("credentials", isVi ? "Chứng chỉ (tiếng Anh)" : "Credentials (English)", { placeholder: "MBA, CPA, ACCA" })}
        </div>
        <p className="cedit-hint">{isVi ? "Chứng chỉ cách nhau bằng dấu phẩy. Mã QR và đường dẫn thẻ giữ nguyên." : "Separate credentials with commas. Your QR code and card link stay the same."}</p>
        {banner}
        <div className="cedit-actions">
          <button type="submit" className="site-cta cedit-primary" disabled={busy}>
            {busy ? <LoaderCircle className="cedit-spin" size={16} /> : <Check size={16} />} {isVi ? "Lưu thay đổi" : "Save changes"}
          </button>
        </div>
        <div className="cedit-account">
          <span><ShieldCheck size={14} aria-hidden="true" /> {session.user.email}</span>
          <button type="button" onClick={() => { setError(""); setNotice(""); setMode("password"); }}>{isVi ? "Đổi mật khẩu" : "Change password"}</button>
          <button type="button" onClick={signOut} disabled={busy}>{isVi ? "Đăng xuất" : "Sign out"}</button>
        </div>
      </form>
    );
  }

  // Chưa đăng nhập
  if (mode === "sent") {
    return (
      <div className="cedit">
        <div className="dcard-sheet__name">{isVi ? "Kiểm tra hộp thư" : "Check your inbox"}</div>
        {banner}
        <div className="cedit-actions">
          <button type="button" className="site-cta cedit-primary" onClick={() => { setNotice(""); setMode("login"); }}>{isVi ? "Về trang đăng nhập" : "Back to sign in"}</button>
        </div>
      </div>
    );
  }

  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  return (
    <form className="cedit" onSubmit={isSignup ? signUp : isForgot ? forgot : signIn}>
      <div className="dcard-sheet__name">
        {isSignup ? (isVi ? "Tạo mật khẩu lần đầu" : "Create your password") : isForgot ? (isVi ? "Quên mật khẩu" : "Forgot password") : isVi ? "Đăng nhập để chỉnh thẻ" : "Sign in to edit your card"}
      </div>
      <p className="dcard__muted">
        {isSignup
          ? isVi ? "Dùng email @facs.vn của bạn. Hệ thống sẽ gửi email xác nhận một lần." : "Use your @facs.vn email. We'll send a one-time confirmation email."
          : isForgot
            ? isVi ? "Nhập email, hệ thống gửi liên kết đặt mật khẩu mới." : "Enter your email and we'll send a reset link."
            : isVi ? "Dành cho chủ thẻ. Mỗi người chỉ chỉnh được thẻ của mình." : "For the card owner. Each person can only edit their own card."}
      </p>
      <label className="cedit-field"><span>Email</span><input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      {!isForgot && (
        <label className="cedit-field"><span>{isVi ? "Mật khẩu" : "Password"}</span><input type="password" autoComplete={isSignup ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={isSignup ? MIN_PASSWORD : undefined} /></label>
      )}
      {isSignup && (
        <label className="cedit-field"><span>{isVi ? "Nhập lại mật khẩu" : "Repeat password"}</span><input type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} required minLength={MIN_PASSWORD} /></label>
      )}
      {banner}
      <div className="cedit-actions">
        <button type="submit" className="site-cta cedit-primary" disabled={busy}>
          {busy && <LoaderCircle className="cedit-spin" size={16} />}
          {isSignup ? (isVi ? "Tạo mật khẩu" : "Create password") : isForgot ? (isVi ? "Gửi liên kết" : "Send link") : isVi ? "Đăng nhập" : "Sign in"}
        </button>
      </div>
      <div className="cedit-switch">
        {mode !== "login" && <button type="button" onClick={() => { setError(""); setMode("login"); }}>{isVi ? "Đã có mật khẩu? Đăng nhập" : "Have a password? Sign in"}</button>}
        {mode !== "signup" && <button type="button" onClick={() => { setError(""); setMode("signup"); }}>{isVi ? "Lần đầu sử dụng? Tạo mật khẩu" : "First time? Create a password"}</button>}
        {mode !== "forgot" && <button type="button" onClick={() => { setError(""); setMode("forgot"); }}>{isVi ? "Quên mật khẩu" : "Forgot password"}</button>}
      </div>
    </form>
  );
}
