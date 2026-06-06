/**
 * SEO Dashboard — Main Application
 * 
 * Entry point that coordinates all modules.
 * Handles CSV upload, data flow, analysis triggering, and UI updates.
 * 
 * @version 1.0.0
 * @date 2026-06
 */

(function () {
  'use strict';

  // Module references (set after DOM is ready)
  var DataManager = null;
  var Parser = null;
  var AnalysisEngine = null;
  var RecommendationEngine = null;
  var UIController = null;

  /**
   * Initialize the application.
   */
  function init() {
    // Check that all required modules are loaded
    if (!window.SEODashboardData) {
      console.error('SEODashboardData module not loaded');
      return;
    }
    if (!window.GSCParser) {
      console.error('GSCParser module not loaded');
      return;
    }
    if (!window.SEOAnalysisEngine) {
      console.error('SEOAnalysisEngine module not loaded');
      return;
    }
    if (!window.SEORecommendationEngine) {
      console.error('SEORecommendationEngine module not loaded');
      return;
    }
    if (!window.SEOUIController) {
      console.error('SEOUIController module not loaded');
      return;
    }

    DataManager = window.SEODashboardData;
    Parser = window.GSCParser;
    AnalysisEngine = window.SEOAnalysisEngine;
    RecommendationEngine = window.SEORecommendationEngine;
    UIController = window.SEOUIController;

    // Load CTR benchmark data
    loadBenchmarkData().then(function () {
      // Initialize UI
      UIController.initUI({
        onUploadCSV: handleCSVUpload,
        onConnectGSC: handleGSCConnect,
        onPeriodChange: handlePeriodChange,
        onRefresh: handleRefresh
      });

      // Check for saved data and auto-load
      checkForSavedData();
    }).catch(function (error) {
      console.error('Failed to load benchmark data:', error);
      // Continue anyway — benchmarks are optional
      UIController.initUI({
        onUploadCSV: handleCSVUpload,
        onConnectGSC: handleGSCConnect,
        onPeriodChange: handlePeriodChange,
        onRefresh: handleRefresh
      });
      checkForSavedData();
    });
  }

  /**
   * Load the CTR benchmark JSON file.
   * @returns {Promise}
   */
  function loadBenchmarkData() {
    return fetch('data/industry-ctr-benchmark.json')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to load benchmark data: ' + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        AnalysisEngine.setCTRBenchmark(data);
        return data;
      });
  }

  /**
   * Check IndexedDB for previously saved data and load it.
   */
  function checkForSavedData() {
    DataManager.getLatestRawData('gsc_query').then(function (data) {
      if (data && data.rows && data.rows.length > 0) {
        UIController.showDashboard(data);
        runAnalysis(data);
      }
    }).catch(function (error) {
      console.log('No saved data found or error loading:', error.message);
    });
  }

  /**
   * Handle CSV file upload.
   * @param {File} file
   */
  function handleCSVUpload(file) {
    if (!file) return;

    UIController.showLoading();

    var reader = new FileReader();

    reader.onload = function (e) {
      var csvText = e.target.result;

      // Parse the CSV
      var parsed = Parser.parseGSCExport(csvText);

      if (parsed.type === 'unknown' || parsed.errors.length > 0 && parsed.rowCount === 0) {
        alert('Error parsing file:\n\n' + parsed.errors.join('\n'));
        UIController.resetDashboard();
        return;
      }

      // Validate
      var validation = Parser.validateData(parsed);

      if (!validation.valid) {
        alert('Validation failed:\n\n' + validation.warnings.join('\n'));
        UIController.resetDashboard();
        return;
      }

      if (validation.warnings.length > 0) {
        var proceed = confirm('Warnings were detected:\n\n' + validation.warnings.join('\n') + '\n\nDo you want to continue?');
        if (!proceed) {
          UIController.resetDashboard();
          return;
        }
      }

      // Prepare data for storage
      var now = new Date();
      var periodEnd = now.toISOString().split('T')[0];
      var periodStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      var rawData = {
        type: 'gsc_' + parsed.type,
        rows: parsed.rows,
        periodStart: periodStart,
        periodEnd: periodEnd,
        dateImported: now.toISOString(),
        source: 'csv',
        propertyUrl: null
      };

      // Save to IndexedDB
      DataManager.saveRawData(rawData).then(function () {
        UIController.showDashboard(rawData);
        runAnalysis(rawData);
      }).catch(function (error) {
        console.error('Error saving data:', error);
        alert('Error saving data. Please try again.');
      });
    };

    reader.onerror = function () {
      alert('Error reading file. Please try again.');
      UIController.resetDashboard();
    };

    reader.readAsText(file);
  }

  /**
   * Handle GSC API connection.
   * This is a placeholder for future OAuth implementation.
   */
  function handleGSCConnect() {
    alert('Google Search Console API connection will be available in the next version.\n\nFor now, please export your data from GSC as a CSV file and upload it here.\n\nTo export:\n1. Go to Google Search Console\n2. Open the Performance report\n3. Click "Export" in the top right\n4. Choose "CSV" format');
  }

  /**
   * Handle period change.
   * @param {number} days — Number of days for the new period
   */
  function handlePeriodChange(days) {
    // Re-run analysis with the same data (period filtering is done during import)
    // For now, reload the latest data and re-analyze
    DataManager.getLatestRawData('gsc_query').then(function (data) {
      if (data && data.rows) {
        runAnalysis(data);
      }
    });
  }

  /**
   * Handle refresh button click.
   */
  function handleRefresh() {
    DataManager.getLatestRawData('gsc_query').then(function (data) {
      if (data && data.rows) {
        UIController.showLoading();
        setTimeout(function () {
          runAnalysis(data);
        }, 500);
      }
    });
  }

  /**
   * Run the full analysis pipeline on the data.
   * @param {Object} rawData
   */
  function runAnalysis(rawData) {
    if (!rawData || !rawData.rows) return;

    var appState = UIController.getAppState();

    // Separate data by type if available
    var queryData = [];
    var pageData = [];
    var countryData = [];
    var deviceData = [];

    rawData.rows.forEach(function (row) {
      if (row.query) queryData.push(row);
      if (row.page) pageData.push(row);
      if (row.country) countryData.push(row);
      if (row.device) deviceData.push(row);
    });

    // If no specific type columns, treat all as query data
    if (queryData.length === 0 && pageData.length === 0) {
      queryData = rawData.rows;
    }

    // Load previous period data if available (for comparison analyses)
    DataManager.getRawDataByType('gsc_query').then(function (allData) {
      var previousData = null;
      if (allData && allData.length >= 2) {
        // Sort by date and get the second most recent
        allData.sort(function (a, b) {
          return new Date(b.dateImported) - new Date(a.dateImported);
        });
        previousData = allData[1] ? allData[1].rows : null;
      }

      // Run analysis
      var analysisInput = {
        queryData: queryData,
        pageData: pageData,
        countryData: countryData,
        deviceData: deviceData,
        previousQueryData: previousData,
        brandName: appState.brandName || ''
      };

      var results = AnalysisEngine.runFullAnalysis(analysisInput);

      // Generate recommendations
      var actionPlan = RecommendationEngine.generateActionPlan(results, appState.brandName);
      results.actionPlan = actionPlan;

      // Save analysis results
      DataManager.saveAnalysisResult('latest', results).catch(function (err) {
        console.warn('Could not save analysis results:', err);
      });

      // Render dashboard
      UIController.renderDashboard(results);

    }).catch(function (error) {
      console.error('Error loading previous data:', error);

      // Run without previous data
      var analysisInput = {
        queryData: queryData,
        pageData: pageData,
        countryData: countryData,
        deviceData: deviceData,
        previousQueryData: [],
        brandName: appState.brandName || ''
      };

      var results = AnalysisEngine.runFullAnalysis(analysisInput);
      var actionPlan = RecommendationEngine.generateActionPlan(results, appState.brandName);
      results.actionPlan = actionPlan;

      UIController.renderDashboard(results);
    });
  }

  // ============================================
  // INITIALIZE ON DOM READY
  // ============================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
