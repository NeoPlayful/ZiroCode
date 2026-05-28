const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@zirocode.com';

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!SMTP_HOST) {
    console.warn('[Email] SMTP not configured. Skipping email send.');
    console.warn(`[Email] Would send to: ${to}, subject: ${subject}`);
    return false;
  }

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({ from: EMAIL_FROM, to, subject, html });
    return true;
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
  const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const resetUrl = `${origin}/reset-password?token=${token}`;

  return sendEmail(to, 'ZiroCode - 密码重置', `
    <div style="max-width:480px;margin:0 auto;font-family:sans-serif;">
      <h2 style="color:#e8673a;">ZiroCode 密码重置</h2>
      <p>您好，</p>
      <p>我们收到了您的密码重置请求。请点击下方按钮重置密码：</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="background:#e8673a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
          重置密码
        </a>
      </div>
      <p style="color:#999;font-size:12px;">此链接将在15分钟后过期。如果您没有请求重置密码，请忽略此邮件。</p>
    </div>
  `);
}

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  return sendEmail(to, 'ZiroCode - 欢迎加入', `
    <div style="max-width:480px;margin:0 auto;font-family:sans-serif;">
      <h2 style="color:#e8673a;">欢迎加入 ZiroCode！</h2>
      <p>您好 ${name}，</p>
      <p>感谢您注册 ZiroCode AI 服务平台。</p>
      <p>您可以开始创建 API Key 并使用我们的服务。</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${origin}/dashboard" style="background:#e8673a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
          前往控制台
        </a>
      </div>
    </div>
  `);
}

export async function sendQuotaLowEmail(to: string, name: string, remaining: number): Promise<boolean> {
  const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  return sendEmail(to, 'ZiroCode - 配额不足提醒', `
    <div style="max-width:480px;margin:0 auto;font-family:sans-serif;">
      <h2 style="color:#e8673a;">配额不足提醒</h2>
      <p>您好 ${name}，</p>
      <p>您的配额剩余不足 10%，当前剩余：${remaining.toLocaleString()} tokens。</p>
      <p>请及时充值以继续使用服务。</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${origin}/subscription" style="background:#e8673a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
          立即充值
        </a>
      </div>
    </div>
  `);
}
