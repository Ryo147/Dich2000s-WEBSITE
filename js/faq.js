const CATS = { install: "Lỗi cài đặt", game: "Lỗi trong game", general: "Câu hỏi chung" };
 
const FAQS = [
  { cat:"install", q:"Antivirus / Windows Defender chặn installer, phải làm sao?",
    a:"Đây là hiện tượng bình thường vì installer chưa có chữ ký số xác thực. Thêm ngoại lệ (exception) cho thư mục cài đặt hoặc file .exe trong phần mềm diệt virus đang dùng, rồi chạy lại là được." },
  { cat:"install", q:"Installer báo lỗi xác thực hash / kiểm tra file thất bại",
    a:"Thường do bản tải bị lỗi giữa chừng (mạng chập chờn) hoặc antivirus đã âm thầm sửa file trước khi installer kiểm tra. Thử xóa file tải về, <b>tạm thời</b> tắt real-time protection, rồi tải lại từ đầu." },
  { cat:"install", q:"Cài xong nhưng installer không nhận diện được thư mục cài game",
    a:"Kiểm tra lại đường dẫn đang trỏ đúng thư mục gốc chứa file .exe của game. Nếu cài qua Steam, đường dẫn thường có dạng .../steamapps/common/tên game." },
  { cat:"install", q:"Installer tải bản cập nhật bị đứt giữa chừng liên tục",
    a:"Có thể do kết nối không ổn định hoặc CDN (Content Delivery Network) đang chậm. Nếu vẫn thất bại sau nhiều lần thử, thử đổi mạng hoặc dùng VPN rồi thử lại." },
  { cat:"game", q:"Sau khi patch, game báo thiếu file hoặc không khởi động được",
    a:"Thường là do Steam đã tự động cập nhật game lên phiên bản mới. Kiểm tra version game hiện tại có khớp với version patch hỗ trợ không - nếu không khớp, cần gỡ patch, chờ nhóm cập nhật bản patch mới tương thích." },
  { cat:"game", q:"Chữ Việt bị tràn dòng, che khuất UI hoặc bị cắt chữ",
    a:"Một số khung thoại trong game gốc được thiết kế cho tiếng Anh (ngắn hơn tiếng Việt có dấu), nên đôi khi câu dài bị tràn. Đây là lỗi đã biết với vài đoạn hội thoại - nhóm sẽ tinh chỉnh lại độ dài câu dịch trong các bản cập nhật sau." },
  { cat:"game", q:"Bật game lên nhưng vẫn thấy tiếng Anh, không phải tiếng Việt",
    a:"Kiểm tra lại trong phần cài đặt ngôn ngữ (Language) của chính game có chuyển đúng sang mục patch đang áp dụng chưa. Nếu vẫn không được, thử patch lại từ đầu qua installer." },
  { cat:"game", q:"Sau khi patch, chữ hoặc UI hiện màu hồng-tím (magenta) loang lổ",
    a:"Đây là màu của hầu hết game engine khi thiếu hoặc load sai tài nguyên (font, material, shader). Nếu chơi bản quyền, nguyên nhân thường do patch bị thiếu file khi cài (mạng đứt giữa chừng, antivirus chặn một phần), thử gỡ patch rồi cài lại đầy đủ từ installer. Nếu như đây là lỗi patch do nhóm thì bạn có thể báo cáo lại thông qua fanpage hoặc discord.<br><br>Nếu chơi bản crack, khả năng cao bản crack đã tự nén hoặc lược bớt một số tài nguyên gốc để giảm dung lượng, khiến cấu trúc file không còn khớp hoàn toàn với bản patch được làm dựa trên bản gốc - trường hợp này nhóm khó đảm bảo patch hoạt động đúng vì không kiểm soát được cách mỗi bản crack đóng gói lại file.<br><br><b>Nhóm dịch không cung cấp bất kì phương án hay đường dẫn nào liên quan đến game crack nhằm tuân thủ pháp luật hiện hành.</b>" },
  { cat:"general", q:"Bản dịch có thu phí gì không?",
    a:"Không. Mọi bản patch của Dịch 2000s đều <b>miễn phí và sẽ luôn miễn phí</b>, không thu phí dưới bất kỳ hình thức nào. Nếu thấy nơi nào rao bán patch, đó không phải là hướng đi của nhóm." },
  { cat:"general", q:"Làm sao để biết dự án đang dịch tiến độ tới đâu?",
    a:"Theo dõi trang <b>/projects</b> trên website - mỗi dự án có ghi trạng thái và thông tin dịch giả. Ngoài ra nhóm cũng cập nhật thường xuyên trên Discord." },
  { cat:"general", q:"Tôi muốn đề xuất Việt hóa tựa game mà tôi muốn thì sao?",
    a:"Vào Discord của nhóm và tìm đến kênh <b>#💭╚đề-xuất-việt-hóa</b>. Nhóm sẽ xem xét và cân nhắc về các game được các bạn đề xuất." },
  { cat:"general", q:"Tôi muốn báo lỗi dịch thuật hoặc lỗi kỹ thuật trong patch thì sao?",
    a:"Vào Discord của nhóm và tag admin trực tiếp tại kênh <b>#💭╔chung</b>. Nhóm sẽ tiếp nhận và xử lý.<br><br>Đối với lỗi do installer các bạn có thể báo lỗi cho nhóm <a href='https://github.com/Ryo147/PatchVietHoaInstaller/issues/new'><b><u>tại đây</u></b></a>." },];
 
const state = { cat: "all", q: "" };
 
function buildFaqHtml(){
  const q = state.q.trim().toLowerCase();
 
  const filtered = FAQS.filter(item=>{
    const catOk = state.cat === "all" || item.cat === state.cat;
    const textOk = !q || (item.q + " " + item.a).toLowerCase().includes(q);
    return catOk && textOk;
  });
 
  if(filtered.length === 0) return null;
 
  const groups = {};
  filtered.forEach(item=>{
    (groups[item.cat] = groups[item.cat] || []).push(item);
  });
 
  const order = state.cat === "all" ? ["install","game","general"] : [state.cat];
  let html = "";
  let stagger = 0;
  order.forEach(catKey=>{
    if(!groups[catKey]) return;
    html += `<div class="section-label mb-4 mt-8">// ${CATS[catKey]}</div>`;
    groups[catKey].forEach((item, idx)=>{
      const id = catKey + "-" + idx;
      const delay = Math.min(stagger * 0.04, 0.3).toFixed(2);
      stagger++;
      html += `
        <div class="faq-item" data-id="${id}" style="animation-delay:${delay}s">
          <div class="faq-q" onclick="toggleFaq('${id}')">
            <span class="qtext">${item.q}</span>
            <span class="chev">▾</span>
          </div>
          <div class="faq-a" id="a-${id}">
            <div class="faq-a-inner">${item.a}</div>
          </div>
        </div>`;
    });
  });
  return html;
}
 
function renderFaq(){
  const results = document.getElementById('faqResults');
  const empty = document.getElementById('faqEmpty');
  const html = buildFaqHtml();
 
  results.classList.add('fading');
  window.setTimeout(()=>{
    if(html === null){
      results.innerHTML = "";
      empty.style.display = "block";
    } else {
      empty.style.display = "none";
      results.innerHTML = html;
    }
    results.classList.remove('fading');
  }, 120);
}
 
function toggleFaq(id){
  const item = document.querySelector(`.faq-item[data-id="${id}"]`);
  const body = document.getElementById('a-' + id);
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(el=>{
    el.classList.remove('open');
    el.querySelector('.faq-a').style.maxHeight = null;
  });
  if(!isOpen){
    item.classList.add('open');
    body.style.maxHeight = body.scrollHeight + 40 + "px";
  }
}
 
let searchDebounce;
document.getElementById('faqChips').addEventListener('click', e=>{
  const btn = e.target.closest('.chip-filter');
  if(!btn) return;
  document.querySelectorAll('.chip-filter').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');
  state.cat = btn.dataset.cat;
  renderFaq();
});
 
document.getElementById('faqSearch').addEventListener('input', e=>{
  clearTimeout(searchDebounce);
  const val = e.target.value;
  searchDebounce = window.setTimeout(()=>{
    state.q = val;
    renderFaq();
  }, 150);
});
 
document.getElementById('faqResults').innerHTML = buildFaqHtml() || "";
document.getElementById('faqEmpty').style.display = buildFaqHtml() ? "none" : "block";