/**
 * SEO Dashboard — UI Controller (v3)
 * 
 * Manages tab navigation, section rendering, progress bar,
 * loading states, and all user interactions.
 * Coordinates between data, analysis, and visualization components.
 * 
 * Changelog v3:
 * - Added progress bar with percentage and status text
 * - Added loading state management
 * - Added abort capability
 * - File upload zone supports XLSX and CSV
 * - Improved mobile responsiveness for all sections
 * 
 * @version 3.0.0
 * @date 2026-06
 */

(function () {
  'use strict';

  var currentTab = 'overview';
  var currentAnalysis = null;
  var appState = {
    hasData: false,
    dataSource: null,
    periodStart: null,
    periodEnd: null,
    propertyUrl: null,
    brandName: ''
  };

  // Chart instances for cleanup
  var activeCharts = [];

  /**
   * Initialize the dashboard UI.
   * @param {Object} options — { onUploadFile, onConnectGSC, onRefresh, onPeriodChange }
   */
  function initUI(options) {
    setupTabs();
    setupUploadZone(options.onUploadFile);
    setupConnectButton(options.onConnectGSC);
    setupPeriodSelector(options.onPeriodChange);
    setupBrandInput();
    setupRefreshButton(options.onRefresh);
    setupAbortButton();
    checkExistingData();
  }

  // ============================================
  // PROGRESS BAR & LOADING
  // ============================================

  /**
   * Show the loading overlay with progress bar.
   */
  function showLoading() {
    var dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection) {
      // Insert loading overlay inside dashboard section
      var existingOverlay = document.querySelector('.loading-overlay');
      if (existingOverlay) existingOverlay.remove();

      var overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.id = 'loading-overlay';
      overlay.innerHTML =
        '<div class="loading-spinner"></div>' +
        '<div class="loading-text" id="loading-text">Loading...</div>' +
        '<div class="loading-progress-container" style="width: 280px; max-width: 80%; margin-top: var(--space-md);">' +
        '  <div class="loading-progress-bar-bg" style="width: 100%; height: 6px; background: var(--color-border); border-radius: 3px; overflow: hidden;">' +
        '    <div class="loading-progress-bar-fill" id="loading-progress-fill" style="width: 0%; height: 100%; background: var(--color-accent-primary); border-radius: 3px; transition: width 0.4s ease;"></div>' +
        '  </div>' +
        '  <div class="loading-progress-text" id="loading-progress-text" style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: var(--space-xs); text-align: center;">0%</div>' +
        '</div>' +
        '<button class="btn btn--secondary" id="loading-abort-btn" style="margin-top: var(--space-lg); font-size: var(--font-size-xs);">Cancel</button>';

      // Find the container and prepend the overlay
      var container = dashboardSection.querySelector('.container');
      if (container) {
        // Hide all tab contents during loading
        var tabContents = dashboardSection.querySelectorAll('.dash-tab-content');
        tabContents.forEach(function (tc) { tc.style.display = 'none'; });

        // Hide KPI cards, health score, tabs during loading
        var kpiGrid = dashboardSection.querySelector('.kpi-grid');
        var healthSection = dashboardSection.querySelector('.health-score-section');
        var dashTabs = dashboardSection.querySelector('.dash-tabs');
        var brandInput = dashboardSection.querySelector('#brand-name-input');

        if (kpiGrid) kpiGrid.style.display = 'none';
        if (healthSection) healthSection.style.display = 'none';
        if (dashTabs) dashTabs.style.display = 'none';
        if (brandInput && brandInput.parentElement) brandInput.parentElement.style.display = 'none';

        // Insert overlay at the top of the container
        container.insertBefore(overlay, container.firstChild);

        // Set up abort button
        setTimeout(function () {
          var abortBtn = document.getElementById('loading-abort-btn');
          if (abortBtn) {
            abortBtn.addEventListener('click', function () {
              if (window.SEODashboardApp && window.SEODashboardApp.abort) {
                window.SEODashboardApp.abort();
              }
              hideLoading();
            });
          }
        }, 100);
      }
    }
  }

  /**
   * Hide the loading overlay.
   */
  function hideLoading() {
    var overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();

    // Restore visibility
    var dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection) {
      var kpiGrid = dashboardSection.querySelector('.kpi-grid');
      var healthSection = dashboardSection.querySelector('.health-score-section');
      var dashTabs = dashboardSection.querySelector('.dash-tabs');
      var brandInput = dashboardSection.querySelector('#brand-name-input');

      if (kpiGrid) kpiGrid.style.display = '';
      if (healthSection) healthSection.style.display = '';
      if (dashTabs) dashTabs.style.display = '';
      if (brandInput && brandInput.parentElement) brandInput.parentElement.style.display = '';
    }
  }

  /**
   * Update the loading progress bar and text.
   * @param {number} percent — 0 to 100
   * @param {string} statusText — Short status message
   */
  function updateProgress(percent, statusText) {
    var fill = document.getElementById('loading-progress-fill');
    var text = document.getElementById('loading-progress-text');

    if (fill) fill.style.width = Math.min(100, Math.max(0, percent)) + '%';
    if (text) text.textContent = Math.round(percent) + '%' + (statusText ? ' — ' + statusText : '');
  }

  /**
   * Update the main loading text.
   * @param {string} text
   */
  function updateLoadingText(text) {
    var el = document.getElementById('loading-text');
    if (el) el.textContent = text;
  }

  // ============================================
  // TAB NAVIGATION
  // ============================================

  function setupTabs() {
    var tabs = document.querySelectorAll('.dash-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var targetTab = this.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });
  }

  /**
   * Switch to a specific tab.
   * @param {string} tabName
   */
  function switchTab(tabName) {
    currentTab = tabName;

    var tabs = document.querySelectorAll('.dash-tab');
    tabs.forEach(function (tab) {
      var tabVal = tab.getAttribute('data-tab');
      if (tabVal === tabName) {
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
      } else {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      }
    });

    var sections = document.querySelectorAll('.dash-tab-content');
    sections.forEach(function (section) {
      var sectionTab = section.getAttribute('data-tab-content');
      if (sectionTab === tabName) {
        section.style.display = '';
      } else {
        section.style.display = 'none';
      }
    });

    if (currentAnalysis && tabName !== 'overview') {
      renderCurrentTab();
    }
  }

  /**
   * Render the content for the currently active tab.
   */
  function renderCurrentTab() {
    if (!currentAnalysis) return;

    // Destroy existing charts in this tab before re-rendering
    cleanupCharts();

    switch (currentTab) {
      case 'overview':
        renderOverviewTab(currentAnalysis);
        break;
      case 'queries':
        renderQueriesTab(currentAnalysis);
        break;
      case 'pages':
        renderPagesTab(currentAnalysis);
        break;
      case 'ctr-health':
        renderCTRHealthTab(currentAnalysis);
        break;
      case 'opportunities':
        renderOpportunitiesTab(currentAnalysis);
        break;
      case 'cannibalization':
        renderCannibalizationTab(currentAnalysis);
        break;
      case 'content-decay':
        renderContentDecayTab(currentAnalysis);
        break;
      case 'device-gap':
        renderDeviceGapTab(currentAnalysis);
        break;
      case 'country':
        renderCountryTab(currentAnalysis);
        break;
      case 'anomalies':
        renderAnomaliesTab(currentAnalysis);
        break;
      case 'brand':
        renderBrandTab(currentAnalysis);
        break;
      case 'action-plan':
        renderActionPlanTab(currentAnalysis);
        break;
    }
  }

  /**
   * Clean up existing chart instances.
   */
  function cleanupCharts() {
    activeCharts.forEach(function (chart) {
      try {
        chart.destroy();
      } catch (e) {
        // Chart already destroyed
      }
    });
    activeCharts = [];
  }

  /**
   * Register a chart instance for cleanup.
   * @param {Chart} chart
   */
  function registerChart(chart) {
    if (chart) activeCharts.push(chart);
    return chart;
  }

  // ============================================
  // UPLOAD ZONE
  // ============================================

  function setupUploadZone(onUpload) {
    var zone = document.getElementById('upload-zone');
    var input = document.getElementById('csv-file-input');
    if (!zone || !input) return;

    // Accept both CSV and XLSX
    input.setAttribute('accept', '.csv,.xlsx,.xls');

    zone.addEventListener('click', function (e) {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
      input.click();
    });

    input.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (file && onUpload) {
        var preview = zone.querySelector('.upload-zone__preview');
        if (preview) {
          var fileName = document.createElement('span');
          fileName.className = 'upload-zone__file-name';
          var icon = file.name.toLowerCase().endsWith('.xlsx') ? '📊' : '📄';
          fileName.textContent = icon + ' ' + file.name;
          preview.innerHTML = '';
          preview.appendChild(fileName);
        }
        onUpload(file);
      }
    });

    // Drag and drop
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('drag-over');
      var file = e.dataTransfer.files[0];
      if (file) {
        var validTypes = ['.csv', '.xlsx', '.xls'];
        var fileName = file.name.toLowerCase();
        var isValid = validTypes.some(function (ext) { return fileName.endsWith(ext); });
        if (isValid && onUpload) {
          onUpload(file);
        } else {
          alert('Please upload a CSV or XLSX file exported from Google Search Console.');
        }
      }
    });
  }

  // ============================================
  // CONNECT BUTTON
  // ============================================

  function setupConnectButton(onConnect) {
    var btn = document.getElementById('connect-gsc-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (onConnect) onConnect();
    });
  }

  // ============================================
  // PERIOD SELECTOR
  // ============================================

  function setupPeriodSelector(onPeriodChange) {
    var select = document.getElementById('period-select');
    if (!select) return;
    select.addEventListener('change', function () {
      var days = parseInt(this.value, 10);
      if (onPeriodChange) onPeriodChange(days);
    });
  }

  // ============================================
  // BRAND NAME INPUT
  // ============================================

  function setupBrandInput() {
    var input = document.getElementById('brand-name-input');
    if (!input) return;

    if (window.SEODashboardData) {
      window.SEODashboardData.getPreference('brandName', '').then(function (saved) {
        if (saved) {
          input.value = saved;
          appState.brandName = saved;
        }
      });
    }

    var debounceTimeout;
    input.addEventListener('input', function () {
      clearTimeout(debounceTimeout);
      var self = this;
      debounceTimeout = setTimeout(function () {
        var value = self.value.trim();
        appState.brandName = value;
        if (window.SEODashboardData) {
          window.SEODashboardData.savePreference('brandName', value);
        }
        if (currentAnalysis && window.SEOAnalysisEngine) {
          currentAnalysis.brandVsNonBrand = window.SEOAnalysisEngine.analyzeBrandVsNonBrand(
            currentAnalysis.topQueries || [], value
          );
          if (currentTab === 'brand') renderBrandTab(currentAnalysis);
        }
      }, 500);
    });
  }

  // ============================================
  // REFRESH & ABORT BUTTONS
  // ============================================

  function setupRefreshButton(onRefresh) {
    var btn = document.getElementById('refresh-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (onRefresh) onRefresh();
    });
  }

  function setupAbortButton() {
    // Abort button is created dynamically in the loading overlay
    // Listener is attached when the overlay is created
  }

  // ============================================
  // DATA CHECK & DASHBOARD DISPLAY
  // ============================================

  function checkExistingData() {
    if (!window.SEODashboardData) return;
    window.SEODashboardData.getLatestRawData('gsc_query').then(function (data) {
      if (data && data.rows && data.rows.length > 0) {
        showDashboard(data);
      }
    }).catch(function () {
      // No data yet — that's fine
    });
  }

  function showDashboard(rawData) {
    var uploadSection = document.getElementById('upload-section');
    var dashboardSection = document.getElementById('dashboard-section');
    var refreshBtn = document.getElementById('refresh-btn');

    if (uploadSection) uploadSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = '';
    if (refreshBtn) refreshBtn.style.display = '';

    var badge = document.getElementById('data-source-badge');
    if (badge) {
      if (rawData.source === 'api') {
        badge.className = 'data-source-badge data-source-badge--api';
        badge.textContent = '🔗 Connected via GSC API';
      } else if (rawData.source === 'xlsx') {
        badge.className = 'data-source-badge data-source-badge--csv';
        badge.textContent = '📊 Imported from XLSX (' + (rawData.rows ? rawData.rows.length : 0) + ' rows)';
      } else {
        badge.className = 'data-source-badge data-source-badge--csv';
        badge.textContent = '📄 Imported from CSV (' + (rawData.rows ? rawData.rows.length : 0) + ' rows)';
      }
    }

    var dateRange = document.getElementById('date-range-display');
    if (dateRange && rawData.periodStart) {
      dateRange.textContent = rawData.periodStart + ' — ' + (rawData.periodEnd || 'Present');
    }

    appState.hasData = true;
    appState.dataSource = rawData.source || 'csv';
    appState.periodStart = rawData.periodStart;
    appState.periodEnd = rawData.periodEnd;
    appState.propertyUrl = rawData.propertyUrl;
  }

  function showDashboardView() {
    var uploadSection = document.getElementById('upload-section');
    var dashboardSection = document.getElementById('dashboard-section');
    var refreshBtn = document.getElementById('refresh-btn');
    if (uploadSection) uploadSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = '';
    if (refreshBtn) refreshBtn.style.display = '';
  }

  function showUploadView() {
    var uploadSection = document.getElementById('upload-section');
    var dashboardSection = document.getElementById('dashboard-section');
    var refreshBtn = document.getElementById('refresh-btn');
    if (uploadSection) uploadSection.style.display = '';
    if (dashboardSection) dashboardSection.style.display = 'none';
    if (refreshBtn) refreshBtn.style.display = 'none';
  }

  function resetDashboard() {
    currentAnalysis = null;
    appState.hasData = false;
    appState.dataSource = null;
    cleanupCharts();
    showUploadView();
  }

  // ============================================
  // DASHBOARD RENDERER
  // ============================================

  function renderDashboard(analysis) {
    cleanupCharts();
    currentAnalysis = analysis;
    appState.hasData = true;
    renderOverviewTab(analysis);
    switchTab('overview');
  }

  // ============================================
  // TAB RENDERERS
  // ============================================

  function renderOverviewTab(analysis) {
    var kpis = analysis.kpis;
    if (!kpis) return;

    updateKPIValue('kpi-clicks', formatNumber(kpis.totalClicks));
    updateKPIValue('kpi-impressions', formatNumber(kpis.totalImpressions));
    updateKPIValue('kpi-ctr', kpis.averageCTR + '%');
    updateKPIValue('kpi-position', kpis.averagePosition);

    if (analysis.healthScore && window.SEOChartBuilder) {
      var gaugeChart = window.SEOChartBuilder.createHealthGauge('health-gauge-chart', analysis.healthScore.score);
      registerChart(gaugeChart);

      var scoreEl = document.getElementById('health-score-value');
      if (scoreEl) scoreEl.textContent = analysis.healthScore.score;

      var messageEl = document.getElementById('health-message');
      if (messageEl) messageEl.textContent = analysis.healthScore.message;

      var breakdown = analysis.healthScore.breakdown;
      updateBreakdownBar('breakdown-ctr', breakdown.ctrScore, 30);
      updateBreakdownBar('breakdown-position', breakdown.positionScore, 25);
      updateBreakdownBar('breakdown-ctrhealth', breakdown.ctrHealthScore, 25);
      updateBreakdownBar('breakdown-opportunity', breakdown.opportunityScore, 20);
    }
  }

  function renderQueriesTab(analysis) {
    if (!analysis.topQueries || !window.SEOTableBuilder) return;
    window.SEOTableBuilder.buildTable({
      containerId: 'top-queries-table',
      columns: [
        { key: 'query', label: 'Query', sortable: true },
        { key: 'clicks', label: 'Clicks', sortable: true },
        { key: 'impressions', label: 'Impressions', sortable: true },
        { key: 'ctr', label: 'CTR', sortable: true, render: function (val) { return (val || 0) + '%'; } },
        { key: 'position', label: 'Position', sortable: true },
        { key: 'expectedCTR', label: 'Expected CTR', sortable: true, render: function (val) { return (val || 0) + '%'; } },
        { key: 'status', label: 'Status', sortable: true, render: function (val) { return window.SEOTableBuilder.renderStatusBadge(val); } }
      ],
      data: analysis.topQueries,
      pageSize: 25,
      searchable: true,
      emptyMessage: 'No query data available.'
    });
  }

  function renderPagesTab(analysis) {
    var container = document.getElementById('top-pages-table');
    if (!analysis.topPages || analysis.topPages.length === 0) {
      if (container) container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">📄</div><div class="empty-state__title">No Page Data</div><div class="empty-state__text">Upload an XLSX with a Pages sheet or include page-level data to see this analysis.</div></div>';
      return;
    }
    if (!window.SEOTableBuilder) return;
    window.SEOTableBuilder.buildTable({
      containerId: 'top-pages-table',
      columns: [
        { key: 'page', label: 'Page URL', sortable: true },
        { key: 'clicks', label: 'Clicks', sortable: true },
        { key: 'impressions', label: 'Impressions', sortable: true },
        { key: 'ctr', label: 'CTR', sortable: true, render: function (val) { return (val || 0) + '%'; } },
        { key: 'position', label: 'Avg Position', sortable: true }
      ],
      data: analysis.topPages,
      pageSize: 25,
      searchable: true,
      emptyMessage: 'No page data available.'
    });
  }

  function renderCTRHealthTab(analysis) {
    if (!analysis.ctrHealth || analysis.ctrHealth.length === 0) return;
    if (window.SEOChartBuilder) {
      var chart = window.SEOChartBuilder.createCTRScatterPlot('ctr-scatter-chart', analysis.ctrHealth);
      registerChart(chart);
    }
    if (window.SEOTableBuilder) {
      window.SEOTableBuilder.buildTable({
        containerId: 'ctr-health-table',
        columns: [
          { key: 'query', label: 'Query', sortable: true },
          { key: 'clicks', label: 'Clicks', sortable: true },
          { key: 'impressions', label: 'Impressions', sortable: true },
          { key: 'ctr', label: 'Actual CTR', sortable: true, render: function (val) { return (val || 0) + '%'; } },
          { key: 'position', label: 'Position', sortable: true },
          { key: 'expectedCTR', label: 'Expected CTR', sortable: true, render: function (val) { return (val || 0) + '%'; } },
          { key: 'ctrGap', label: 'Gap', sortable: true, render: function (val) { return (val > 0 ? '+' : '') + (val || 0) + '%'; } },
          { key: 'status', label: 'Status', sortable: true, render: function (val) { var labels = { critical: 'Critical', warning: 'Warning', healthy: 'Healthy' }; return window.SEOTableBuilder.renderStatusBadge(val, labels[val] || val); } }
        ],
        data: analysis.ctrHealth,
        pageSize: 25,
        searchable: true,
        emptyMessage: 'No CTR health data available.'
      });
    }
  }

  function renderOpportunitiesTab(analysis) {
    if (!analysis.opportunities || analysis.opportunities.length === 0) return;
    if (!window.SEOTableBuilder) return;
    window.SEOTableBuilder.buildTable({
      containerId: 'opportunities-table',
      columns: [
        { key: 'query', label: 'Query', sortable: true },
        { key: 'currentClicks', label: 'Current Clicks', sortable: true },
        { key: 'impressions', label: 'Impressions', sortable: true },
        { key: 'currentPosition', label: 'Position', sortable: true },
        { key: 'potentialClicks', label: 'Potential Clicks', sortable: true },
        { key: 'clickGain', label: 'Click Gain', sortable: true, render: function (val) { return '+' + (val || 0); } },
        { key: 'difficulty', label: 'Difficulty', sortable: true },
        { key: 'category', label: 'Category', sortable: true }
      ],
      data: analysis.opportunities,
      pageSize: 25,
      searchable: true,
      emptyMessage: 'No opportunities found. Great job!'
    });
  }

  function renderCannibalizationTab(analysis) {
    var container = document.getElementById('cannibalization-container');
    if (!container) return;
    container.innerHTML = '';
    var countBadge = document.getElementById('cannibal-count-badge');
    if (countBadge) countBadge.textContent = '';

    if (!analysis.cannibalization || analysis.cannibalization.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">✅</div><div class="empty-state__title">No Cannibalization Detected</div><div class="empty-state__text">Your site does not have keyword cannibalization issues.</div></div>';
      return;
    }

    if (countBadge) countBadge.textContent = analysis.cannibalization.length + ' issues found';

    analysis.cannibalization.forEach(function (group) {
      var groupEl = document.createElement('div');
      groupEl.className = 'cannibal-group';
      var header = document.createElement('div');
      header.className = 'cannibal-group__header';
      header.innerHTML =
        '<span class="cannibal-group__query">"' + group.query + '"</span>' +
        (window.SEOTableBuilder ? window.SEOTableBuilder.renderSeverityBadge(group.severity) : '') +
        '<span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">' + group.urlCount + ' URLs</span>';
      var urlsDiv = document.createElement('div');
      urlsDiv.className = 'cannibal-group__urls';
      group.urls.forEach(function (url) {
        var urlItem = document.createElement('div');
        urlItem.className = 'cannibal-group__url-item';
        urlItem.innerHTML =
          '<span style="font-size: var(--font-size-xs); word-break: break-all;">' + (url.url || 'Unknown URL') + '</span>' +
          '<span class="cannibal-group__url-position">Position ' + (url.position || '?') + '</span>';
        urlsDiv.appendChild(urlItem);
      });
      groupEl.appendChild(header);
      groupEl.appendChild(urlsDiv);
      container.appendChild(groupEl);
    });
  }

  function renderContentDecayTab(analysis) {
    var container = document.getElementById('content-decay-table');
    if (!analysis.contentDecay || analysis.contentDecay.length === 0) {
      if (container) container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">📈</div><div class="empty-state__title">No Content Decay Detected</div><div class="empty-state__text">Upload data from two different periods to detect content decay.</div></div>';
      return;
    }
    if (!window.SEOTableBuilder) return;
    window.SEOTableBuilder.buildTable({
      containerId: 'content-decay-table',
      columns: [
        { key: 'query', label: 'Query', sortable: true },
        { key: 'previousClicks', label: 'Previous Clicks', sortable: true },
        { key: 'currentClicks', label: 'Current Clicks', sortable: true },
        { key: 'clickChange', label: 'Change', sortable: true, render: function (val) { return (val > 0 ? '+' : '') + (val || 0); } },
        { key: 'clickChangePercent', label: 'Change %', sortable: true, render: function (val) { return (val || 0) + '%'; } },
        { key: 'currentPosition', label: 'Curr Position', sortable: true },
        { key: 'stage', label: 'Stage', sortable: true, render: function (val) { var labels = { critical: 'Critical', accelerating: 'Accelerating', early: 'Early' }; var statuses = { critical: 'declining', accelerating: 'at-risk', early: 'stable' }; return window.SEOTableBuilder.renderStatusBadge(statuses[val] || 'stable', labels[val] || val); } }
      ],
      data: analysis.contentDecay,
      pageSize: 25,
      searchable: true,
      emptyMessage: 'No content decay detected.'
    });
  }

  function renderDeviceGapTab(analysis) {
    var container = document.getElementById('device-gap-container');
    if (!analysis.deviceGap || Object.keys(analysis.deviceGap).length === 0) {
      if (container) container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">📱</div><div class="empty-state__title">No Device Data</div><div class="empty-state__text">Upload an XLSX with a Devices sheet to see device-level analysis.</div></div>';
      return;
    }
    if (window.SEOChartBuilder) {
      var chart = window.SEOChartBuilder.createDeviceBarChart('device-bar-chart', analysis.deviceGap);
      registerChart(chart);
    }
    var summaryEl = document.getElementById('device-gap-summary');
    if (summaryEl && analysis.deviceGap.gap) {
      var gap = analysis.deviceGap.gap;
      summaryEl.innerHTML = '';
      if (gap.positionGap > 1.5 || gap.positionGap < -1.5) {
        summaryEl.innerHTML +=
          '<div class="anomaly-item" style="margin-bottom: var(--space-sm);">' +
          '<span class="anomaly-item__icon">⚠️</span>' +
          '<div class="anomaly-item__content">' +
          '<div class="anomaly-item__title">Mobile ranks ' + Math.abs(gap.positionGap).toFixed(1) + ' positions ' + (gap.positionGap > 0 ? 'worse' : 'better') + ' than Desktop</div>' +
          '<div class="anomaly-item__desc">This suggests potential mobile usability or page speed issues.</div>' +
          '</div></div>';
      }
    }
  }

  function renderCountryTab(analysis) {
    var container = document.getElementById('country-table');
    if (!analysis.countryPerformance || analysis.countryPerformance.length === 0) {
      if (container) container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">🌍</div><div class="empty-state__title">No Country Data</div><div class="empty-state__text">Upload an XLSX with a Countries sheet to see geographic analysis.</div></div>';
      return;
    }
    if (window.SEOChartBuilder) {
      var chart = window.SEOChartBuilder.createCountryBarChart('country-bar-chart', analysis.countryPerformance);
      registerChart(chart);
    }
    if (window.SEOTableBuilder) {
      window.SEOTableBuilder.buildTable({
        containerId: 'country-table',
        columns: [
          { key: 'country', label: 'Country', sortable: true },
          { key: 'clicks', label: 'Clicks', sortable: true },
          { key: 'impressions', label: 'Impressions', sortable: true },
          { key: 'ctr', label: 'CTR', sortable: true, render: function (val) { return (val || 0) + '%'; } },
          { key: 'avgPosition', label: 'Avg Position', sortable: true }
        ],
        data: analysis.countryPerformance,
        pageSize: 25,
        searchable: true,
        emptyMessage: 'No country data available.'
      });
    }
  }

  function renderAnomaliesTab(analysis) {
    var container = document.getElementById('anomalies-container');
    if (!container) return;
    container.innerHTML = '';
    if (!analysis.anomalies || analysis.anomalies.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">✨</div><div class="empty-state__title">No Anomalies Detected</div><div class="empty-state__text">Your data looks stable with no unusual patterns.</div></div>';
      return;
    }
    var list = document.createElement('div');
    list.className = 'anomaly-list';
    var iconMap = { 'click_change': '📊', 'position_change': '📉', 'zero_clicks': '🚫' };
    analysis.anomalies.forEach(function (anomaly) {
      var item = document.createElement('div');
      item.className = 'anomaly-item';
      var desc = anomaly.description || '';
      if (!desc) {
        if (anomaly.type === 'click_change') desc = 'Clicks ' + anomaly.direction + 'd by ' + anomaly.changePercent + '%';
        else if (anomaly.type === 'position_change') desc = 'Position ' + anomaly.direction + ' by ' + Math.abs(anomaly.change || 0) + ' positions';
        else if (anomaly.type === 'zero_clicks') desc = 'Ranking #' + anomaly.position + ' with ' + anomaly.impressions + ' impressions but zero clicks.';
      }
      item.innerHTML =
        '<span class="anomaly-item__icon">' + (iconMap[anomaly.type] || '⚠️') + '</span>' +
        '<div class="anomaly-item__content">' +
        '<div class="anomaly-item__title">' + (anomaly.query || 'Unknown Query') + '</div>' +
        '<div class="anomaly-item__desc">' + desc + '</div>' +
        '<div class="anomaly-item__date">Severity: ' + (anomaly.severity || 'medium').toUpperCase() + '</div>' +
        '</div>';
      list.appendChild(item);
    });
    container.appendChild(list);
  }

  function renderBrandTab(analysis) {
    var container = document.getElementById('brand-chart');
    if (!analysis.brandVsNonBrand || (!analysis.brandVsNonBrand.brand.clicks && !analysis.brandVsNonBrand.nonBrand.clicks)) {
      if (container) container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">🏷️</div><div class="empty-state__title">Set Your Brand Name</div><div class="empty-state__text">Enter your brand name above to see brand vs non-brand traffic split.</div></div>';
      return;
    }
    if (window.SEOChartBuilder) {
      var chart = window.SEOChartBuilder.createBrandPieChart('brand-pie-chart', analysis.brandVsNonBrand);
      registerChart(chart);
    }
  }

  function renderActionPlanTab(analysis) {
    var container = document.getElementById('action-plan-container');
    if (!container) return;
    container.innerHTML = '';
    if (!analysis.actionPlan || !analysis.actionPlan.actions || analysis.actionPlan.actions.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">🎉</div><div class="empty-state__title">All Clear!</div><div class="empty-state__text">No critical actions needed right now. Keep monitoring your SEO performance.</div></div>';
      return;
    }
    if (analysis.actionPlan.summary) {
      var summaryEl = document.createElement('div');
      summaryEl.style.cssText = 'margin-bottom: var(--space-lg); padding: var(--space-md) var(--space-lg); background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md);';
      summaryEl.innerHTML =
        '<p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: var(--line-height-relaxed); margin-bottom: var(--space-sm);"><strong>📋 Summary:</strong> ' + analysis.actionPlan.summary.text + '</p>' +
        '<p style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Estimated impact: <strong style="color: var(--color-success);">' + (analysis.actionPlan.estimatedImpact.min || 0) + ' - ' + (analysis.actionPlan.estimatedImpact.max || 0) + ' additional clicks/month</strong></p>';
      container.appendChild(summaryEl);
    }
    var list = document.createElement('div');
    list.className = 'action-plan-list';
    var priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    var sortedActions = (analysis.actionPlan.actions || []).sort(function (a, b) {
      return (priorityOrder[a.finalPriority] || 99) - (priorityOrder[b.finalPriority] || 99);
    });
    sortedActions.forEach(function (action) {
      var item = document.createElement('div');
      item.className = 'action-item';
      var priorityClass = 'action-item__priority--' + (action.finalPriority || 'medium');
      var priorityNum = priorityOrder[action.finalPriority] !== undefined ? priorityOrder[action.finalPriority] + 1 : '?';
      item.innerHTML =
        '<div class="action-item__priority ' + priorityClass + '">' + priorityNum + '</div>' +
        '<div class="action-item__content">' +
        '<div class="action-item__title">' + (action.icon || '📌') + ' ' + action.title + '</div>' +
        '<div class="action-item__desc">' + action.description + '</div>' +
        (action.details ? '<div class="action-item__desc" style="white-space: pre-line; font-size: 0.7rem; margin-top: var(--space-xs); color: var(--color-text-muted);">' + action.details + '</div>' : '') +
        '<div class="action-item__meta">' +
        '<span class="action-item__meta-tag">🕐 ' + (action.effortHours || '?') + ' hours</span>' +
        '<span class="action-item__meta-tag">📈 +' + (action.expectedImpact || 0) + ' ' + (action.impactUnit || 'clicks/month') + '</span>' +
        '<span class="action-item__meta-tag">⏰ ' + (action.timeframe || 'this-week') + '</span>' +
        '</div></div>';
      list.appendChild(item);
    });
    container.appendChild(list);
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return Number(num).toLocaleString('en-US');
  }

  function updateKPIValue(elementId, value) {
    var el = document.getElementById(elementId);
    if (el) el.textContent = value;
  }

  function updateBreakdownBar(elementId, value, max) {
    var el = document.getElementById(elementId);
    if (el) {
      el.textContent = (value || 0) + '/' + max;
      var ratio = (value || 0) / max;
      el.style.color = ratio >= 0.8 ? 'var(--color-success)' : ratio >= 0.5 ? 'var(--color-accent-primary)' : 'var(--color-warning)';
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  window.SEOUIController = {
    initUI: initUI,
    switchTab: switchTab,
    renderDashboard: renderDashboard,
    renderCurrentTab: renderCurrentTab,
    showDashboard: showDashboard,
    showLoading: showLoading,
    hideLoading: hideLoading,
    updateProgress: updateProgress,
    updateLoadingText: updateLoadingText,
    showDashboardView: showDashboardView,
    showUploadView: showUploadView,
    resetDashboard: resetDashboard,
    getAppState: function () { return appState; },
    setAppState: function (key, value) { appState[key] = value; },
    formatNumber: formatNumber
  };

})();
