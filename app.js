const $ = (id) => document.getElementById(id);

const state = {
  baseUrl: localStorage.getItem('baseUrl') || 'http://localhost:8000/api',
  appId: localStorage.getItem('appId') || ''
};

function setOut(obj) {
  $('out').textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
}

function setStatus(text) {
  $('statusView').textContent = text ?? '—';
}

function setAppId(id) {
  state.appId = String(id || '');
  localStorage.setItem('appId', state.appId);
  $('appIdView').textContent = state.appId || '—';
}

function setBaseUrl(url) {
  state.baseUrl = url.replace(/\/$/, '');
  localStorage.setItem('baseUrl', state.baseUrl);
  $('baseUrl').value = state.baseUrl;
}

async function api(path, options = {}) {
  const url = `${state.baseUrl}${path}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', ...(options.headers || {}) },
    ...options
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    throw { status: res.status, data };
  }
  return data;
}

async function refresh() {
  if (!state.appId) return;
  const data = await api(`/applications/${state.appId}`);
  setOut(data);
  setStatus(data.status || data.data?.status || 'ok');
}

$('baseUrl').value = state.baseUrl;
$('appIdView').textContent = state.appId || '—';
setBaseUrl(state.baseUrl);
setAppId(state.appId);

$('saveCfg').addEventListener('click', () => {
  setBaseUrl($('baseUrl').value);
  setOut({ ok: true, baseUrl: state.baseUrl });
});

$('setAppId').addEventListener('click', async () => {
  setAppId($('appIdInput').value.trim());
  try { await refresh(); } catch (e) { setOut(e); }
});

$('createForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd.entries());

  // Числа лучше привести, если бек ожидает numeric
  ['loan_amount','financing_amount','requested_guarantee_amount','loan_term_months'].forEach(k => {
    if (payload[k] !== undefined && payload[k] !== '') payload[k] = Number(payload[k]);
  });

  try {
    const data = await api(`/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const id = data.id || data.data?.id;
    setAppId(id);
    setStatus(data.status || 'draft');
    setOut(data);
  } catch (e2) {
    setOut(e2);
  }
});

$('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.appId) return setOut('Сначала создай/выбери application_id');

  const fd = new FormData(e.target);
  try {
    const data = await api(`/applications/${state.appId}/documents`, {
      method: 'POST',
      body: fd
    });
    setOut(data);
    await refresh();
  } catch (e2) {
    setOut(e2);
  }
});

$('btnGet').addEventListener('click', async () => {
  try { await refresh(); } catch (e) { setOut(e); }
});

$('btnPrecheck').addEventListener('click', async () => {
  if (!state.appId) return setOut('Сначала создай/выбери application_id');
  try {
    const data = await api(`/applications/${state.appId}/precheck`, { method: 'POST' });
    setOut(data);
    await refresh();
  } catch (e) {
    setOut(e);
  }
});

$('checksForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.appId) return setOut('Сначала создай/выбери application_id');

  const fd = new FormData(e.target);
  const section = fd.get('section');
  const itemsRaw = fd.get('items');

  let items;
  try { items = JSON.parse(itemsRaw); } catch { return setOut('items должен быть валидным JSON'); }

  try {
    const data = await api(`/applications/${state.appId}/checks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, items })
    });
    setOut(data);
    await refresh();
  } catch (e2) {
    setOut(e2);
  }
});

$('cashflowForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.appId) return setOut('Сначала создай/выбери application_id');

  const fd = new FormData(e.target);
  const rowsRaw = fd.get('rows');
  let rows;
  try { rows = JSON.parse(rowsRaw); } catch { return setOut('rows должен быть валидным JSON'); }

  try {
    const data = await api(`/applications/${state.appId}/cashflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows })
    });
    setOut(data);
    await refresh();
  } catch (e2) {
    setOut(e2);
  }
});

$('btnGenerate').addEventListener('click', async () => {
  if (!state.appId) return setOut('Сначала создай/выбери application_id');
  try {
    const data = await api(`/applications/${state.appId}/generate`, { method: 'POST' });
    setOut(data);
    await refresh();
  } catch (e) {
    setOut(e);
  }
});
