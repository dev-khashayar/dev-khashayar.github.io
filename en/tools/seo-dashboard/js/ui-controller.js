/**
 * SEO Dashboard — UI Controller
 * 
 * Manages tab navigation, section rendering, and user interactions.
 * Coordinates between data, analysis, and visualization components.
 * 
 * @version 1.0.0
 * @date 2026-06
 */

(function () {
  'use strict';

  var currentTab = 'overview';
  var currentAnalysis = null;
  var appState = {
    hasData: false,
    dataSource: null, // 'csv' | 'api' | null
    periodStart: null,
    periodEnd: null,
    propertyUrl: null,
    brandName: ''
  };

  /**
   * Initialize the dashboard UI.
   * @param {Object} options — { onUploadCSV, onConnectGSC, onRefresh }
   */
  function initUI(options) {
    // Set up tab navigation
    setupTabs();

    // Set up upload zone
    setupUploadZone(options.onUploadCSV);

    // Set up connect button
    setupConnectButton(options.onConnectGSC);

    // Set up period selector
    setupPeriodSelector(options.onPeriodChange);

    // Set up brand name input
    setupBrandInput();

    // Set up refresh button
    setupRefreshButton(options.onRefresh);

    // Check for existing data
    checkExistingData();
  }

  /**
   * Set up tab navigation.
   */
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

    // Update tab active states
    var tabs = document.querySelectorAll('.dash-tab');
    tabs.forEach(function (tab) {
      var tabVal = tab.getAttribute('data-tab');
      if (tabVal === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Show/hide sections
    var sections = document.querySelectorAll('.dash-tab-content');
    sections.forEach(function (section) {
      var sectionTab = section.getAttribute('data-tab-content');
      if (sectionTab === tabName) {
        section.style.display = '';
      } else {
        section.style.display = 'none';
      }
    });

    // If switching to a section that needs rendering, render it
    if (currentAnalysis && tabName !== 'overview') {
      renderCurrentTab();
    }
  }

  /**
   * Render the content for the currently active tab.
   */
  function renderCurrentTab() {
    if (!currentAnalysis) return;

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
   * Set up the CSV upload zone.
   * @param {Function} onUpload — Callback with File object
   */
  function setupUploadZone(onUpload) {
    var zone = document.getElementById('upload-zone');
    var input = document.getElementById('csv-file-input');
    if (!zone || !input) return;

    // Click to open file dialog
    zone.addEventListener('click', function () {
      input.click();
    });

    // File selected
    input.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (file && onUpload) {
        // Show preview
        var preview = zone.querySelector('.upload-zone__preview');
        if (preview) {
          var fileName = document.createElement('span');
          fileName.className = 'upload-zone__file-name';
          fileName.textContent = '📄 ' + file.name;
          preview.innerHTML = '';
          preview.appendChild(fileName);
        }
        onUpload(file);
      }
    });

    // Drag and drop
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', function () {
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('drag-over');
      var file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv') && onUpload) {
        onUpload(file);
      }
    });
  }

  /**
   * Set up the GSC Connect button.
   * @param {Function} onConnect — Callback
   */
  function setupConnectButton(onConnect) {
    var btn = document.getElementById('connect-gsc-btn');
    if (!btn) return;

    btn.addEventListener('click', function () {
      if (onConnect) onConnect();
    });
  }

  /**
   * Set up the period selector.
   * @param {Function} onPeriodChange — Callback with { days }
   */
  function setupPeriodSelector(onPeriodChange) {
    var select = document.getElementById('period-select');
    if (!select) return;

    select.addEventListener('change', function () {
      var days = parseInt(this.value, 10);
      if (onPeriodChange) onPeriodChange(days);
    });
  }

  /**
   * Set up the brand name input.
   */
  function setupBrandInput() {
    var input = document.getElementById('brand-name-input');
    if (!input) return;

    // Load saved brand name
    if (window.SEODashboardData) {
      window.SEODashboardData.getPreference('brandName', '').then(function (saved) {
        if (saved) {
          input.value = saved;
          appState.brandName = saved;
        }
      });
    }

    input.addEventListener('change', function () {
      var value = this.value.trim();
      appState.brandName = value;
      if (window.SEODashboardData) {
        window.SEODashboardData.savePreference('brandName', value);
      }
      // Re-run analysis with new brand name
      if (currentAnalysis && window.SEOAnalysisEngine && window.SEORecommendationEngine) {
        currentAnalysis.brandVsNonBrand = window.SEOAnalysisEngine.analyzeBrandVsNonBrand(
          currentAnalysis.topQueries || [], value
        );
        renderBrandTab(currentAnalysis);
      }
    });
  }

  /**
   * Set up the refresh button.
   * @param {Function} onRefresh — Callback
   */
  function setupRefreshButton(onRefresh) {
    var btn = document.getElementById('refresh-btn');
    if (!btn) return;

    btn.addEventListener('click', function () {
      if (onRefresh) onRefresh();
    });
  }

  /**
   * Check if there's existing data in IndexedDB and show the dashboard.
   */
  function checkExistingData() {
    if (!window.SEODashboardData) return;

    window.SEODashboardData.getLatestRawData('gsc_query').then(function (data) {
      if (data && data.rows && data.rows.length > 0) {
        showDashboard(data);
      }
    });
  }

  /**
   * Show the dashboard with loaded data.
   * @param {Object} rawData
   */
  function showDashboard(rawData) {
    var uploadSection = document.getElementById('upload-section');
    var dashboardSection = document.getElementById('dashboard-section');

    if (uploadSection) uploadSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = '';

    // Update data source badge
    var badge = document.getElementById('data-source-badge');
    if (badge) {
      if (rawData.source === 'api') {
        badge.className = 'data-source-badge data-source-badge--api';
        badge.textContent = '🔗 Connected via GSC API';
      } else {
        badge.className = 'data-source-badge data-source-badge--csv';
        badge.textContent = '📄 Imported from CSV';
      }
    }

    // Update date range display
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

  /**
   * Render the full dashboard with analysis results.
   * @param {Object} analysis — From SEOAnalysisEngine.runFullAnalysis()
   */
  function renderDashboard(analysis) {
    currentAnalysis = analysis;
    appState.hasData = true;
    renderOverviewTab(analysis);

    // Pre-render other tabs for instant switching
    // They will be rendered on-demand when the user switches to them
  }

  // ============================================
  // TAB RENDERERS
  // ============================================

  /**
   * Render the Overview tab.
   * @param {Object} analysis
   */
  function renderOverviewTab(analysis) {
    var kpis = analysis.kpis;
    if (!kpis) return;

    // Update KPI cards
    updateKPIValue('kpi-clicks', formatNumber(kpis.totalClicks));
    updateKPIValue('kpi-impressions', formatNumber(kpis.totalImpressions));
    updateKPIValue('kpi-ctr', kpis.averageCTR + '%');
    updateKPIValue('kpi-position', kpis.averagePosition);

    // Health score gauge
    if (analysis.healthScore && window.SEOChartBuilder) {
      window.SEOChartBuilder.createHealthGauge('health-gauge-chart', analysis.healthScore.score);
      var scoreEl = document.getElementById('health-score-value');
      if (scoreEl) scoreEl.textContent = analysis.healthScore.score;
      var messageEl = document.getElementById('health-message');
      if (messageEl) messageEl.textContent = analysis.healthScore.message;

      // Breakdown bars
      var breakdown = analysis.healthScore.breakdown;
      updateBreakdownBar('breakdown-ctr', breakdown.ctrScore, 30);
      updateBreakdownBar('breakdown-position', breakdown.positionScore, 25);
      updateBreakdownBar('breakdown-ctrhealth', breakdown.ctrHealthScore, 25);
      updateBreakdownBar('breakdown-opportunity', breakdown.opportunityScore, 20);
    }
  }

  /**
   * Render the Queries tab.
   * @param {Object} analysis
   */
  function renderQueriesTab(analysis) {
    if (!analysis.topQueries) return;
    if (!window.SEOTableBuilder) return;

    window.SEOTableBuilder.buildTable({
      containerId: 'top-queries-table',
      columns: [
        { key: 'query', label: 'Query', sortable: true },
        { key: 'clicks', label: 'Clicks', sortable: true },
        { key: 'impressions', label: 'Impressions', sortable: true },
        { key: 'ctr', label: 'CTR', sortable: true, render: function (val) { return val + '%'; } },
        { key: 'position', label: 'Position', sortable: true },
        { key: 'expectedCTR', label: 'Expected CTR', sortable: true, render: function (val) { return val + '%'; } },
        {
          key: 'status',
          label: 'Status',
          sortable: true,
          render: function (val) {
            return window.SEOTableBuilder.renderStatusBadge(val);
          }
        }
      ],
      data: analysis.topQueries,
      pageSize: 25,
      searchable: true,
      emptyMessage: 'No query data available.'
    });
  }

  /**
   * Render the Pages tab.
   * @param {Object} analysis
   */
  function renderPagesTab(analysis) {
    if (!analysis.topPages || analysis.topPages.length === 0) {
      var container = document.getElementById('top-pages-table');
      if (container) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">📄</div><div class="empty-state__title">No Page Data</div><div class="empty-state__text">Upload a GSC export that includes page-level data to see this analysis.</div></div>';
      }
      return;
    }

    if (!window.SEOTableBuilder) return;

    window.SEOTableBuilder.buildTable({
      containerId: 'top-pages-table',
      columns: [
        { key: 'page', label: 'Page URL', sortable: true },
        { key: 'clicks', label: 'Clicks', sortable: true },
        { key: 'impressions', label: 'Impressions', sortable: true },
        { key: 'ctr', label: 'CTR', sortable: true, render: function (val) { return val + '%'; } },
        { key: 'position', label: 'Avg Position', sortable: true }
      ],
      data: analysis.topPages,
      pageSize: 25,
      searchable: true,
      emptyMessage: 'No page data available.'
    });
  }

  /**
   * Render the CTR Health tab.
   * @param {Object} analysis
   */
  function renderCTRHealthTab(analysis) {
    if (!analysis.ctrHealth || analysis.ctrHealth.length === 0) return;

    // Scatter plot
    if (window.SEOChartBuilder) {
      window.SEOChartBuilder.createCTRScatterPlot('ctr-scatter-chart', analysis.ctrHealth);
    }

    // Table
    if (window.SEOTableBuilder) {
      window.SEOTableBuilder.buildTable({
        containerId: 'ctr-health-table',
        columns: [
          { key: 'query', label: 'Query', sortable: true },
          { key: 'clicks', label: 'Clicks', sortable: true },
          { key: 'impressions', label: 'Impressions', sortable: true },
          { key: 'ctr', label: 'Actual CTR', sortable: true, render: function (val) { return val + '%'; } },
          { key: 'position', label: 'Position', sortable: true },
          { key: 'expectedCTR', label: 'Expected CTR', sortable: true, render: function (val) { return val + '%'; } },
          { key: 'ctrGap', label: 'Gap', sortable: true, render: function (val) { return (val > 0 ? '+' : '') + val + '%'; } },
          {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: function (val) {
              var labels = { critical: 'Critical', warning: 'Warning', healthy: 'Healthy' };
              return window.SEOTableBuilder.renderStatusBadge(val, labels[val]);
            }
          }
        ],
        data: analysis.ctrHealth,
        pageSize: 25,
        searchable: true,
        emptyMessage: 'No CTR health data available.'
      });
    }
  }

  /**
   * Render the Opportunities tab.
   * @param {Object} analysis
   */
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
        { key: 'clickGain', label: 'Click Gain', sortable: true, render: function (val) { return '+' + val; } },
        { key: 'difficulty', label: 'Difficulty', sortable: true, render: function (val) { return val.charAt(0).toUpperCase() + val.slice(1); } },
        { key: 'category', label: 'Category', sortable: true }
      ],
      data: analysis.opportunities,
      pageSize: 25,
      searchable: true,
      emptyMessage: 'No opportunities found. Great job!'
    });
  }

  /**
   * Render the Cannibalization tab.
   * @param {Object} analysis
   */
  function renderCannibalizationTab(analysis) {
    var container = document.getElementById('cannibalization-container');
    if (!container) return;

    container.innerHTML = '';

    if (!analysis.cannibalization || analysis.cannibalization.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">✅</div><div class="empty-state__title">No Cannibalization Detected</div><div class="empty-state__text">Your site does not have keyword cannibalization issues. Each query ranks for a single URL.</div></div>';
      return;
    }

    analysis.cannibalization.forEach(function (group) {
      var groupEl = document.createElement('div');
      groupEl.className = 'cannibal-group';

      var header = document.createElement('div');
      header.className = 'cannibal-group__header';
      header.innerHTML = '<span class="cannibal-group__query">"' + group.query + '"</span>' +
                         (window.SEOTableBuilder ? window.SEOTableBuilder.renderSeverityBadge(group.severity) : '') +
                         '<span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">' + group.urlCount + ' URLs competing</span>';

      var urlsDiv = document.createElement('div');
      urlsDiv.className = 'cannibal-group__urls';

      group.urls.forEach(function (url) {
        var urlItem = document.createElement('div');
        urlItem.className = 'cannibal-group__url-item';
        urlItem.innerHTML = '<span style="font-size: var(--font-size-xs); word-break: break-all;">' + url.url + '</span>' +
                           '<span class="cannibal-group__url-position">Position ' + url.position + '</span>';
        urlsDiv.appendChild(urlItem);
      });

      groupEl.appendChild(header);
      groupEl.appendChild(urlsDiv);
      container.appendChild(groupEl);
    });
  }

  /**
   * Render the Content Decay tab.
   * @param {Object} analysis
   */
  function renderContentDecayTab(analysis) {
    if (!analysis.contentDecay || analysis.contentDecay.length === 0) {
      var container = document.getElementById('content-decay-table');
      if (container) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">📈</div><div class="empty-state__title">No Content Decay Detected</div><div class="empty-state__text">All your content is stable or growing. To detect decay, you need to upload data from two different time periods.</div></div>';
      }
      return;
    }

    if (!window.SEOTableBuilder) return;

    window.SEOTableBuilder.buildTable({
      containerId: 'content-decay-table',
      columns: [
        { key: 'query', label: 'Query', sortable: true },
        { key: 'previousClicks', label: 'Previous Clicks', sortable: true },
        { key: 'currentClicks', label: 'Current Clicks', sortable: true },
        { key: 'clickChange', label: 'Change', sortable: true, render: function (val) { return (val > 0 ? '+' : '') + val; } },
        { key: 'clickChangePercent', label: 'Change %', sortable: true, render: function (val) { return val + '%'; } },
        { key: 'previousPosition', label: 'Prev Position', sortable: true },
        { key: 'currentPosition', label: 'Curr Position', sortable: true },
        {
          key: 'stage',
          label: 'Stage',
          sortable: true,
          render: function (val) {
            var labels = { critical: 'Critical', accelerating: 'Accelerating', early: 'Early Stage' };
            var statuses = { critical: 'declining', accelerating: 'at-risk', early: 'stable' };
            return window.SEOTableBuilder.renderStatusBadge(statuses[val] || 'stable', labels[val]);
          }
        }
      ],
      data: analysis.contentDecay,
      pageSize: 25,
      searchable: true,
      emptyMessage: 'No content decay detected.'
    });
  }

  /**
   * Render the Device Gap tab.
   * @param {Object} analysis
   */
  function renderDeviceGapTab(analysis) {
    if (!analysis.deviceGap || Object.keys(analysis.deviceGap).length === 0) {
      var container = document.getElementById('device-gap-container');
      if (container) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">📱</div><div class="empty-state__title">No Device Data</div><div class="empty-state__text">Upload a GSC export that includes device-level data to see this analysis.</div></div>';
      }
      return;
    }

    // Bar chart
    if (window.SEOChartBuilder) {
      window.SEOChartBuilder.createDeviceBarChart('device-bar-chart', analysis.deviceGap);
    }

    // Gap summary
    var summaryEl = document.getElementById('device-gap-summary');
    if (summaryEl && analysis.deviceGap.gap) {
      var gap = analysis.deviceGap.gap;
      summaryEl.innerHTML = '';
      if (gap.positionGap > 1.5) {
        summaryEl.innerHTML += '<div class="anomaly-item" style="margin-bottom: var(--space-sm);">' +
          '<span class="anomaly-item__icon">⚠️</span>' +
          '<div class="anomaly-item__content">' +
          '<div class="anomaly-item__title">Mobile ranks ' + Math.abs(gap.positionGap).toFixed(1) + ' positions ' + (gap.positionGap > 0 ? 'worse' : 'better') + ' than Desktop</div>' +
          '<div class="anomaly-item__desc">This suggests potential mobile usability or page speed issues.</div>' +
          '</div></div>';
      }
    }
  }

  /**
   * Render the Country tab.
   * @param {Object} analysis
   */
  function renderCountryTab(analysis) {
    if (!analysis.countryPerformance || analysis.countryPerformance.length === 0) {
      var container = document.getElementById('country-table');
      if (container) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">🌍</div><div class="empty-state__title">No Country Data</div><div class="empty-state__text">Upload a GSC export that includes country-level data to see this analysis.</div></div>';
      }
      return;
    }

    // Bar chart
    if (window.SEOChartBuilder) {
      window.SEOChartBuilder.createCountryBarChart('country-bar-chart', analysis.countryPerformance);
    }

    // Table
    if (window.SEOTableBuilder) {
      window.SEOTableBuilder.buildTable({
        containerId: 'country-table',
        columns: [
          { key: 'country', label: 'Country', sortable: true },
          { key: 'clicks', label: 'Clicks', sortable: true },
          { key: 'impressions', label: 'Impressions', sortable: true },
          { key: 'ctr', label: 'CTR', sortable: true, render: function (val) { return val + '%'; } },
          { key: 'avgPosition', label: 'Avg Position', sortable: true }
        ],
        data: analysis.countryPerformance,
        pageSize: 25,
        searchable: true,
        emptyMessage: 'No country data available.'
      });
    }
  }

  /**
   * Render the Anomalies tab.
   * @param {Object} analysis
   */
  function renderAnomaliesTab(analysis) {
    var container = document.getElementById('anomalies-container');
    if (!container) return;

    container.innerHTML = '';

    if (!analysis.anomalies || analysis.anomalies.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">✨</div><div class="empty-state__title">No Anomalies Detected</div><div class="empty-state__text">Your data looks stable with no unusual patterns. Great job!</div></div>';
      return;
    }

    var list = document.createElement('div');
    list.className = 'anomaly-list';

    analysis.anomalies.forEach(function (anomaly) {
      var item = document.createElement('div');
      item.className = 'anomaly-item';

      var iconMap = {
        'click_change': '📊',
        'position_change': '📉',
        'zero_clicks': '🚫'
      };

      var desc = anomaly.description || '';
      if (!desc) {
        if (anomaly.type === 'click_change') {
          desc = 'Clicks ' + anomaly.direction + 'd by ' + anomaly.changePercent + '% for "' + anomaly.query + '"';
        } else if (anomaly.type === 'position_change') {
          desc = 'Position ' + anomaly.direction + ' by ' + Math.abs(anomaly.change) + ' positions for "' + anomaly.query + '"';
        } else if (anomaly.type === 'zero_clicks') {
          desc = 'Ranking at position ' + anomaly.position + ' with ' + anomaly.impressions + ' impressions but receiving zero clicks.';
        }
      }

      item.innerHTML =
        '<span class="anomaly-item__icon">' + (iconMap[anomaly.type] || '⚠️') + '</span>' +
        '<div class="anomaly-item__content">' +
        '<div class="anomaly-item__title">' + (anomaly.query || 'Unknown Query') + '</div>' +
        '<div class="anomaly-item__desc">' + desc + '</div>' +
        '<div class="anomaly-item__date">Severity: ' + anomaly.severity.toUpperCase() + '</div>' +
        '</div>';

      list.appendChild(item);
    });

    container.appendChild(list);
  }

  /**
   * Render the Brand vs Non-Brand tab.
   * @param {Object} analysis
   */
  function renderBrandTab(analysis) {
    if (!analysis.brandVsNonBrand || (!analysis.brandVsNonBrand.brand.clicks && !analysis.brandVsNonBrand.nonBrand.clicks)) {
      var container = document.getElementById('brand-chart');
      if (container) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">🏷️</div><div class="empty-state__title">Set Your Brand Name</div><div class="empty-state__text">Enter your brand name above to see the split between brand and non-brand traffic.</div></div>';
      }
      return;
    }

    if (window.SEOChartBuilder) {
      window.SEOChartBuilder.createBrandPieChart('brand-pie-chart', analysis.brandVsNonBrand);
    }
  }

  /**
   * Render the Action Plan tab.
   * @param {Object} analysis
   */
  function renderActionPlanTab(analysis) {
    if (!analysis.actionPlan) return;

    var container = document.getElementById('action-plan-container');
    if (!container) return;

    container.innerHTML = '';

    if (!analysis.actionPlan.actions || analysis.actionPlan.actions.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">🎉</div><div class="empty-state__title">All Clear!</div><div class="empty-state__text">No critical actions needed right now. Keep monitoring your SEO performance.</div></div>';
      return;
    }

    // Summary
    if (analysis.actionPlan.summary) {
      var summaryEl = document.createElement('div');
      summaryEl.style.cssText = 'margin-bottom: var(--space-lg); padding: var(--space-md) var(--space-lg); background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md);';
      summaryEl.innerHTML =
        '<p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: var(--line-height-relaxed); margin-bottom: var(--space-sm);"><strong>📋 Summary:</strong> ' + analysis.actionPlan.summary.text + '</p>' +
        '<p style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Estimated impact: <strong style="color: var(--color-success);">' + analysis.actionPlan.estimatedImpact.min + ' - ' + analysis.actionPlan.estimatedImpact.max + ' additional clicks/month</strong></p>';
      container.appendChild(summaryEl);
    }

    // Action list
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
        '</div>' +
        '</div>';

      list.appendChild(item);
    });

    container.appendChild(list);
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Format a number with commas.
   * @param {number} num
   * @returns {string}
   */
  function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString('en-US');
  }

  /**
   * Update a KPI card value.
   * @param {string} elementId
   * @param {string|number} value
   */
  function updateKPIValue(elementId, value) {
    var el = document.getElementById(elementId);
    if (el) el.textContent = value;
  }

  /**
   * Update a health breakdown bar value.
   * @param {string} elementId
   * @param {number} value
   * @param {number} max
   */
  function updateBreakdownBar(elementId, value, max) {
    var el = document.getElementById(elementId);
    if (el) {
      el.textContent = value + '/' + max;
      el.style.color = value >= max * 0.8 ? 'var(--color-success)' :
                       value >= max * 0.5 ? 'var(--color-accent-primary)' :
                       'var(--color-warning)';
    }
  }

  /**
   * Show a loading state on the dashboard.
   */
  function showLoading() {
    var section = document.getElementById('dashboard-section');
    if (section) {
      section.innerHTML = '<div class="loading-overlay"><div class="loading-spinner"></div><div class="loading-text">Analyzing your data...</div></div>';
    }
  }

  /**
   * Hide the upload section and show the dashboard.
   */
  function showDashboardView() {
    var uploadSection = document.getElementById('upload-section');
    var dashboardSection = document.getElementById('dashboard-section');
    if (uploadSection) uploadSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = '';
  }

  /**
   * Show the upload section and hide the dashboard.
   */
  function showUploadView() {
    var uploadSection = document.getElementById('upload-section');
    var dashboardSection = document.getElementById('dashboard-section');
    if (uploadSection) uploadSection.style.display = '';
    if (dashboardSection) dashboardSection.style.display = 'none';
  }

  /**
   * Reset the entire dashboard.
   */
  function resetDashboard() {
    currentAnalysis = null;
    appState.hasData = false;
    appState.dataSource = null;
    showUploadView();
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
    showDashboardView: showDashboardView,
    showUploadView: showUploadView,
    resetDashboard: resetDashboard,
    getAppState: function () { return appState; },
    setAppState: function (key, value) { appState[key] = value; },
    formatNumber: formatNumber
  };

})();
