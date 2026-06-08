/**
 * Proxy Finder — Main Application
 * 
 * Entry point that coordinates all modules.
 * Handles data loading, UI initialization, refresh logic,
 * and error handling.
 * 
 * @version 1.0.0
 * @date 2026-06
 */

(function () {
  'use strict';

  // Module references
  var DataLoader = null;
  var UIController = null;

  // Auto-refresh interval (30 minutes)
  var AUTO_REFRESH_INTERVAL = 30 * 60 * 1000;
  var autoRefreshTimer = null;

  /**
   * Initialize the application.
   */
  function init() {
    // Check that required modules are loaded
    if (!window.ProxyDataLoader) {
      showFatalError('Data Loader module failed to load. Please refresh the page.');
      return;
    }
    if (!window.ProxyUIController) {
      showFatalError('UI Controller module failed to load. Please refresh the page.');
      return;
    }
    if (!window.QRGenerator) {
      console.warn('QR Generator module not loaded. QR features will be disabled.');
    }

    DataLoader = window.ProxyDataLoader;
    UIController = window.ProxyUIController;

    // Initialize UI with DOM element references
    UIController.initUI({
      searchInput: 'proxy-search-input',
      typeFilter: 'type-filter',
      gradeFilter: 'grade-filter',
      statusFilter: 'status-filter',
      pageSizeSelect: 'page-size-select',
      refreshBtn: 'refresh-btn',
      proxyTableBody: 'proxy-table-body',
      paginationContainer: 'pagination-container',
      recommendationsContainer: 'recommendations-container',
      leaderboardBody: 'leaderboard-body',
      resultCount: 'result-count',
      lastUpdate: 'last-update',
      statTotalConfigs: 'stat-total-configs',
      statChannels: 'stat-channels',
      statAlive: 'stat-alive',
      statGradeA: 'stat-grade-a',
      statGradeB: 'stat-grade-b',
      statGradeC: 'stat-grade-c'
    });

    // Load data
    loadData(false);

    // Start auto-refresh
    startAutoRefresh();
  }

  /**
   * Load all proxy data from JSON files.
   * @param {boolean} forceRefresh — Bypass cache
   */
  function loadData(forceRefresh) {
    UIController.setLoading();

    DataLoader.loadAllData(forceRefresh)
      .then(function (data) {
        if (data._error && !data.proxies) {
          // No data at all
          UIController.setError(data._error);
          return;
        }

        UIController.setData(data);

        // Check for stale data
        var loadTime = DataLoader.getLoadTimestamp('stats');
        if (loadTime && (Date.now() - loadTime) > 60 * 60 * 1000) {
          console.log('Data is more than 1 hour old. Consider running the scraper.');
        }
      })
      .catch(function (error) {
        console.error('Failed to load proxy data:', error);
        UIController.setError(
          'Failed to load proxy data. The data files may not exist yet. ' +
          'Please make sure the proxy finder scraper has been run at least once.'
        );
      });
  }

  /**
   * Start the auto-refresh timer.
   */
  function startAutoRefresh() {
    stopAutoRefresh();

    autoRefreshTimer = setInterval(function () {
      console.log('Auto-refreshing proxy data...');
      loadData(true);
    }, AUTO_REFRESH_INTERVAL);
  }

  /**
   * Stop the auto-refresh timer.
   */
  function stopAutoRefresh() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  }

  /**
   * Manual refresh — bypass cache.
   */
  function refresh() {
    loadData(true);
  }

  /**
   * Show a fatal error message.
   * @param {string} message
   */
  function showFatalError(message) {
    var container = document.getElementById('loading-section');
    if (container) {
      container.innerHTML =
        '<div class="empty-state" style="padding: var(--space-2xl); text-align: center;">' +
        '<div class="empty-state__icon">⚠️</div>' +
        '<div class="empty-state__title">Something went wrong</div>' +
        '<div class="empty-state__text">' + message + '</div>' +
        '<button class="btn btn--secondary mt-lg" onclick="location.reload()">🔄 Refresh Page</button>' +
        '</div>';
    }
  }

  /**
   * Clean up when the page is unloaded.
   */
  function cleanup() {
    stopAutoRefresh();
    if (window.QRGenerator && window.QRGenerator.closeAllQRModals) {
      window.QRGenerator.closeAllQRModals();
    }
  }

  // ============================================
  // INITIALIZE ON DOM READY
  // ============================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('pagehide', cleanup);

  // ============================================
  // PUBLIC API
  // ============================================

  window.ProxyFinderApp = {
    refresh: refresh,
    loadData: loadData,
    stopAutoRefresh: stopAutoRefresh
  };

})();
