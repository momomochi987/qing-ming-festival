// app.js — requires data.js to be loaded first (defines const missions)
let currentFilter = 'all';
let currentLang = 'zh';
let currentSort = { col: null, dir: 'asc' };

const STATUS_ORDER = { OK: 0, AT_RISK: 1, CRITICAL: 2, DEAD: 3 };
const SORT_FNS = {
  pos:     (a, b) => a.pos - b.pos,
  status:  (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  missing: (a, b) => a.missing - b.missing,
  total:   (a, b) => a.total - b.total,
  pct:     (a, b) => (a.total > 0 ? a.missing / a.total : 0) - (b.total > 0 ? b.missing / b.total : 0),
};

const i18n = {
  zh: {
    'title':           '清院本清明上河圖',
    'total':           n => '共 ' + n + ' 個任務',
    'updated-label':   '最後更新',
    'view-bg':         '在 Bannergress 查看 ↗',
    'view-tg':         'Telegram 討論群 ↗',
    'lbl-ok':          '✅ 正常',
    'lbl-risk':        '⚠️ 有 Portal 消失',
    'lbl-critical':    '🔴 危險',
    'lbl-dead':        '❌ 任務消失',
    'search-ph':       '搜尋任務名稱…',
    'btn-all':         '全部',
    'btn-dead':        '❌ 已消失',
    'btn-critical':    '🔴 危險',
    'btn-risk':        '⚠️ 有風險',
    'btn-ok':          '✅ 正常',
    'th-thumb':        '縮圖',
    'th-status':       '狀態',
    'th-name':         '任務名稱',
    'th-missing':      '消失 Portal',
    'th-total':        '總 Waypoints',
    'th-pct':          '消失比例',
    'badge-ok':        '✅ 正常',
    'badge-risk':      '⚠️ 有風險',
    'badge-critical':  '🔴 危險',
    'badge-dead':      '❌ 已消失',
    'empty':           '沒有符合的任務',
    'showing':         n => '顯示 ' + n + ' 筆',
    'footer':          '資料來源：<a href="https://intel.ingress.com/intel" target="_blank">Ingress Intel Map</a>　｜　僅供參考，實際狀況以遊戲內為準',
  },
  en: {
    'title':           'Qing Ming Festival',
    'total':           n => n + ' missions total',
    'updated-label':   'Last updated',
    'view-bg':         'View on Bannergress ↗',
    'view-tg':         'Telegram Group ↗',
    'lbl-ok':          '✅ Healthy',
    'lbl-risk':        '⚠️ AT_RISK',
    'lbl-critical':    '🔴 CRITICAL',
    'lbl-dead':        '❌ DEAD',
    'search-ph':       'Search mission name…',
    'btn-all':         'All',
    'btn-dead':        '❌ DEAD',
    'btn-critical':    '🔴 CRITICAL',
    'btn-risk':        '⚠️ AT_RISK',
    'btn-ok':          '✅ OK',
    'th-thumb':        'Thumbnail',
    'th-status':       'Status',
    'th-name':         'Mission Name',
    'th-missing':      'Missing Portals',
    'th-total':        'Total Waypoints',
    'th-pct':          'Missing %',
    'badge-ok':        '✅ OK',
    'badge-risk':      '⚠️ AT_RISK',
    'badge-critical':  '🔴 CRITICAL',
    'badge-dead':      '❌ DEAD',
    'empty':           'No matching missions',
    'showing':         n => 'Showing ' + n + ' result' + (n === 1 ? '' : 's'),
    'footer':          'Data source: <a href="https://intel.ingress.com/intel" target="_blank">Ingress Intel Map</a>  |  For reference only.',
  }
};

function t(key, arg) {
  const val = i18n[currentLang][key];
  return typeof val === 'function' ? val(arg) : (val || key);
}

const I18N_HTML_KEYS = new Set(['footer']);
function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (typeof i18n[currentLang][key] !== 'function') {
      if (I18N_HTML_KEYS.has(key)) {
        el.innerHTML = t(key);
      } else if (el.dataset.sort) {
        // 有排序的欄位：保留 .sort-ind span，只更新文字
        const ind = el.querySelector('.sort-ind');
        el.textContent = t(key);
        if (ind) el.appendChild(ind);
      } else {
        el.textContent = t(key);
      }
    } else if (key === 'total') {
      el.textContent = t('total', missions.length);
    }
  });
  document.getElementById('search').placeholder = t('search-ph');
  document.getElementById('btn-zh').classList.toggle('lang-active', currentLang === 'zh');
  document.getElementById('btn-en').classList.toggle('lang-active', currentLang === 'en');
  document.documentElement.lang = currentLang === 'zh' ? 'zh-TW' : 'en';
  render();
}

function setLang(lang) { currentLang = lang; applyLang(); }

// Theme
function toggleTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = dark ? '' : 'dark';
  document.getElementById('theme-btn').textContent = dark ? '🌙' : '☀️';
  localStorage.setItem('theme', dark ? '' : 'dark');
}
(function () {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.documentElement.dataset.theme = 'dark';
    document.getElementById('theme-btn').textContent = '☀️';
  }
})();

// Init counts & timestamp
document.getElementById('updated').textContent =
  new Date().toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const counts = { OK: 0, AT_RISK: 0, CRITICAL: 0, DEAD: 0 };
missions.forEach(m => { if (counts[m.status] !== undefined) counts[m.status]++; });
document.getElementById('cnt-ok').textContent       = counts.OK;
document.getElementById('cnt-risk').textContent     = counts.AT_RISK;
document.getElementById('cnt-critical').textContent = counts.CRITICAL;
document.getElementById('cnt-dead').textContent     = counts.DEAD;

// Sort
function sortBy(col) {
  if (currentSort.col === col) {
    currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.col = col;
    currentSort.dir = 'asc';
  }
  document.querySelectorAll('th[data-sort]').forEach(th => {
    const ind = th.querySelector('.sort-ind');
    if (ind) ind.textContent = th.dataset.sort === col ? (currentSort.dir === 'asc' ? ' ▲' : ' ▼') : '';
  });
  render();
}

function highlight(text, keyword) {
  if (!keyword) return text;
  const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(esc, 'gi'), m => '<mark>' + m + '</mark>');
}

function render() {
  const keyword = document.getElementById('search').value.trim();
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';

  const clsMap = { OK: 'ok', AT_RISK: 'risk', CRITICAL: 'critical', DEAD: 'dead' };

  // Filter
  let rows = missions.filter(m => {
    if (currentFilter !== 'all' && m.status !== currentFilter) return false;
    if (keyword && !m.name.toLowerCase().includes(keyword.toLowerCase())) return false;
    return true;
  });

  // Sort
  if (currentSort.col && SORT_FNS[currentSort.col]) {
    rows = [...rows].sort(SORT_FNS[currentSort.col]);
    if (currentSort.dir === 'desc') rows.reverse();
  }

  rows.forEach(m => {
    const cls   = clsMap[m.status] || m.status.toLowerCase();
    const badge = t('badge-' + cls);
    const pct   = m.status === 'DEAD' ? '—' : (m.total > 0 ? Math.round(m.missing / m.total * 100) + '%' : '—');
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + m.pos + '</td>' +
      '<td><img src="' + m.picture + '" alt="" onerror="this.style.display=\'none\'"></td>' +
      '<td><span class="badge ' + cls + '">' + badge + '</span></td>' +
      '<td>' + highlight(m.name, keyword) + '</td>' +
      '<td>' + (m.status === 'DEAD' ? '—' : m.missing) + '</td>' +
      '<td>' + (m.status === 'DEAD' ? '—' : m.total)   + '</td>' +
      '<td style="font-size:0.78rem;color:var(--text-dim)">' + pct + '</td>';
    tbody.appendChild(tr);
  });

  if (rows.length === 0) tbody.innerHTML = '<tr><td colspan="7" class="empty">' + t('empty') + '</td></tr>';
  document.getElementById('result-count').textContent = t('showing', rows.length);
}

function setFilter(val) {
  currentFilter = val;
  const map = { all: 'all', dead: 'DEAD', critical: 'CRITICAL', risk: 'AT_RISK', ok: 'OK' };
  ['all', 'dead', 'critical', 'risk', 'ok'].forEach(k => {
    document.getElementById('btn-' + k).classList.toggle('active', map[k] === val);
  });
  render();
}

applyLang();
