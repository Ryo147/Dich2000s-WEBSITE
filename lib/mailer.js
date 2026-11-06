// Gửi email qua SMTP Gmail (tài khoản riêng của nhóm, dùng "Mật khẩu ứng dụng"). Thiếu MAIL_USER/MAIL_PASS thì trả null = tính năng email tắt.
export async function makeMailer(env) {
  if (!env.MAIL_USER || !env.MAIL_PASS) return null;
  const { default: nodemailer } = await import('nodemailer');
  const tx = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: env.MAIL_USER.trim(), pass: env.MAIL_PASS.replace(/\s+/g, '') } // Google hiển thị mật khẩu ứng dụng có dấu cách, bỏ đi cho chắc });
  return ({ to, subject, text }) => tx.sendMail({ from: `"Dịch 2000s" <${env.MAIL_USER.trim()}>`, to, subject, text });
}
