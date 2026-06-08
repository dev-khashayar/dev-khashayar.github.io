/**
 * Proxy Finder — UI Controller
 * 
 * Manages all UI interactions: search, filter, sort, pagination,
 * table rendering, stats display, recommendation cards, leaderboard,
 * copy actions, QR codes, deep links, and favorites.
 * 
 * @version 1.0.0
 * @date 2026-06
 */

(function () {
  'use strict';

  // --- State ---
  var state = {
    allProxies: [],
    filteredProxies: [],
    recommendations: [],
    fastest: [],
    leaderboard: [],
    stats: null,
    feed: null,
    health: null,

    // Filters
    searchQuery: '',
    typeFilter: 'all',
    gradeFilter: 'all',
    statusFilter: 'active',
    sortBy: 'trust_score',
    sortDirection: 'desc',

    // Pagination
    currentPage: 1,
    pageSize: 25,

    // Favorites (stored in localStorage)
    favorites: {},

    // UI state
    isLoading: true,
    lastUpdate: null
  };

  // --- DOM References (set on init) ---
  var dom = {};

  /**
   * Initialize the UI controller.
   * @param {Object} elements — Object with DOM element IDs mapped to their IDs
   */
  function initUI(elements) {
    // Cache DOM references
    for (var key in elements) {
      if (elements.hasOwnProperty(key)) {
        dom[key] = document.getElementById(elements[key]);
      }
    }

    // Load favorites from localStorage
    loadFavorites();

    // Set up event listeners
    setupSearch();
    setupFilters();
    setupSortButtons();
    setupRefreshButton();
    setupPageSizeSelector();

    // Initial state
    updateLastUpdateDisplay();
  }

  /**
   * Load favorites from localStorage.
   */
  function loadFavorites() {
    try {
      var stored = localStorage.getItem('proxy-finder-favorites');
      if (stored) {
        state.favorites = JSON.parse(stored);
      }
    } catch (e) {
      state.favorites = {};
    }
  }

  /**
   * Save favorites to localStorage.
   */
  function saveFavorites() {
    try {
      localStorage.setItem('proxy-finder-favorites', JSON.stringify(state.favorites));
    } catch (e) {
      console.warn('Could not save favorites:', e.message);
    }
  }

  /**
   * Toggle favorite status for a proxy.
   * @param {string} proxyId
   * @returns {boolean} — New favorite status
   */
  function toggleFavorite(proxyId) {
    if (state.favorites[proxyId]) {
      delete state.favorites[proxyId];
      saveFavorites();
      return false;
    } else {
      state.favorites[proxyId] = {
        addedAt: new Date().toISOString(),
        id: proxyId
      };
      saveFavorites();
      return true;
    }
  }

  /**
   * Check if a proxy is favorited.
   * @param {string} proxyId
   * @returns {boolean}
   */
  function isFavorite(proxyId) {
    return !!state.favorites[proxyId];
  }

  /**
   * Set all proxy data and render the UI.
   * @param {Object} data — From ProxyDataLoader.loadAllData()
   */
  function setData(data) {
    state.allProxies = data.proxies || [];
    state.recommendations = data.recommendations || [];
    state.fastest = data.fastest || [];
    state.leaderboard = data.leaderboard || [];
    state.stats = data.stats || {};
    state.feed = data.feed || [];
    state.health = data.health || {};
    state.lastUpdate = data.stats ? data.stats.generated_at : null;
    state.isLoading = false;

    // Apply current filters
    applyFilters();

    // Render all sections
    renderAll();
  }

  /**
   * Set loading state.
   */
  function setLoading() {
    state.isLoading = true;
    renderLoadingState();
  }

  /**
   * Set error state.
   * @param {string} message
   */
  function setError(message) {
    state.isLoading = false;
    renderErrorState(message);
  }

  // ============================================
  // FILTERING & SORTING
  // ============================================

  /**
   * Apply all active filters and sorting to the proxy list.
   */
  function applyFilters() {
    var filtered = state.allProxies.slice();

    // Type filter
    if (state.typeFilter !== 'all') {
      filtered = filtered.filter(function (p) {
        return p.type === state.typeFilter;
      });
    }

    // Grade filter
    if (state.gradeFilter !== 'all') {
      filtered = filtered.filter(function (p) {
        return p.trust_grade === state.gradeFilter;
      });
    }

    // Status filter
    if (state.statusFilter !== 'all') {
      filtered = filtered.filter(function (p) {
        return p.status === state.statusFilter;
      });
    }

    // Search query
    if (state.searchQuery) {
      var query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(function (p) {
        return (p.url && p.url.toLowerCase().indexOf(query) !== -1) ||
               (p.source && p.source.toLowerCase().indexOf(query) !== -1) ||
               (p.type && p.type.toLowerCase().indexOf(query) !== -1) ||
               (p.id && p.id.toLowerCase().indexOf(query) !== -1);
      });
    }

    // Sort
    filtered.sort(function (a, b) {
      var valA = a[state.sortBy];
      var valB = b[state.sortBy];

      // Handle null/undefined
      if (valA === null || valA === undefined) valA = state.sortDirection === 'asc' ? Infinity : -Infinity;
      if (valB === null || valB === undefined) valB = state.sortDirection === 'asc' ? Infinity : -Infinity;

      // Handle strings
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (state.sortDirection === 'asc') {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });

    state.filteredProxies = filtered;
    state.currentPage = 1;
  }

  /**
   * Set a filter value and re-apply.
   * @param {string} filterName
   * @param {string} value
   */
  function setFilter(filterName, value) {
    state[filterName] = value;
    applyFilters();
    renderProxyTable();
    renderPagination();
    updateResultCount();
  }

  /**
   * Set sort criteria and re-apply.
   * @param {string} sortBy
   */
  function setSort(sortBy) {
    if (state.sortBy === sortBy) {
      // Toggle direction
      state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortBy = sortBy;
      state.sortDirection = 'desc';
    }
    applyFilters();
    renderProxyTable();
    updateSortIndicators();
  }

  // ============================================
  // EVENT SETUP
  // ============================================

  function setupSearch() {
    var input = dom.searchInput;
    if (!input) return;

    var debounceTimeout;
    input.addEventListener('input', function () {
      clearTimeout(debounceTimeout);
      var self = this;
      debounceTimeout = setTimeout(function () {
        state.searchQuery = self.value.trim();
        applyFilters();
        renderProxyTable();
        renderPagination();
        updateResultCount();
      }, 250);
    });
  }

  function setupFilters() {
    // Type filter
    var typeSelect = dom.typeFilter;
    if (typeSelect) {
      typeSelect.addEventListener('change', function () {
        setFilter('typeFilter', this.value);
      });
    }

    // Grade filter
    var gradeSelect = dom.gradeFilter;
    if (gradeSelect) {
      gradeSelect.addEventListener('change', function () {
        setFilter('gradeFilter', this.value);
      });
    }

    // Status filter
    var statusSelect = dom.statusFilter;
    if (statusSelect) {
      statusSelect.addEventListener('change', function () {
        setFilter('statusFilter', this.value);
      });
    }
  }

  function setupSortButtons() {
    var sortButtons = document.querySelectorAll('[data-sort]');
    sortButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sortBy = this.getAttribute('data-sort');
        setSort(sortBy);
      });
    });
  }

  function setupRefreshButton() {
    var btn = dom.refreshBtn;
    if (!btn) return;

    btn.addEventListener('click', function () {
      if (typeof window.ProxyFinderApp !== 'undefined' && window.ProxyFinderApp.refresh) {
        window.ProxyFinderApp.refresh();
      }
    });
  }

  function setupPageSizeSelector() {
    var select = dom.pageSizeSelect;
    if (!select) return;

    select.addEventListener('change', function () {
      state.pageSize = parseInt(this.value, 10);
      state.currentPage = 1;
      renderProxyTable();
      renderPagination();
    });
  }

  // ============================================
  // RENDER: ALL SECTIONS
  // ============================================

  function renderAll() {
    renderStats();
    renderRecommendations();
    renderProxyTable();
    renderPagination();
    renderLeaderboard();
    updateResultCount();
    updateLastUpdateDisplay();
    updateSortIndicators();
    hideLoadingState();
    showDashboardView();
  }

  function renderLoadingState() {
    var container = dom.proxyTableBody;
    if (container) {
      container.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: var(--space-2xl);"><div class="loading-spinner" style="margin: 0 auto;"></div><p style="margin-top: var(--space-md); color: var(--color-text-muted);">Loading configurations...</p></td></tr>';
    }
  }

  function renderErrorState(message) {
    var container = dom.proxyTableBody;
    if (container) {
      container.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: var(--space-2xl);"><div style="font-size: 2rem; margin-bottom: var(--space-md);">⚠️</div><p style="color: var(--color-text-muted);">' + (message || 'Failed to load data.') + '</p><button class="btn btn--secondary mt-lg" onclick="location.reload()">🔄 Retry</button></td></tr>';
    }
  }

  function hideLoadingState() {
    // Loading state is automatically replaced by renderProxyTable()
  }

  function showDashboardView() {
    var loadingEl = document.getElementById('loading-section');
    var dashboardEl = document.getElementById('dashboard-section');
    if (loadingEl) loadingEl.style.display = 'none';
    if (dashboardEl) dashboardEl.style.display = '';
  }

  // ============================================
  // RENDER: STATS
  // ============================================

  function renderStats() {
    var stats = state.stats;
    if (!stats) return;

    updateElement('stat-total-configs', formatNumber(stats.total_configs || state.allProxies.length));
    updateElement('stat-channels', formatNumber(stats.channels_checked || 0));
    updateElement('stat-alive', formatNumber(stats.proxies_alive || 0));
    updateElement('stat-grade-a', formatNumber(countByGrade('A')));
    updateElement('stat-grade-b', formatNumber(countByGrade('B')));
    updateElement('stat-grade-c', formatNumber(countByGrade('C')));
  }

  function countByGrade(grade) {
    return state.allProxies.filter(function (p) {
      return p.trust_grade === grade;
    }).length;
  }

  // ============================================
  // RENDER: RECOMMENDATIONS
  // ============================================

  function renderRecommendations() {
    var container = dom.recommendationsContainer;
    if (!container) return;

    var recs = state.recommendations.length > 0 ? state.recommendations : state.fastest;
    if (recs.length === 0) {
      container.innerHTML = '';
      return;
    }

    var top3 = recs.slice(0, 3);
    var html = '';

    top3.forEach(function (proxy, index) {
      var typeLabel = window.QRGenerator ? window.QRGenerator.getTypeLabel(proxy.type) : proxy.type.toUpperCase();
      var latencyDisplay = proxy.latency_ms ? proxy.latency_ms + 'ms' : 'N/A';
      var gradeClass = 'rec-card__grade--' + (proxy.trust_grade || 'C').toLowerCase();
      var isFav = isFavorite(proxy.id);

      html += '<div class="rec-card">';
      html += '  <div class="rec-card__rank">#' + (index + 1) + '</div>';
      html += '  <div class="rec-card__content">';
      html += '    <div class="rec-card__header">';
      html += '      <span class="rec-card__type rec-card__type--' + proxy.type + '">' + typeLabel + '</span>';
      html += '      <span class="rec-card__grade ' + gradeClass + '">' + (proxy.trust_grade || 'C') + '</span>';
      html += '    </div>';
      html += '    <div class="rec-card__url" title="' + escapeHtml(proxy.url) + '">' + truncateUrl(proxy.url, 60) + '</div>';
      html += '    <div class="rec-card__meta">';
      html += '      <span>⏱ ' + latencyDisplay + '</span>';
      html += '      <span>📊 Trust: ' + (proxy.trust_score || 0) + '</span>';
      html += '      <span>📡 ' + escapeHtml(proxy.source || 'Unknown') + '</span>';
      html += '    </div>';
      html += '  </div>';
      html += '  <div class="rec-card__actions">';
      html += '    <button class="btn btn--copy" onclick="window.QRGenerator.copyToClipboard(\'' + escapeJs(proxy.url) + '\', this)" title="Copy">📋</button>';
      html += '    <button class="btn btn--copy" onclick="window.QRGenerator.showQRCode(\'' + escapeJs(proxy.url) + '\', \'' + proxy.type + '\')" title="QR Code">📱</button>';
      html += '    <button class="btn btn--copy' + (isFav ? ' copied' : '') + '" onclick="window.ProxyUIController.handleFavoriteClick(\'' + proxy.id + '\', this)" title="Favorite">' + (isFav ? '★' : '☆') + '</button>';
      html += '  </div>';
      html += '</div>';
    });

    container.innerHTML = html;
  }

  // ============================================
  // RENDER: PROXY TABLE
  // ============================================

  function renderProxyTable() {
    var tbody = dom.proxyTableBody;
    if (!tbody) return;

    var proxies = state.filteredProxies;
    if (proxies.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: var(--space-2xl); color: var(--color-text-muted);">No configurations match your filters. <button class="btn btn--secondary mt-md" onclick="window.ProxyUIController.resetFilters()">Reset Filters</button></td></tr>';
      return;
    }

    // Paginate
    var startIndex = (state.currentPage - 1) * state.pageSize;
    var endIndex = Math.min(startIndex + state.pageSize, proxies.length);
    var pageData = proxies.slice(startIndex, endIndex);

    var html = '';

    pageData.forEach(function (proxy) {
      var typeLabel = window.QRGenerator ? window.QRGenerator.getTypeLabel(proxy.type) : proxy.type.toUpperCase();
      var latencyDisplay = proxy.latency_ms ? proxy.latency_ms + 'ms' : '<span style="color: var(--color-text-muted);">—</span>';
      var gradeClass = 'td-grade--' + (proxy.trust_grade || 'C').toLowerCase();
      var statusClass = proxy.status === 'active' ? 'td-status--live' : 'td-status--dead';
      var statusLabel = proxy.status === 'active' ? 'Active' : 'Dead';
      var isFav = isFavorite(proxy.id);

      html += '<tr>';
      html += '<td><span class="td-type td-type--' + proxy.type + '">' + typeLabel + '</span></td>';
      html += '<td class="td-latency">' + latencyDisplay + '</td>';
      html += '<td><span class="td-grade ' + gradeClass + '">' + (proxy.trust_grade || 'C') + ' · ' + (proxy.trust_score || 0) + '</span></td>';
      html += '<td><span class="td-status ' + statusClass + '">' + statusLabel + '</span></td>';
      html += '<td class="td-source" title="' + escapeHtml(proxy.source || '') + '">' + escapeHtml(truncateSource(proxy.source, 20)) + '</td>';
      html += '<td class="td-url" title="' + escapeHtml(proxy.url) + '">' + escapeHtml(truncateUrl(proxy.url, 50)) + '</td>';
      html += '<td class="td-actions">';
      html += '  <button class="btn btn--copy" onclick="window.QRGenerator.copyToClipboard(\'' + escapeJs(proxy.url) + '\', this)" title="Copy">📋</button>';
      html += '  <button class="btn btn--copy" onclick="window.QRGenerator.showQRCode(\'' + escapeJs(proxy.url) + '\', \'' + proxy.type + '\')" title="QR Code">📱</button>';
      html += '  <button class="btn btn--copy" onclick="window.QRGenerator.openDeepLink(\'' + escapeJs(proxy.url) + '\', \'' + proxy.type + '\')" title="Import to App">🔗</button>';
      html += '  <button class="btn btn--copy' + (isFav ? ' copied' : '') + '" onclick="window.ProxyUIController.handleFavoriteClick(\'' + proxy.id + '\', this)" title="' + (isFav ? 'Remove from Favorites' : 'Add to Favorites') + '">' + (isFav ? '★' : '☆') + '</button>';
      html += '</td>';
      html += '</tr>';
    });

    tbody.innerHTML = html;
    updateResultCount();
  }

  // ============================================
  // RENDER: PAGINATION
  // ============================================

  function renderPagination() {
    var container = dom.paginationContainer;
    if (!container) return;

    var totalItems = state.filteredProxies.length;
    var totalPages = Math.ceil(totalItems / state.pageSize);
    var currentPage = state.currentPage;

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    var html = '';

    // Previous
    html += '<button class="pagination-btn" ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="window.ProxyUIController.goToPage(' + (currentPage - 1) + ')">←</button>';

    // Page numbers
    var startPage = Math.max(1, currentPage - 2);
    var endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      html += '<button class="pagination-btn" onclick="window.ProxyUIController.goToPage(1)">1</button>';
      if (startPage > 2) {
        html += '<span class="pagination-info">...</span>';
      }
    }

    for (var i = startPage; i <= endPage; i++) {
      html += '<button class="pagination-btn' + (i === currentPage ? ' active' : '') + '" onclick="window.ProxyUIController.goToPage(' + i + ')">' + i + '</button>';
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        html += '<span class="pagination-info">...</span>';
      }
      html += '<button class="pagination-btn" onclick="window.ProxyUIController.goToPage(' + totalPages + ')">' + totalPages + '</button>';
    }

    // Next
    html += '<button class="pagination-btn" ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="window.ProxyUIController.goToPage(' + (currentPage + 1) + ')">→</button>';

    // Info
    var showingStart = (currentPage - 1) * state.pageSize + 1;
    var showingEnd = Math.min(currentPage * state.pageSize, totalItems);
    html += '<span class="pagination-info">' + showingStart + '-' + showingEnd + ' of ' + totalItems + '</span>';

    container.innerHTML = html;
  }

  function goToPage(page) {
    var totalPages = Math.ceil(state.filteredProxies.length / state.pageSize);
    if (page < 1 || page > totalPages) return;
    state.currentPage = page;
    renderProxyTable();
    renderPagination();

    // Scroll to top of table
    var tableEl = document.getElementById('proxy-table-wrapper');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ============================================
  // RENDER: LEADERBOARD
  // ============================================

  function renderLeaderboard() {
    var container = dom.leaderboardBody;
    if (!container) return;

    var lb = state.leaderboard;
    if (!lb || lb.length === 0) {
      container.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: var(--space-lg); color: var(--color-text-muted);">No leaderboard data available.</td></tr>';
      return;
    }

    var html = '';
    var top10 = lb.slice(0, 10);

    top10.forEach(function (source, index) {
      html += '<tr>';
      html += '<td class="lb-rank">#' + (index + 1) + '</td>';
      html += '<td class="lb-source"><a href="https://t.me/s/' + escapeHtml(source.source) + '" target="_blank" rel="noopener noreferrer">@' + escapeHtml(source.source) + '</a></td>';
      html += '<td class="lb-configs">' + (source.configs || 0) + '</td>';
      html += '<td class="lb-trust">' + (source.trust || 0) + '</td>';
      html += '</tr>';
    });

    container.innerHTML = html;
  }

  // ============================================
  // UPDATE HELPERS
  // ============================================

  function updateResultCount() {
    var el = dom.resultCount;
    if (!el) return;
    var total = state.filteredProxies.length;
    el.textContent = total + ' configuration' + (total !== 1 ? 's' : '') + ' found';
  }

  function updateLastUpdateDisplay() {
    var el = dom.lastUpdate;
    if (!el) return;

    if (state.lastUpdate) {
      var timeAgo = getTimeAgo(state.lastUpdate);
      el.textContent = 'Updated ' + timeAgo;
      el.style.display = '';
    } else if (state.stats && state.stats.generated_at) {
      var timeAgo2 = getTimeAgo(state.stats.generated_at);
      el.textContent = 'Updated ' + timeAgo2;
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  }

  function updateSortIndicators() {
    var headers = document.querySelectorAll('#proxy-table thead th[data-sort]');
    headers.forEach(function (th) {
      var sortKey = th.getAttribute('data-sort');
      // Remove existing indicators
      var existingIcon = th.querySelector('.sort-icon');
      if (existingIcon) existingIcon.remove();
      th.classList.remove('sorted');

      if (sortKey === state.sortBy) {
        th.classList.add('sorted');
        var icon = document.createElement('span');
        icon.className = 'sort-icon';
        icon.textContent = state.sortDirection === 'asc' ? ' ▲' : ' ▼';
        th.appendChild(icon);
      }
    });
  }

  function updateElement(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // ============================================
  // PUBLIC ACTIONS
  // ============================================

  function handleFavoriteClick(proxyId, buttonEl) {
    var isNowFav = toggleFavorite(proxyId);
    if (buttonEl) {
      if (isNowFav) {
        buttonEl.textContent = '★';
        buttonEl.classList.add('copied');
      } else {
        buttonEl.textContent = '☆';
        buttonEl.classList.remove('copied');
      }
    }
    // Refresh recommendations to update favorite stars
    renderRecommendations();
    renderProxyTable();
  }

  function resetFilters() {
    state.searchQuery = '';
    state.typeFilter = 'all';
    state.gradeFilter = 'all';
    state.statusFilter = 'active';
    state.sortBy = 'trust_score';
    state.sortDirection = 'desc';

    // Reset UI elements
    if (dom.searchInput) dom.searchInput.value = '';
    if (dom.typeFilter) dom.typeFilter.value = 'all';
    if (dom.gradeFilter) dom.gradeFilter.value = 'all';
    if (dom.statusFilter) dom.statusFilter.value = 'active';

    applyFilters();
    renderProxyTable();
    renderPagination();
    updateResultCount();
    updateSortIndicators();
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return Number(num).toLocaleString('en-US');
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function escapeJs(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  function truncateUrl(url, maxLen) {
    if (!url) return '';
    if (url.length <= maxLen) return url;
    return url.substring(0, maxLen) + '...';
  }

  function truncateSource(source, maxLen) {
    if (!source) return 'Unknown';
    if (source.length <= maxLen) return source;
    return source.substring(0, maxLen) + '...';
  }

  function getTimeAgo(dateStr) {
    if (!dateStr) return 'unknown';

    try {
      var then = new Date(dateStr).getTime();
      var now = Date.now();
      var diffMs = now - then;

      if (isNaN(diffMs)) return 'unknown';
      if (diffMs < 0) return 'just now';

      var seconds = Math.floor(diffMs / 1000);
      var minutes = Math.floor(seconds / 60);
      var hours = Math.floor(minutes / 60);
      var days = Math.floor(hours / 24);

      if (days > 0) return days + ' day' + (days > 1 ? 's' : '') + ' ago';
      if (hours > 0) return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
      if (minutes > 0) return minutes + ' minute' + (minutes > 1 ? 's' : '') + ' ago';
      return 'just now';
    } catch (e) {
      return 'unknown';
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  window.ProxyUIController = {
    initUI: initUI,
    setData: setData,
    setLoading: setLoading,
    setError: setError,
    goToPage: goToPage,
    handleFavoriteClick: handleFavoriteClick,
    resetFilters: resetFilters,
    getState: function () { return state; }
  };

})();
