const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const PORT = 18080;
const HOST = '127.0.0.1';
const TARGET = 'http://127.0.0.1:4300';
const BACKEND_TARGET = process.env.LIAN_BACKEND_TARGET || 'http://127.0.0.1:4200';
const DEPLOY_WEBHOOK_PATH = '/api/ops/deploy-webhook';

const ANSWER = String(process.env.ANSWER || '').trim();
const COOKIE_NAME = 'forum_gate';
const COOKIE_VALUE = 'ok';

if (!ANSWER) {
  console.error('ERROR: ANSWER is empty. Please set ANSWER in /etc/forum-gate.env');
  process.exit(1);
}

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

function isAuthed(req) {
  return req.cookies && req.cookies[COOKIE_NAME] === COOKIE_VALUE;
}

app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

app.get('/gate-login', (req, res) => {
  const hasError = req.query.error ? 'block' : 'none';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Private Test Site</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f6f7f9;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .box {
      background: #fff;
      width: 380px;
      max-width: calc(100vw - 40px);
      padding: 28px;
      border-radius: 14px;
      box-shadow: 0 10px 35px rgba(0,0,0,.08);
    }
    h1 {
      font-size: 18px;
      line-height: 1.45;
      margin: 0 0 18px;
    }
    input {
      width: 100%;
      box-sizing: border-box;
      padding: 12px;
      font-size: 16px;
      border: 1px solid #ccc;
      border-radius: 8px;
      margin-bottom: 14px;
    }
    button {
      width: 100%;
      padding: 12px;
      font-size: 16px;
      border: 0;
      border-radius: 8px;
      background: #111;
      color: #fff;
      cursor: pointer;
    }
    .err {
      display: ${hasError};
      color: #c00;
      margin-bottom: 12px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="box">
    <h1>What are the names of the villages nearby?<br>(Five lowercase letters)</h1>
    <div class="err">Wrong answer. Please try again.</div>
    <form method="post" action="/gate-login">
      <input name="answer" autocomplete="off" autofocus placeholder="answer">
      <button type="submit">Enter</button>
    </form>
  </div>
</body>
</html>`);
});

app.post('/gate-login', (req, res) => {
  const answer = String(req.body.answer || '').trim();

  if (answer === ANSWER) {
    res.cookie(COOKIE_NAME, COOKIE_VALUE, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7
    });
    return res.redirect('/');
  }

  return res.redirect('/gate-login?error=1');
});

app.get('/gate-logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.redirect('/gate-login');
});

const deployWebhookProxy = createProxyMiddleware({
  target: BACKEND_TARGET,
  changeOrigin: true,
  ws: false,
  xfwd: true,
  proxyTimeout: 3600000,
  timeout: 3600000,
  pathRewrite: () => DEPLOY_WEBHOOK_PATH,
  onError: function(err, req, res) {
    console.error('Deploy webhook proxy error:', err.message);
    if (!res.headersSent) {
      res.status(502).send('Deploy webhook service is not available.');
    }
  }
});

app.use(DEPLOY_WEBHOOK_PATH, (req, res, next) => {
  if (req.method !== 'POST') {
    return res.status(405).send('method not allowed');
  }
  return deployWebhookProxy(req, res, next);
});

app.use((req, res, next) => {
  if (
    req.path === '/gate-login' ||
    req.path === '/healthz' ||
    req.path === '/favicon.ico'
  ) {
    return next();
  }

  if (!isAuthed(req)) {
    return res.redirect('/gate-login');
  }

  return next();
});

app.use(
  '/',
  createProxyMiddleware({
    target: TARGET,
    changeOrigin: true,
    ws: true,
    xfwd: true,
    proxyTimeout: 3600000,
    timeout: 3600000,
    onError: function(err, req, res) {
      console.error('Proxy error:', err.message);
      if (!res.headersSent) {
        res.status(502).send('Forum service is not available.');
      }
    }
  })
);

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`Forum gate running at http://${HOST}:${PORT}`);
  console.log(`Proxy target: ${TARGET}`);
  console.log(`Deploy webhook target: ${BACKEND_TARGET}`);
});

// 防止某些环境下进程异常空闲退出
setInterval(() => {}, 3600000);

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
