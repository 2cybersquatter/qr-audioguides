(function() {
  const STORAGE_KEY = 'startpage.settings.v1';

  const DEFAULT_SETTINGS = {
    theme: 'light', // 'light' | 'dark'
    searchEngine: 'google', // 'google' | 'yandex' | 'duckduckgo'
    bookmarks: [
      { id: cryptoRandomId(), title: 'Google', url: 'https://www.google.com' },
      { id: cryptoRandomId(), title: 'YouTube', url: 'https://www.youtube.com' },
      { id: cryptoRandomId(), title: 'GitHub', url: 'https://github.com' }
    ],
    background: { type: 'none', dataUrl: '' }
  };

  function cryptoRandomId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_SETTINGS);
      const parsed = JSON.parse(raw);
      // basic migration/validation
      return {
        ...structuredClone(DEFAULT_SETTINGS),
        ...parsed,
        bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      };
    } catch (e) {
      console.warn('Settings load failed, using defaults', e);
      return structuredClone(DEFAULT_SETTINGS);
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  const els = {
    html: document.documentElement,
    clock: document.getElementById('clock'),
    themeToggle: document.getElementById('themeToggle'),
    searchEngine: document.getElementById('searchEngine'),
    searchForm: document.getElementById('searchForm'),
    searchInput: document.getElementById('searchInput'),
    bookmarksGrid: document.getElementById('bookmarksGrid'),
    addBookmark: document.getElementById('addBookmark'),
    dialog: document.getElementById('bookmarkDialog'),
    dialogTitle: document.getElementById('dialogTitle'),
    bookmarkForm: document.getElementById('bookmarkForm'),
    bookmarkId: document.getElementById('bookmarkId'),
    bookmarkTitle: document.getElementById('bookmarkTitle'),
    bookmarkUrl: document.getElementById('bookmarkUrl'),
    exportBtn: document.getElementById('exportBtn'),
    importInput: document.getElementById('importInput'),
    setBackground: document.getElementById('setBackground'),
    clearBackground: document.getElementById('clearBackground'),
    bgInput: document.getElementById('bgInput'),
    deleteBookmark: document.getElementById('deleteBookmark'),
  };

  let state = loadSettings();

  init();

  function init() {
    applyTheme(state.theme);
    els.searchEngine.value = state.searchEngine;
    applyBackground(state.background);
    renderBookmarks();
    startClock();

    // Events
    els.themeToggle.addEventListener('click', toggleTheme);
    els.searchEngine.addEventListener('change', onSearchEngineChange);
    els.searchForm.addEventListener('submit', onSearchSubmit);
    els.addBookmark.addEventListener('click', () => openBookmarkDialog());
    els.bookmarkForm.addEventListener('submit', onBookmarkSave);
    els.exportBtn.addEventListener('click', onExport);
    els.importInput.addEventListener('change', onImport);
    els.setBackground.addEventListener('click', () => els.bgInput.click());
    els.clearBackground.addEventListener('click', onClearBackground);
    els.bgInput.addEventListener('change', onBackgroundSelected);
    els.deleteBookmark.addEventListener('click', onDeleteInsideDialog);
  }

  function startClock() {
    updateClock();
    setInterval(updateClock, 1000);
  }

  function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    els.clock.textContent = timeStr;
  }

  function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme(state.theme);
    saveSettings(state);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function onSearchEngineChange() {
    state.searchEngine = els.searchEngine.value;
    saveSettings(state);
  }

  function onSearchSubmit(e) {
    e.preventDefault();
    const q = els.searchInput.value.trim();
    if (!q) return;

    // If looks like URL, navigate directly
    if (/^https?:\/\//i.test(q) || (/^[\w-]+\.[\w.-]+\/?/.test(q) && !q.includes(' '))) {
      const url = /^https?:\/\//i.test(q) ? q : 'https://' + q;
      window.location.href = url;
      return;
    }

    const url = buildSearchUrl(state.searchEngine, q);
    window.location.href = url;
  }

  function buildSearchUrl(engine, query) {
    const encoded = encodeURIComponent(query);
    switch (engine) {
      case 'yandex':
        return `https://yandex.ru/search/?text=${encoded}`;
      case 'duckduckgo':
        return `https://duckduckgo.com/?q=${encoded}`;
      case 'google':
      default:
        return `https://www.google.com/search?q=${encoded}`;
    }
  }

  function renderBookmarks() {
    els.bookmarksGrid.innerHTML = '';
    if (!Array.isArray(state.bookmarks)) state.bookmarks = [];

    state.bookmarks.forEach((bm) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('role', 'listitem');

      const link = document.createElement('a');
      link.href = bm.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = bm.title;
      link.style.gridColumn = '2 / span 1';
      link.style.gridRow = '1 / span 2';

      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = bm.title;

      const url = document.createElement('div');
      url.className = 'url';
      url.textContent = bm.url;

      link.appendChild(title);
      link.appendChild(url);

      const favicon = document.createElement('div');
      favicon.className = 'favicon';
      const domain = safeDomainFromUrl(bm.url);
      const faviconImg = document.createElement('img');
      faviconImg.width = 24;
      faviconImg.height = 24;
      faviconImg.alt = '';
      faviconImg.referrerPolicy = 'no-referrer';
      faviconImg.src = domain ? `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent('https://' + domain)}` : '';
      if (domain) {
        favicon.appendChild(faviconImg);
      } else {
        favicon.textContent = '🔖';
      }

      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.title = 'Редактировать';
      editBtn.setAttribute('aria-label', 'Редактировать ярлык');
      editBtn.textContent = '✏️';
      editBtn.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); openBookmarkDialog(bm); });

      card.appendChild(favicon);
      card.appendChild(link);
      card.appendChild(editBtn);

      els.bookmarksGrid.appendChild(card);
    });
  }

  function safeDomainFromUrl(rawUrl) {
    try {
      const u = new URL(rawUrl);
      return u.hostname;
    } catch {
      return '';
    }
  }

  function openBookmarkDialog(existing) {
    els.bookmarkForm.reset();
    if (existing) {
      els.dialogTitle.textContent = 'Редактировать ярлык';
      els.bookmarkId.value = existing.id;
      els.bookmarkTitle.value = existing.title;
      els.bookmarkUrl.value = existing.url;
      if (els.deleteBookmark) els.deleteBookmark.style.display = '';
    } else {
      els.dialogTitle.textContent = 'Новый ярлык';
      els.bookmarkId.value = '';
      if (els.deleteBookmark) els.deleteBookmark.style.display = 'none';
    }
    if (typeof els.dialog.showModal === 'function') {
      els.dialog.showModal();
    } else {
      els.dialog.setAttribute('open', '');
    }
  }

  function onBookmarkSave(e) {
    e.preventDefault();
    const id = els.bookmarkId.value || cryptoRandomId();
    const title = els.bookmarkTitle.value.trim();
    const url = normalizeUrl(els.bookmarkUrl.value.trim());
    if (!title || !url) return;

    const existingIndex = state.bookmarks.findIndex((b) => b.id === id);
    const record = { id, title, url };
    if (existingIndex >= 0) {
      state.bookmarks.splice(existingIndex, 1, record);
    } else {
      state.bookmarks.push(record);
    }

    saveSettings(state);
    renderBookmarks();
    closeDialog();
  }

  function normalizeUrl(input) {
    if (!input) return '';
    if (/^https?:\/\//i.test(input)) return input;
    return 'https://' + input;
  }

  function closeDialog() {
    if (typeof els.dialog.close === 'function') els.dialog.close();
    else els.dialog.removeAttribute('open');
  }

  function deleteBookmark(id) {
    if (!id) return;
    state.bookmarks = state.bookmarks.filter((b) => b.id !== id);
    saveSettings(state);
    renderBookmarks();
  }

  function onExport() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `startpage-settings-${date}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  }

  function onImport(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result || '{}'));
        // Replace entire state with validation
        state = {
          ...structuredClone(DEFAULT_SETTINGS),
          ...imported,
          bookmarks: Array.isArray(imported.bookmarks) ? imported.bookmarks : [],
        };
        saveSettings(state);
        applyTheme(state.theme);
        els.searchEngine.value = state.searchEngine;
        applyBackground(state.background);
        renderBookmarks();
      } catch (e) {
        alert('Не удалось импортировать файл настроек');
      } finally {
        ev.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  function onBackgroundSelected(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      state.background = { type: 'image', dataUrl };
      saveSettings(state);
      applyBackground(state.background);
      ev.target.value = '';
    };
    reader.readAsDataURL(file);
  }

  function onClearBackground() {
    state.background = { type: 'none', dataUrl: '' };
    saveSettings(state);
    applyBackground(state.background);
  }

  function applyBackground(bg) {
    if (bg && bg.type === 'image' && bg.dataUrl) {
      document.body.style.backgroundImage = `url('${bg.dataUrl}')`;
    } else {
      document.body.style.backgroundImage = '';
    }
  }

  function onDeleteInsideDialog() {
    const id = els.bookmarkId.value;
    if (!id) return;
    if (!confirm('Удалить ярлык?')) return;
    deleteBookmark(id);
    closeDialog();
  }
})();