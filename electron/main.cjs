const { app, BrowserWindow, shell, Menu, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

// ─── الإعدادات ───────────────────────────────────────────────
const LOVABLE_URL = 'https://www-ahmed-khaled.lovable.app';
const DIST_DIR = path.join(__dirname, '..', 'dist');
const CONFIG_FILE = path.join(app.getPath('userData'), 'legaloffice-config.json');
const DB_FILE = path.join(app.getPath('userData'), 'legaloffice-localdb.json');
const SERVER_PORT = 3000;
const LOCAL_URL = `http://127.0.0.1:${SERVER_PORT}`;

// مصادر التحميل المتاحة
const SOURCES = {
  LOVABLE: 'lovable',
  LOCAL: 'local',
};

// ─── قاعدة البيانات المحلية (Local DB Engine) ────────────────────────
function getInitialData() {
  const now = new Date().toISOString();
  return {
    courts: [
      { id: '11111111-1111-1111-1111-111111111111', code: 'CRT-001', name: 'محكمة القاهرة الابتدائية', gov: 'القاهرة', type: 'ابتدائية', addr: 'ميدان باب الخلق', created_at: now, updated_at: now },
      { id: '22222222-2222-2222-2222-222222222222', code: 'CRT-002', name: 'محكمة استئناف القاهرة', gov: 'القاهرة', type: 'استئناف', addr: 'كورنيش النيل', created_at: now, updated_at: now },
      { id: '33333333-3333-3333-3333-333333333333', code: 'CRT-003', name: 'محكمة الجيزة للأسرة', gov: 'الجيزة', type: 'أسرة', addr: 'الجيزة', created_at: now, updated_at: now }
    ],
    clients: [
      { id: 'c1111111-1111-1111-1111-111111111111', code: 'CLT-001', name: 'محمد أحمد السيد', nid: '29901150105432', phone: '01012345678', email: 'm.ahmed@email.com', addr: 'القاهرة', poa_n: '12345/2024', poa_t: 'general', poa_d: '2024-01-15', poa_a: 'الشهر العقاري', arch: 'ARC-2024-001', case_codes: ['CASE-001', 'CASE-002'], notes: '', created_at: now, updated_at: now },
      { id: 'c2222222-2222-2222-2222-222222222222', code: 'CLT-002', name: 'سمر علي حسن', nid: '30005240303216', phone: '01198765432', email: null, addr: 'الجيزة', poa_n: '67890/2024', poa_t: 'special', poa_d: '2024-03-10', poa_a: 'توثيق القاهرة', arch: 'ARC-2024-002', case_codes: ['CASE-003'], notes: '', created_at: now, updated_at: now },
      { id: 'c3333333-3333-3333-3333-333333333333', code: 'CLT-003', name: 'خالد إبراهيم نور', nid: '28812010204871', phone: '01234567890', email: null, addr: 'مدينة نصر', poa_n: '11223/2023', poa_t: 'general', poa_d: '2023-11-20', poa_a: 'الشهر العقاري', arch: 'ARC-2024-003', case_codes: ['CASE-004'], notes: '', created_at: now, updated_at: now }
    ],
    cases: [
      { id: 'cs111111-1111-1111-1111-111111111111', code: 'CASE-001', client_code: 'CLT-001', court_code: 'CRT-001', type: 'مدنية', status: 'active', opp: 'شركة النيل', opp_id: null, next_date: '2025-04-15', fee: 15000, notes: 'قضية تعويض', docs: ['صحيفة الدعوى'], created_at: now, updated_at: now },
      { id: 'cs222222-2222-2222-2222-222222222222', code: 'CASE-002', client_code: 'CLT-001', court_code: 'CRT-002', type: 'تجارية', status: 'pending', opp: 'محمود الطويل', opp_id: '29905120103456', next_date: null, fee: 20000, notes: null, docs: ['التوكيل'], created_at: now, updated_at: now },
      { id: 'cs333333-3333-3333-3333-333333333333', code: 'CASE-003', client_code: 'CLT-002', court_code: 'CRT-003', type: 'أسرة', status: 'active', opp: null, opp_id: null, next_date: '2025-04-20', fee: 8000, notes: null, docs: [], created_at: now, updated_at: now },
      { id: 'cs444444-4444-4444-4444-444444444444', code: 'CASE-004', client_code: 'CLT-003', court_code: 'CRT-001', type: 'جنائية', status: 'closed', opp: 'علي سالم', opp_id: null, next_date: null, fee: 12000, notes: null, docs: [], created_at: now, updated_at: now }
    ],
    documents: [
      { id: 'd1111111-1111-1111-1111-111111111111', code: 'DOC-001', name: 'صحيفة دعوى مدنية.pdf', case_code: 'CASE-001', cat: 'صحيفة دعوى', status: 'verified', notes: null, created_at: now, updated_at: now },
      { id: 'd2222222-2222-2222-2222-222222222222', code: 'DOC-002', name: 'توكيل رسمي.pdf', case_code: 'CASE-002', cat: 'توكيل', status: 'missing', notes: null, created_at: now, updated_at: now }
    ],
    appointments: [
      { id: 'a1111111-1111-1111-1111-111111111111', code: 'APT-001', title: 'جلسة محكمة CASE-001', appt_date: '2025-04-01', appt_time: '10:00', client_code: 'CLT-001', type: 'court', loc: 'محكمة القاهرة', notes: null, created_at: now, updated_at: now },
      { id: 'a2222222-2222-2222-2222-222222222222', code: 'APT-002', title: 'اجتماع مع محمد أحمد', appt_date: '2025-04-01', appt_time: '14:00', client_code: 'CLT-001', type: 'meet', loc: 'مكتب المحاماة', notes: null, created_at: now, updated_at: now },
      { id: 'a3333333-3333-3333-3333-333333333333', code: 'APT-003', title: 'جلسة طلاق', appt_date: '2025-04-03', appt_time: '09:00', client_code: 'CLT-002', type: 'court', loc: 'محكمة الجيزة', notes: null, created_at: now, updated_at: now },
      { id: 'a4444444-4444-4444-4444-444444444444', code: 'APT-004', title: 'استشارة قانونية', appt_date: '2025-04-08', appt_time: '15:00', client_code: 'CLT-003', type: 'consult', loc: 'مكتب المحاماة', notes: null, created_at: now, updated_at: now },
      { id: 'a5555555-5555-5555-5555-555555555555', code: 'APT-005', title: 'جلسة تحكيم', appt_date: '2025-04-10', appt_time: '11:00', client_code: null, type: 'arbitration', loc: 'غرفة التجارة', notes: null, created_at: now, updated_at: now }
    ],
    finances: [
      { id: 'f1111111-1111-1111-1111-111111111111', code: 'FIN-001', type: 'income', amount: 15000, client_code: 'CLT-001', fin_date: '2025-03-31', description: 'دفعة أتعاب — محمد أحمد', created_at: now, updated_at: now },
      { id: 'f2222222-2222-2222-2222-222222222222', code: 'FIN-002', type: 'income', amount: 12000, client_code: 'CLT-003', fin_date: '2025-03-29', description: 'أتعاب — خالد نور', created_at: now, updated_at: now },
      { id: 'f3333333-3333-3333-3333-333333333333', code: 'FIN-003', type: 'expense', amount: 3500, client_code: null, fin_date: '2025-03-28', description: 'إيجار المكتب', created_at: now, updated_at: now },
      { id: 'f4444444-4444-4444-4444-444444444444', code: 'FIN-004', type: 'income', amount: 8000, client_code: 'CLT-002', fin_date: '2025-03-25', description: 'دفعة أولى — سمر حسن', created_at: now, updated_at: now },
      { id: 'f5555555-5555-5555-5555-555555555555', code: 'FIN-005', type: 'expense', amount: 1200, client_code: null, fin_date: '2025-03-20', description: 'مستلزمات مكتبية', created_at: now, updated_at: now }
    ],
    app_settings: [
      {
        id: 's1111111-1111-1111-1111-111111111111',
        office_name: 'مكتب العدل للمحاماة',
        user_name: 'أحمد خالد الفقي',
        user_role: 'مدير النظام',
        user_phone: '01012345678',
        user_email: 'admin@office.com',
        lock_password: 'admin123',
        accent_primary: '#b8963e',
        accent_secondary: '#d4af5a',
        bg_color: '#07101f',
        created_at: now,
        updated_at: now
      }
    ]
  };
}

function loadLocalDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to read local DB, creating initial data:', err.message);
  }
  const data = getInitialData();
  saveLocalDB(data);
  return data;
}

function saveLocalDB(db) {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save local DB:', err.message);
  }
}

let localDb = loadLocalDB();

function applyFilters(rows, searchParams) {
  let result = [...rows];
  for (const [key, val] of searchParams.entries()) {
    if (['select', 'order', 'limit', 'offset', 'columns', 'on_conflict'].includes(key)) continue;

    if (val.startsWith('eq.')) {
      const target = val.slice(3);
      result = result.filter(r => String(r[key]) === target);
    } else if (val.startsWith('neq.')) {
      const target = val.slice(4);
      result = result.filter(r => String(r[key]) !== target);
    } else if (val.startsWith('in.(') && val.endsWith(')')) {
      const items = val.slice(4, -1).split(',').map(s => s.replace(/^"|"$/g, '').trim());
      result = result.filter(r => items.includes(String(r[key])));
    } else if (val.startsWith('gt.')) {
      const target = val.slice(3);
      result = result.filter(r => r[key] > target);
    } else if (val.startsWith('gte.')) {
      const target = val.slice(4);
      result = result.filter(r => r[key] >= target);
    } else if (val.startsWith('lt.')) {
      const target = val.slice(3);
      result = result.filter(r => r[key] < target);
    } else if (val.startsWith('lte.')) {
      const target = val.slice(4);
      result = result.filter(r => r[key] <= target);
    } else if (val.startsWith('like.')) {
      const target = val.slice(5).replace(/%/g, '.*');
      const reg = new RegExp('^' + target + '$', 'i');
      result = result.filter(r => reg.test(String(r[key] || '')));
    } else if (val.startsWith('ilike.')) {
      const target = val.slice(6).replace(/%/g, '.*');
      const reg = new RegExp('^' + target + '$', 'i');
      result = result.filter(r => reg.test(String(r[key] || '')));
    }
  }

  const orderParam = searchParams.get('order');
  if (orderParam) {
    const parts = orderParam.split('.');
    const col = parts[0];
    const isDesc = parts[1] === 'desc';
    result.sort((a, b) => {
      if (a[col] < b[col]) return isDesc ? 1 : -1;
      if (a[col] > b[col]) return isDesc ? -1 : 1;
      return 0;
    });
  }

  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit'), 10) : null;

  if (offset > 0) result = result.slice(offset);
  if (limit !== null) result = result.slice(0, limit);

  return result;
}

function processDbQuery(method, url, headers, bodyData) {
  const parsedUrl = new URL(url, LOCAL_URL);
  const pathname = parsedUrl.pathname;

  // ─── التوثيق المحتر المعمول به في النسخة المحلية ──────────────────────
  const mockUser = {
    id: '00000000-0000-0000-0000-000000000000',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@office.com',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    phone: '01012345678',
    confirmed_at: '2024-01-01T00:00:00.000Z',
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: 'أحمد خالد الفقي', role: 'مدير النظام' },
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: new Date().toISOString()
  };

  const mockSession = {
    access_token: 'mock-local-access-token-12345',
    token_type: 'bearer',
    expires_in: 315360000,
    expires_at: Math.floor(Date.now() / 1000) + 315360000,
    refresh_token: 'mock-local-refresh-token-12345',
    user: mockUser
  };

  if (pathname.startsWith('/auth/v1/')) {
    if (pathname.includes('/user')) {
      return { status: 200, statusText: 'OK', data: mockUser };
    }
    return { status: 200, statusText: 'OK', data: mockSession };
  }

  let tableName = pathname.replace(/^\/rest\/v1\//, '').replace(/\/$/, '').trim();
  if (!tableName || tableName.startsWith('/')) {
    tableName = 'app_settings';
  }

  if (!localDb[tableName]) {
    localDb[tableName] = [];
  }
  const tableRows = localDb[tableName];
  const searchParams = parsedUrl.searchParams;

  let payload = null;
  if (bodyData) {
    try {
      payload = typeof bodyData === 'string' ? JSON.parse(bodyData) : bodyData;
    } catch (e) {
      payload = null;
    }
  }

  const reqHeaders = headers || {};
  const preferHeader = reqHeaders['prefer'] || reqHeaders['Prefer'] || '';
  const acceptHeader = reqHeaders['accept'] || reqHeaders['Accept'] || '';
  const isSingle = acceptHeader === 'application/vnd.pgrst.object+json';

  if (method === 'GET' || method === 'HEAD') {
    const filtered = applyFilters(tableRows, searchParams);
    const totalCount = tableRows.length;
    const resHeaders = {};

    if (preferHeader.includes('count=')) {
      const endRange = filtered.length > 0 ? filtered.length - 1 : 0;
      resHeaders['content-range'] = `0-${endRange}/${totalCount}`;
    }

    if (isSingle) {
      if (filtered.length > 0) {
        return { status: 200, statusText: 'OK', data: filtered[0], headers: resHeaders };
      } else {
        return { status: 404, statusText: 'Not Found', data: { message: 'Not found' }, headers: resHeaders };
      }
    } else {
      return { status: 200, statusText: 'OK', data: filtered, headers: resHeaders };
    }
  }

  if (method === 'POST') {
    const now = new Date().toISOString();
    const itemsToInsert = Array.isArray(payload) ? payload : [payload || {}];
    const inserted = [];

    itemsToInsert.forEach(item => {
      const newItem = {
        id: item.id || crypto.randomUUID(),
        ...item,
        created_at: item.created_at || now,
        updated_at: now
      };

      const onConflict = searchParams.get('on_conflict');
      if (onConflict && newItem[onConflict]) {
        const existingIdx = tableRows.findIndex(r => String(r[onConflict]) === String(newItem[onConflict]));
        if (existingIdx >= 0) {
          tableRows[existingIdx] = { ...tableRows[existingIdx], ...newItem };
          inserted.push(tableRows[existingIdx]);
          return;
        }
      }

      tableRows.push(newItem);
      inserted.push(newItem);
    });

    saveLocalDB(localDb);
    const responseBody = Array.isArray(payload) ? inserted : (inserted[0] || {});
    return { status: 201, statusText: 'Created', data: responseBody };
  }

  if (method === 'PATCH' || method === 'PUT') {
    const now = new Date().toISOString();
    const targetRows = applyFilters(tableRows, searchParams);
    const updated = [];

    targetRows.forEach(target => {
      const idx = tableRows.findIndex(r => r.id === target.id || (r.code && r.code === target.code));
      if (idx >= 0) {
        tableRows[idx] = { ...tableRows[idx], ...payload, updated_at: now };
        updated.push(tableRows[idx]);
      }
    });

    saveLocalDB(localDb);
    return { status: 200, statusText: 'OK', data: isSingle ? (updated[0] || payload || {}) : updated };
  }

  if (method === 'DELETE') {
    const targetRows = applyFilters(tableRows, searchParams);
    const targetIds = new Set(targetRows.map(r => r.id));
    localDb[tableName] = tableRows.filter(r => !targetIds.has(r.id));
    saveLocalDB(localDb);
    return { status: 200, statusText: 'OK', data: targetRows };
  }

  return { status: 405, statusText: 'Method Not Allowed', data: { error: 'Method not allowed' } };
}

// ─── خادم الملفات وقاعدة البيانات المحلي (Local HTTP & DB Server) ───
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

function startLocalServer() {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, LOCAL_URL);
    const pathname = parsedUrl.pathname;

    // 1. طلبات التوثيق وخادم البيانات (/auth/v1/..., /rest/v1/...)
    if (pathname.startsWith('/rest/v1/') || pathname.startsWith('/auth/v1/')) {
      let bodyData = '';
      req.on('data', chunk => { bodyData += chunk; });
      req.on('end', () => {
        try {
          const result = processDbQuery(req.method, req.url, req.headers, bodyData);
          if (result.headers) {
            Object.keys(result.headers).forEach(h => res.setHeader(h, result.headers[h]));
          }
          res.writeHead(result.status || 200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result.data));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // 2. قراءة الملفات الثابتة لتشغيل الـ React App (dist/...)
    let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);
    if (!filePath.startsWith(DIST_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || stats.isDirectory()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500);
          res.end('Server Error');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
    });
  });

  server.listen(SERVER_PORT, '127.0.0.1', () => {
    console.log(`✓ Unified Local Server running on ${LOCAL_URL}`);
  });
}

// ─── قراءة/حفظ الإعدادات ────────────────────────────────────
function loadConfig() {
  const defaultConfig = { source: SOURCES.LOCAL };
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save config:', err.message);
  }
  return defaultConfig;
}

function saveConfig(config) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save config:', err.message);
  }
}

let currentConfig = loadConfig();
let mainWindow = null;
let settingsWindow = null;

function getSourceLabel(source) {
  return source === SOURCES.LOVABLE ? 'Lovable مباشر' : 'الملفات المحلية';
}

// ─── إنشاء النافذة الرئيسية ─────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'مكتب العدل - Legal Office',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'main-preload.cjs'),
    },
  });

  // إعادة توجيه أي طلبات سحابية لـ supabase.co إلى الخادم المحلي
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['*://*.supabase.co/*'] },
    (details, callback) => {
      const urlObj = new URL(details.url);
      const redirectURL = `${LOCAL_URL}${urlObj.pathname}${urlObj.search}`;
      callback({ redirectURL });
    }
  );

  // منع التنقل بعيداً عن مصادر التطبيق المسموحة
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isAllowed = url.startsWith(LOVABLE_URL) || url.startsWith(LOCAL_URL) || url.startsWith('file://');
    if (!isAllowed) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // فتح الروابط الخارجية في المتصفح الافتراضي
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // إضافة الزر العائم للإعدادات بعد تحميل الصفحة
  mainWindow.webContents.on('did-finish-load', () => {
    injectFloatingSettingsButton(mainWindow);
  });

  loadSelectedSource(mainWindow);
}

// ─── تحميل المصدر المحدد ────────────────────────────────────
function loadSelectedSource(win) {
  if (currentConfig.source === SOURCES.LOVABLE) {
    loadFromLovable(win);
  } else {
    loadFromLocal(win);
  }
}

function loadFromLovable(win) {
  console.log(`◆ Loading from Lovable: ${LOVABLE_URL}`);
  let fallbackTriggered = false;

  const doFallback = () => {
    if (!fallbackTriggered) {
      fallbackTriggered = true;
      console.warn('⚠ Offline or load failure → switching to local version');
      loadFromLocal(win);
    }
  };

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (!fallbackTriggered) {
      console.warn(`did-fail-load: ${errorCode} ${errorDescription}`);
      doFallback();
    }
  });

  win.webContents.on('did-fail-provisional-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame && validatedURL.startsWith(LOVABLE_URL) && !fallbackTriggered) {
      console.warn(`did-fail-provisional-load: ${errorDescription}`);
      doFallback();
    }
  });

  win.loadURL(LOVABLE_URL);
}

function loadFromLocal(win) {
  console.log(`◆ Loading from local: ${LOCAL_URL}`);
  win.loadURL(LOCAL_URL);
}

// ─── الزر العائم للإعدادات ──────────────────────────────────
function injectFloatingSettingsButton(win) {
  if (!win || win.isDestroyed()) return;

  const css = `
    #legaloffice-settings-btn {
      position: fixed;
      bottom: 24px;
      left: 24px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #fbbf24;
      color: #1e293b;
      font-size: 24px;
      border: none;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      cursor: pointer;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, background 0.2s;
      line-height: 1;
    }
    #legaloffice-settings-btn:hover {
      transform: scale(1.1);
      background: #f59e0b;
    }
    #legaloffice-settings-btn svg {
      width: 24px;
      height: 24px;
    }
  `;

  const html = `
    <button id="legaloffice-settings-btn" title="إعدادات التطبيق">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    </button>
  `;

  const js = `
    (function() {
      if (document.getElementById('legaloffice-settings-btn')) return;
      var style = document.createElement('style');
      style.textContent = ${JSON.stringify(css)};
      document.head.appendChild(style);
      var btn = document.createElement('div');
      btn.innerHTML = ${JSON.stringify(html)};
      var btnEl = btn.firstElementChild;
      btnEl.addEventListener('click', function() {
        if (window.legalOfficeDesktop && window.legalOfficeDesktop.openSettings) {
          window.legalOfficeDesktop.openSettings();
        }
      });
      document.body.appendChild(btnEl);
    })();
  `;

  win.webContents.executeJavaScript(js).catch((err) => {
    console.warn('Failed to inject settings button:', err.message);
  });
}

// ─── نافذة الإعدادات العائمة ────────────────────────────────
function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  const [mainX, mainY] = mainWindow.getPosition();
  const [mainW, mainH] = mainWindow.getSize();

  settingsWindow = new BrowserWindow({
    width: 340,
    height: 280,
    x: mainX + mainW - 350,
    y: mainY + mainH - 300,
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    parent: mainWindow,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'settings-preload.cjs'),
    },
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// ─── IPC ────────────────────────────────────────────────────
ipcMain.on('open-settings', () => {
  createSettingsWindow();
});

ipcMain.handle('get-config', () => {
  return {
    source: currentConfig.source,
    sourceLabel: getSourceLabel(currentConfig.source),
  };
});

ipcMain.handle('set-source', (event, source) => {
  if (!Object.values(SOURCES).includes(source)) return { ok: false, message: 'مصدر غير معروف' };
  if (currentConfig.source === source) return { ok: true, source };

  currentConfig.source = source;
  saveConfig(currentConfig);
  console.log(`✓ Source changed to: ${getSourceLabel(source)}`);

  if (mainWindow) {
    loadSelectedSource(mainWindow);
  }

  return { ok: true, source };
});

ipcMain.handle('close-settings', () => {
  if (settingsWindow) settingsWindow.close();
  return { ok: true };
});

ipcMain.handle('reload-app', () => {
  if (mainWindow) mainWindow.reload();
  return { ok: true };
});

ipcMain.handle('open-devtools', () => {
  if (mainWindow) mainWindow.webContents.toggleDevTools();
  return { ok: true };
});

ipcMain.handle('local-db-query', async (event, { url, method, headers, body }) => {
  try {
    const result = processDbQuery(method, url, headers, body);
    return result;
  } catch (err) {
    console.error('Error handling local-db-query IPC:', err);
    return { status: 500, statusText: 'Internal Error', data: { error: err.message } };
  }
});

// ─── دورة حياة التطبيق ──────────────────────────────────────
app.whenReady().then(() => {
  startLocalServer();

  const template = [
    {
      label: 'الإعدادات',
      submenu: [
        {
          label: 'فتح نافذة الإعدادات',
          accelerator: 'CmdOrCtrl+,',
          click: () => createSettingsWindow(),
        },
        { type: 'separator' },
        {
          label: 'إعادة تحميل الصفحة',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          },
        },
        {
          label: 'فتح أدوات المطور',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools();
          },
        },
        { type: 'separator' },
        {
          label: 'الخروج',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});