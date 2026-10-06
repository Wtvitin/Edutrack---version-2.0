import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { openDatabase } from '../server/database.mjs';
import { createAPI } from '../server/api.mjs';
import { createMailer } from '../server/mail.mjs';

async function setup({ mailer, env }) {
  const db = await openDatabase({ directory: 'memory://', url: '' });
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const api = createAPI(db, { origin, local: true, mailMode: 'smtp', env, mailer });
  server.removeAllListeners('request');
  server.on('request', (request, response) => void api(request, response));
  return { db, server, origin };
}

async function close({ db, server }) {
  await new Promise(resolve => server.close(resolve));
  await db.close();
}

test('falha do provider retorna erro controlado e o cadastro pode reenviar', async () => {
  let shouldFail = true;
  const sentMessages = [];
  const env = {
    SMTP_HOST: 'smtp.example.test',
    SMTP_PORT: '465',
    SMTP_USER: 'sender@example.test',
    SMTP_PASSWORD: 'test-password',
    MAIL_FROM: 'EduTrack <sender@example.test>',
  };
  const mailer = createMailer(null, { mailMode: 'smtp', local: true, env }, {
    smtpTransport: {
      async sendMail(message) {
        if (shouldFail) {
          const failure = new Error('connection refused');
          failure.code = 'ECONNREFUSED';
          throw failure;
        }
        sentMessages.push(message);
        return { accepted: [message.to] };
      },
    },
  });
  const target = await setup({ mailer, env });
  const email = `mail-audit-${Date.now()}@example.test`;
  const password = 'testing-pass-123';
  const call = async (path, data) => {
    const response = await fetch(target.origin + path, {
      method: data ? 'POST' : 'GET',
      headers: { Origin: target.origin, 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    return { status: response.status, body: await response.json() };
  };

  try {
    const failed = await call('/api/auth/register', { name: 'Mail Audit', email, password });
    assert.equal(failed.status, 503);
    assert.match(failed.body.message, /e-mail/i);
    assert.doesNotMatch(failed.body.message, /password|ECONNREFUSED|sender@example/i);

    const pending = (await target.db.query('SELECT email_verified_at FROM users WHERE email=$1', [email])).rows[0];
    assert.equal(pending.email_verified_at, null);
    assert.equal((await target.db.query('SELECT COUNT(*)::int AS count FROM auth_tokens WHERE purpose=\'VERIFY\'')).rows[0].count, 1);

    shouldFail = false;
    const retried = await call('/api/auth/register', { name: 'Mail Audit', email, password });
    assert.equal(retried.status, 200);
    assert.equal(sentMessages.length, 1);

    const verificationLink = sentMessages[0].text.trim().split(/\s+/).at(-1);
    const verificationToken = new URL(verificationLink).searchParams.get('token');
    const verified = await call('/api/auth/verify', { token: verificationToken });
    assert.equal(verified.status, 200);
    assert.equal((await call('/api/auth/login', { email, password })).status, 200);
  } finally {
    await close(target);
  }
});

test('token expirado não confirma a conta', async () => {
  const sentMessages = [];
  const env = {
    SMTP_HOST: 'smtp.example.test',
    SMTP_PORT: '465',
    SMTP_USER: 'sender@example.test',
    SMTP_PASSWORD: 'test-password',
    MAIL_FROM: 'EduTrack <sender@example.test>',
  };
  const target = await setup({
    env,
    mailer: async message => { sentMessages.push(message); },
  });
  const email = `expired-${Date.now()}@example.test`;
  const call = async (path, data) => {
    const response = await fetch(target.origin + path, {
      method: data ? 'POST' : 'GET',
      headers: { Origin: target.origin, 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    return { status: response.status, body: await response.json() };
  };

  try {
    assert.equal((await call('/api/auth/register', { name: 'Expired Audit', email, password: 'testing-pass-123' })).status, 200);
    const verificationToken = new URL(sentMessages[0].link).searchParams.get('token');
    await target.db.query("UPDATE auth_tokens SET expires_at=now()-interval '1 minute' WHERE purpose='VERIFY'");
    assert.equal((await call('/api/auth/verify', { token: verificationToken })).status, 400);
    assert.equal((await target.db.query('SELECT email_verified_at FROM users WHERE email=$1', [email])).rows[0].email_verified_at, null);
  } finally {
    await close(target);
  }
});
