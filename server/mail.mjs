import nodemailer from 'nodemailer';
export function createMailer(db, config) {
  const smtp = config.mailMode === 'smtp' ? nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === '465', requireTLS: process.env.SMTP_PORT !== '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10000, socketTimeout: 15000,
  }) : null;
  return async function sendMail({ to, subject, body, link }) {
    if (config.mailMode === 'local' && config.local) {
      await db.query('INSERT INTO development_mail(recipient,subject,body,link) VALUES($1,$2,$3,$4)', [to, subject, body, link]);
    } else if (smtp) {
      await smtp.sendMail({ from: process.env.MAIL_FROM, to, subject, text: `${body}\n\n${link}` });
    } else if (config.mailMode === 'resend') {
      const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text: `${body}\n\n${link}` }) });
      if (!response.ok) throw new Error('Mail delivery failed');
    } else throw new Error('Mail transport is not configured');
  };
}
