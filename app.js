const TABLE = "customers";
const VALID_STATUSES = ["Chưa thu", "Đã thu", "Hẹn lại", "Khó thu"];

let supabaseClient = null;
let currentUser = null;
let customers = [];

const $ = (id) => document.getElementById(id);

const setupBox = $("setupBox");
const authBox = $("authBox");
const appBox = $("appBox");
const userEmail = $("userEmail");
const logoutBtn = $("logoutBtn");
const customerList = $("customerList");
const searchInput = $("searchInput");
const areaFilter = $("areaFilter");
const statusFilter = $("statusFilter");
const dialog = $("customerDialog");
const form = $("customerForm");
const formTitle = $("formTitle");

const fields = {
  id: $("customerId"),
  area: $("area"),
  unitName: $("unitName"),
  diaBanC3: $("diaBanC3"),
  maNvtc: $("maNvtc"),
  collectorName: $("collectorName"),
  customerCode: $("customerCode"),
  paymentId: $("paymentId"),
  phone: $("phone"),
  address: $("address"),
  serviceName: $("serviceName"),
  managementUnitId: $("managementUnitId"),
  amountDue: $("amountDue"),
  debtCycle: $("debtCycle"),
  status: $("status"),
  note: $("note")
};

init();

async function init() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY ||
      window.SUPABASE_URL.includes("PASTE_") ||
      window.SUPABASE_ANON_KEY.includes("PASTE_")) {
    setupBox.classList.remove("hidden");
    authBox.classList.add("hidden");
    return;
  }

  supabaseClient = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  bindEvents();

  const { data } = await supabaseClient.auth.getSession();
  if (data.session?.user) {
    currentUser = data.session.user;
    await showApp();
  } else {
    showAuth();
  }

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    if (currentUser) await showApp();
    else showAuth();
  });
}

function bindEvents() {
  $("loginBtn").addEventListener("click", login);
  $("signupBtn").addEventListener("click", signup);
  logoutBtn.addEventListener("click", logout);
  $("addCustomerBtn").addEventListener("click", () => openForm());
  $("cancelBtn").addEventListener("click", () => dialog.close());
  $("importFile").addEventListener("change", importFile);
  $("downloadTemplateBtn").addEventListener("click", downloadTemplate);
  $("exportBtn").addEventListener("click", exportCSV);
  $("reloadBtn").addEventListener("click", loadCustomers);
  searchInput.addEventListener("input", render);
  areaFilter.addEventListener("change", render);
  statusFilter.addEventListener("change", render);

  form.addEventListener("submit", saveCustomer);
}

async function login() {
  const email = $("emailInput").value.trim();
  const password = $("passwordInput").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) alert("Đăng nhập lỗi: " + error.message);
}

async function signup() {
  const email = $("emailInput").value.trim();
  const password = $("passwordInput").value;
  if (!email || !password) {
    alert("Nhập email và mật khẩu trước khi tạo tài khoản.");
    return;
  }
  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) alert("Tạo tài khoản lỗi: " + error.message);
  else alert("Đã tạo tài khoản. Nếu Supabase bật xác thực email, vui lòng kiểm tra hộp thư.");
}

async function logout() {
  await supabaseClient.auth.signOut();
}

function showAuth() {
  authBox.classList.remove("hidden");
  appBox.classList.add("hidden");
  logoutBtn.classList.add("hidden");
  userEmail.textContent = "";
}

async function showApp() {
  authBox.classList.add("hidden");
  appBox.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  userEmail.textContent = currentUser.email || "";
  await loadCustomers();
}

async function loadCustomers() {
  const { data, error } = await supabaseClient
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    alert("Không tải được dữ liệu. Kiểm tra đã chạy file supabase-schema.sql chưa.\n\n" + error.message);
    return;
  }

  customers = data || [];
  updateAreaFilter();
  render();
}

function updateAreaFilter() {
  const current = areaFilter.value;
  const areas = [...new Set(customers.map(c => c.area).filter(Boolean))].sort();
  areaFilter.innerHTML = `<option value="all">Tất cả Ô địa bàn</option>` +
    areas.map(a => `<option value="${escapeHTML(a)}">${escapeHTML(a)}</option>`).join("");
  if ([...areaFilter.options].some(o => o.value === current)) areaFilter.value = current;
}

async function saveCustomer() {
  const payload = {
    area: fields.area.value.trim(),
    unit_name: fields.unitName.value.trim(),
    dia_ban_c3: fields.diaBanC3.value.trim(),
    ma_nvtc: fields.maNvtc.value.trim(),
    collector_name: fields.collectorName.value.trim(),
    customer_code: fields.customerCode.value.trim(),
    payment_id: fields.paymentId.value.trim(),
    phone: normalizePhone(fields.phone.value.trim()),
    address: fields.address.value.trim(),
    service_name: fields.serviceName.value.trim(),
    management_unit_id: fields.managementUnitId.value.trim(),
    amount_due: cleanAmount(fields.amountDue.value),
    debt_cycle: fields.debtCycle.value.trim(),
    status: normalizeStatus(fields.status.value),
    note: fields.note.value.trim()
  };

  if (!payload.customer_code && !payload.phone) {
    alert("Cần nhập tối thiểu MA_KH hoặc SDT_GBC.");
    return;
  }

  const id = fields.id.value;
  const query = id
    ? supabaseClient.from(TABLE).update(payload).eq("id", id)
    : supabaseClient.from(TABLE).insert(payload);

  const { error } = await query;
  if (error) {
    alert("Lưu lỗi: " + error.message);
    return;
  }

  dialog.close();
  await loadCustomers();
}

window.openForm = function(id = "") {
  form.reset();
  fields.id.value = "";
  fields.status.value = "Chưa thu";

  if (id) {
    const c = customers.find(x => x.id === id);
    if (!c) return;
    formTitle.textContent = "Sửa khách hàng";
    fields.id.value = c.id;
    fields.area.value = c.area || "";
    fields.unitName.value = c.unit_name || "";
    fields.diaBanC3.value = c.dia_ban_c3 || "";
    fields.maNvtc.value = c.ma_nvtc || "";
    fields.collectorName.value = c.collector_name || "";
    fields.customerCode.value = c.customer_code || "";
    fields.paymentId.value = c.payment_id || "";
    fields.phone.value = c.phone || "";
    fields.address.value = c.address || "";
    fields.serviceName.value = c.service_name || "";
    fields.managementUnitId.value = c.management_unit_id || "";
    fields.amountDue.value = c.amount_due || 0;
    fields.debtCycle.value = c.debt_cycle || "";
    fields.status.value = c.status || "Chưa thu";
    fields.note.value = c.note || "";
  } else {
    formTitle.textContent = "Thêm khách hàng";
  }

  dialog.showModal();
};

window.quickStatus = async function(id, status) {
  const payload = { status: normalizeStatus(status) };
  if (payload.status === "Đã thu") payload.collected_at = new Date().toISOString();

  const { error } = await supabaseClient.from(TABLE).update(payload).eq("id", id);
  if (error) alert("Cập nhật lỗi: " + error.message);
  else await loadCustomers();
};

window.deleteCustomer = async function(id) {
  if (!confirm("Xóa khách hàng này khỏi database?")) return;
  const { error } = await supabaseClient.from(TABLE).delete().eq("id", id);
  if (error) alert("Xóa lỗi: " + error.message);
  else await loadCustomers();
};

function getFilteredCustomers() {
  const keyword = normalizeText(searchInput.value);
  const area = areaFilter.value;
  const status = statusFilter.value;

  return customers.filter(c => {
    const text = [
      c.area, c.unit_name, c.dia_ban_c3, c.ma_nvtc, c.collector_name,
      c.customer_code, c.payment_id, c.phone, c.address, c.service_name,
      c.management_unit_id, c.amount_due, c.debt_cycle, c.status, c.note
    ].join(" ");

    const matchKeyword = normalizeText(text).includes(keyword);
    const matchArea = area === "all" || c.area === area;
    const matchStatus = status === "all" || c.status === status;
    return matchKeyword && matchArea && matchStatus;
  });
}

function renderDashboard(data) {
  const paid = data.filter(c => c.status === "Đã thu");
  const unpaid = data.filter(c => c.status === "Chưa thu" || c.status === "Khó thu");
  const promise = data.filter(c => c.status === "Hẹn lại");

  $("totalCount").textContent = data.length;
  $("paidCount").textContent = paid.length;
  $("paidMoney").textContent = formatMoney(paid.reduce((s, c) => s + Number(c.amount_due || 0), 0));
  $("unpaidCount").textContent = unpaid.length;
  $("unpaidMoney").textContent = formatMoney(unpaid.reduce((s, c) => s + Number(c.amount_due || 0), 0));
  $("promiseCount").textContent = promise.length;
}

function render() {
  const data = getFilteredCustomers();
  renderDashboard(data);

  if (data.length === 0) {
    customerList.innerHTML = `<div class="empty">Không có khách hàng phù hợp.</div>`;
    return;
  }

  customerList.innerHTML = data.map(c => {
    const phone = encodeURIComponent(c.phone || "");
    const address = encodeURIComponent(c.address || "");
    const sms = encodeURIComponent(
      `VNPT xin thông báo mã KH ${c.customer_code || ""} hiện còn cước ${formatMoney(c.amount_due)} chu kỳ ${c.debt_cycle || ""}. Quý khách vui lòng thanh toán để đảm bảo dịch vụ hoạt động liên tục. Xin cảm ơn Quý khách.`
    );

    return `
      <article class="customer-card">
        <div class="customer-top">
          <div>
            <h3>${escapeHTML(c.service_name || c.customer_code || "Khách hàng")}</h3>
            <p>${escapeHTML(c.phone || "Chưa có SĐT")} • MA_KH: ${escapeHTML(c.customer_code || "Chưa có")}</p>
          </div>
          <span class="badge ${statusClass(c.status)}">${escapeHTML(c.status || "Chưa thu")}</span>
        </div>

        <div class="customer-info">
          <div><b>Ô địa bàn:</b> ${escapeHTML(c.area || "")}</div>
          <div><b>Địa bàn c3:</b> ${escapeHTML(c.dia_ban_c3 || "")}</div>
          <div><b>Người gạch:</b> ${escapeHTML(c.collector_name || "")}</div>
          <div><b>MA_NVTC:</b> ${escapeHTML(c.ma_nvtc || "")}</div>
          <div><b>THANHTOAN_ID:</b> ${escapeHTML(c.payment_id || "")}</div>
          <div><b>TONGNO:</b> <b>${formatMoney(c.amount_due)}</b></div>
          <div><b>CHUKYNO:</b> ${escapeHTML(c.debt_cycle || "")}</div>
          <div><b>Tên đơn vị:</b> ${escapeHTML(c.unit_name || "")}</div>
          <div style="grid-column: 1/-1;"><b>Địa chỉ:</b> ${escapeHTML(c.address || "")}</div>
          <div style="grid-column: 1/-1;"><b>Ghi chú:</b> ${escapeHTML(c.note || "Không có")}</div>
        </div>

        <div class="customer-actions">
          <a class="btn-link" href="tel:${phone}">Gọi</a>
          <a class="btn-link" target="_blank" href="https://zalo.me/${phone}">Zalo</a>
          <a class="btn-link" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${address}">Bản đồ</a>
          <a class="btn-link" href="sms:${phone}?&body=${sms}">SMS</a>
          <button onclick="quickStatus('${c.id}', 'Đã thu')">Đã thu</button>
          <button onclick="quickStatus('${c.id}', 'Hẹn lại')">Hẹn lại</button>
          <button onclick="openForm('${c.id}')">Sửa</button>
          <button class="danger" onclick="deleteCustomer('${c.id}')">Xóa</button>
        </div>
      </article>
    `;
  }).join("");
}

function statusClass(status) {
  if (status === "Đã thu") return "paid";
  if (status === "Hẹn lại") return "promise";
  if (status === "Khó thu") return "hard";
  return "unpaid";
}

function normalizeText(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizePhone(phone) {
  let p = String(phone || "").trim().replace(/[^\d+]/g, "");
  if (p.startsWith("+84")) p = "0" + p.slice(3);
  if (p.startsWith("84") && p.length >= 11) p = "0" + p.slice(2);
  return p;
}

function cleanAmount(value) {
  return Number(String(value || "").replace(/[^\d.-]/g, "")) || 0;
}

function normalizeStatus(status) {
  const s = normalizeText(status);
  if (s.includes("da thu") || s === "paid") return "Đã thu";
  if (s.includes("hen") || s === "promise") return "Hẹn lại";
  if (s.includes("kho") || s === "hard") return "Khó thu";
  return "Chưa thu";
}

function formatMoney(number) {
  return Number(number || 0).toLocaleString("vi-VN") + "đ";
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getValue(row, keys) {
  const normalized = {};
  Object.keys(row).forEach(k => normalized[normalizeText(k).replaceAll("_", "").replaceAll(" ", "")] = row[k]);

  for (const key of keys) {
    const k = normalizeText(key).replaceAll("_", "").replaceAll(" ", "");
    if (Object.prototype.hasOwnProperty.call(normalized, k)) return normalized[k];
  }
  return "";
}

async function importFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const rows = await readWorkbookRows(file);
    if (!rows.length) {
      alert("File không có dữ liệu.");
      return;
    }

    const imported = rows.map(row => ({
      area: String(getValue(row, ["Ô địa bàn", "O dia ban", "area"]) || "").trim(),
      unit_name: String(getValue(row, ["Tên đơn vị", "Ten don vi"]) || "").trim(),
      dia_ban_c3: String(getValue(row, ["Địa bàn c3", "Dia ban c3"]) || "").trim(),
      ma_nvtc: String(getValue(row, ["MA_NVTC", "Ma nvtc"]) || "").trim(),
      collector_name: String(getValue(row, ["TENNGUOIGACH", "Ten nguoi gach"]) || "").trim(),
      customer_code: String(getValue(row, ["MA_KH", "Ma kh", "Mã KH"]) || "").trim(),
      payment_id: String(getValue(row, ["THANHTOAN_ID", "Thanh toan id"]) || "").trim(),
      phone: normalizePhone(getValue(row, ["SDT_GBC", "So dien thoai", "SĐT"])),
      address: String(getValue(row, ["DIACHI_TT", "Dia chi tt", "Địa chỉ"]) || "").trim(),
      service_name: String(getValue(row, ["TEN_TT", "Ten tt", "Tên thuê bao"]) || "").trim(),
      management_unit_id: String(getValue(row, ["DONVIQL_ID", "Don vi ql id"]) || "").trim(),
      amount_due: cleanAmount(getValue(row, ["TONGNO", "Tong no", "Tổng nợ"])),
      debt_cycle: String(getValue(row, ["CHUKYNO", "Chu ky no", "Chu kỳ nợ"]) || "").trim(),
      status: "Chưa thu",
      note: ""
    })).filter(c => c.customer_code || c.phone || c.payment_id);

    if (!imported.length) {
      alert("Không đọc được dòng hợp lệ. Cần có MA_KH, SDT_GBC hoặc THANHTOAN_ID.");
      return;
    }

    if (!confirm(`Đã đọc ${imported.length} dòng. Bấm OK để lưu lên Supabase Database.`)) return;

    const chunks = chunk(imported, 500);
    for (const part of chunks) {
      const { error } = await supabaseClient.from(TABLE).insert(part);
      if (error) throw error;
    }

    alert(`Đã nhập thành công ${imported.length} khách hàng lên database.`);
    await loadCustomers();
  } catch (error) {
    console.error(error);
    alert("Nhập file lỗi: " + error.message);
  } finally {
    event.target.value = "";
  }
}

function readWorkbookRows(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const firstSheet = wb.SheetNames[0];
        const sheet = wb.Sheets[firstSheet];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

function downloadTemplate() {
  const rows = [
    {
      "Ô địa bàn": "Quảng Lập",
      "Tên đơn vị": "VNPT Địa bàn Quảng Lập",
      "Địa bàn c3": "Quảng Lập",
      "MA_NVTC": "NV001",
      "TENNGUOIGACH": "Nguyễn Văn A",
      "MA_KH": "LDG001",
      "THANHTOAN_ID": "100001",
      "SDT_GBC": "0912345678",
      "DIACHI_TT": "Quảng Lập, Đơn Dương, Lâm Đồng",
      "TEN_TT": "Khách hàng mẫu 1",
      "DONVIQL_ID": "QL001",
      "TONGNO": 200000,
      "CHUKYNO": "06/2026"
    },
    {
      "Ô địa bàn": "Ka Đô",
      "Tên đơn vị": "VNPT Địa bàn Quảng Lập",
      "Địa bàn c3": "Ka Đô",
      "MA_NVTC": "NV002",
      "TENNGUOIGACH": "Trần Thị B",
      "MA_KH": "LDG002",
      "THANHTOAN_ID": "100002",
      "SDT_GBC": "0987654321",
      "DIACHI_TT": "Ka Đô, Đơn Dương, Lâm Đồng",
      "TEN_TT": "Khách hàng mẫu 2",
      "DONVIQL_ID": "QL001",
      "TONGNO": 220000,
      "CHUKYNO": "06/2026"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mau_nhap");
  XLSX.writeFile(wb, "mau-nhap-thu-cuoc-vnpt-supabase.xlsx");
}

function exportCSV() {
  const data = getFilteredCustomers();
  const headers = [
    "Ô địa bàn", "Tên đơn vị", "Địa bàn c3", "MA_NVTC", "TENNGUOIGACH",
    "MA_KH", "THANHTOAN_ID", "SDT_GBC", "DIACHI_TT", "TEN_TT",
    "DONVIQL_ID", "TONGNO", "CHUKYNO", "Trạng thái", "Ghi chú"
  ];

  const rows = data.map(c => [
    c.area, c.unit_name, c.dia_ban_c3, c.ma_nvtc, c.collector_name,
    c.customer_code, c.payment_id, c.phone, c.address, c.service_name,
    c.management_unit_id, c.amount_due, c.debt_cycle, c.status, c.note
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "bao-cao-thu-cuoc-vnpt-supabase.csv";
  link.click();
  URL.revokeObjectURL(url);
}
