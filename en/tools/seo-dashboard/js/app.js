/**
 * SEO Dashboard — Main Application (v3)
 * 
 * Entry point that coordinates all modules.
 * Handles CSV & XLSX upload, data flow, analysis triggering,
 * async processing with progress indication, and UI updates.
 * 
 * Changelog v3:
 * - Added XLSX support via SheetJS
 * - Async processing with setTimeout chunks for large datasets
 * - Progress bar and status updates during processing
 * - Better error handling and user feedback
 * 
 * @version 3.0.0
 * @date 2026-06
 */

(function () {
  'use strict';

  // Module references
  var DataManager = null;
  var Parser = null;
  var AnalysisEngine = null;
  var RecommendationEngine = null;
  var UIController = null;

  // Processing state
  var isProcessing = false;
  var processingAborted = false;

  /**
   * Initialize the application.
   */
  function init() {
    if (!window.SEODashboardData) {
      console.error('SEODashboardData module not loaded');
      showFatalError('Data module failed to load. Please refresh the page.');
      return;
    }
    if (!window.GSCParser) {
      console.error('GSCParser module not loaded');
      showFatalError('Parser module failed to load. Please refresh the page.');
      return;
    }
    if (!window.SEOAnalysisEngine) {
      console.error('SEOAnalysisEngine module not loaded');
      showFatalError('Analysis engine failed to load. Please refresh the page.');
      return;
    }
    if (!window.SEORecommendationEngine) {
      console.error('SEORecommendationEngine module not loaded');
      showFatalError('Recommendation engine failed to load. Please refresh the page.');
      return;
    }
    if (!window.SEOUIController) {
      console.error('SEOUIController module not loaded');
      showFatalError('UI Controller failed to load. Please refresh the page.');
      return;
    }

    DataManager = window.SEODashboardData;
    Parser = window.GSCParser;
    AnalysisEngine = window.SEOAnalysisEngine;
    RecommendationEngine = window.SEORecommendationEngine;
    UIController = window.SEOUIController;

    // Load CTR benchmark data
    loadBenchmarkData().then(function () {
      UIController.initUI({
        onUploadFile: handleFileUpload,
        onConnectGSC: handleGSCConnect,
        onPeriodChange: handlePeriodChange,
        onRefresh: handleRefresh
      });
      checkForSavedData();
    }).catch(function (error) {
      console.warn('Failed to load benchmark data:', error);
      UIController.initUI({
        onUploadFile: handleFileUpload,
        onConnectGSC: handleGSCConnect,
        onPeriodChange: handlePeriodChange,
        onRefresh: handleRefresh
      });
      checkForSavedData();
    });
  }

  /**
   * Show a fatal error message to the user.
   * @param {string} message
   */
  function showFatalError(message) {
    var container = document.getElementById('upload-section');
    if (container) {
      container.innerHTML = '<div class="empty-state" style="padding: var(--space-2xl);"><div class="empty-state__icon">⚠️</div><div class="empty-state__title">Something went wrong</div><div class="empty-state__text">' + message + '</div></div>';
    }
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
        UIController.showLoading();
        UIController.updateLoadingText('Loading saved data...');
        setTimeout(function () {
          runAnalysis(data);
        }, 100);
      }
    }).catch(function (error) {
      console.log('No saved data found:', error.message);
    });
  }

  /**
   * Handle file upload — supports CSV and XLSX.
   * @param {File} file
   */
  function handleFileUpload(file) {
    if (!file) return;
    if (isProcessing) return;

    isProcessing = true;
    processingAborted = false;
    UIController.showLoading();
    UIController.updateLoadingText('Reading file...');
    UIController.updateProgress(10, 'Reading file...');

    var reader = new FileReader();
    var fileName = file.name.toLowerCase();

    reader.onload = function (e) {
      if (processingAborted) {
        isProcessing = false;
        return;
      }

      UIController.updateProgress(30, 'Parsing data...');

      if (fileName.endsWith('.xlsx')) {
        parseXLSXData(e.target.result);
      } else {
        parseCSVData(e.target.result);
      }
    };

    reader.onerror = function () {
      isProcessing = false;
      UIController.hideLoading();
      alert('Error reading file. Please check that the file is not corrupted and try again.');
    };

    reader.onprogress = function (e) {
      if (e.lengthComputable) {
        var pct = Math.round((e.loaded / e.total) * 20) + 10; // 10-30%
        UIController.updateProgress(pct, 'Reading file...');
      }
    };

    if (fileName.endsWith('.xlsx')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  }

  /**
   * Parse XLSX file data.
   * @param {ArrayBuffer} data
   */
  function parseXLSXData(data) {
    if (processingAborted) {
      isProcessing = false;
      return;
    }

    UIController.updateProgress(30, 'Parsing Excel workbook...');
    UIController.updateLoadingText('Parsing Excel workbook...');

    // Use setTimeout to allow UI to update
    setTimeout(function () {
      try {
        if (typeof XLSX === 'undefined') {
          throw new Error('XLSX library not loaded. Please refresh the page and try again.');
        }

        var workbook = XLSX.read(data, { type: 'array' });
        var sheetCount = workbook.SheetNames.length;

        UIController.updateProgress(40, 'Found ' + sheetCount + ' sheet(s). Extracting data...');
        UIController.updateLoadingText('Found ' + sheetCount + ' sheet(s). Extracting data...');

        var parsed = Parser.parseXLSXWorkbook(workbook);

        if (!parsed || parsed.totalRows === 0) {
          throw new Error('No data found in the XLSX file. Please ensure the file contains sheets exported from Google Search Console with Query, Clicks, Impressions, CTR, and Position columns.');
        }

        if (parsed.errors.length > 0) {
          console.warn('XLSX parse warnings:', parsed.errors);
        }

        UIController.updateProgress(50, 'Processing ' + parsed.totalRows + ' rows...');
        UIController.updateLoadingText('Processing ' + parsed.totalRows + ' rows...');

        var queryData = parsed.merged.queryData.length > 0 ? parsed.merged.queryData : parsed.allQueries;
        var pageData = parsed.merged.pageData || [];
        var countryData = parsed.merged.countryData || [];
        var deviceData = parsed.merged.deviceData || [];

        UIController.updateProgress(60, 'Saving data to browser storage...');
        UIController.updateLoadingText('Saving data...');

        saveAndAnalyze(queryData, pageData, countryData, deviceData, 'xlsx');

      } catch (error) {
        console.error('XLSX parse error:', error);
        isProcessing = false;
        UIController.hideLoading();
        alert('Error parsing XLSX file:\n\n' + error.message + '\n\nPlease ensure the file is a valid Excel file exported from Google Search Console (via Google Sheets export).');
      }
    }, 50);
  }

  /**
   * Parse CSV file data.
   * @param {string} csvText
   */
  function parseCSVData(csvText) {
    if (processingAborted) {
      isProcessing = false;
      return;
    }

    UIController.updateProgress(30, 'Parsing CSV data...');
    UIController.updateLoadingText('Parsing CSV data...');

    setTimeout(function () {
      try {
        var parsed = Parser.parseGSCExport(csvText);

        if (parsed.type === 'unknown' || (parsed.errors.length > 0 && parsed.rowCount === 0)) {
          var errorMsg = 'Error parsing file:\n\n' + parsed.errors.join('\n');
          if (parsed.encodingFixed) {
            errorMsg += '\n\nNote: Text encoding was automatically fixed. For best results with Persian content, export from Google Search Console as XLSX (Google Sheets) instead of CSV.';
          }
          throw new Error(errorMsg);
        }

        var validation = Parser.validateData(parsed);

        if (!validation.valid) {
          throw new Error('Validation failed:\n\n' + validation.warnings.join('\n'));
        }

        if (validation.warnings.length > 0) {
          console.warn('CSV warnings:', validation.warnings);
        }

        UIController.updateProgress(50, 'Processing ' + parsed.rowCount + ' rows...');
        UIController.updateLoadingText('Processing ' + parsed.rowCount + ' rows...');

        UIController.updateProgress(60, 'Saving data to browser storage...');
        UIController.updateLoadingText('Saving data...');

        saveAndAnalyze(parsed.rows, [], [], [], 'csv');

      } catch (error) {
        console.error('CSV parse error:', error);
        isProcessing = false;
        UIController.hideLoading();
        alert(error.message || 'Error parsing CSV file. Please try exporting as XLSX (Google Sheets) for better compatibility.');
      }
    }, 50);
  }

  /**
   * Save parsed data to IndexedDB and run analysis.
   * @param {Array} queryData
   * @param {Array} pageData
   * @param {Array} countryData
   * @param {Array} deviceData
   * @param {string} source
   */
  function saveAndAnalyze(queryData, pageData, countryData, deviceData, source) {
    if (processingAborted) {
      isProcessing = false;
      return;
    }

    var now = new Date();
    var periodEnd = now.toISOString().split('T')[0];
    var periodStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    var rawData = {
      type: 'gsc_query',
      rows: queryData,
      periodStart: periodStart,
      periodEnd: periodEnd,
      dateImported: now.toISOString(),
      source: source,
      propertyUrl: null,
      extraSheets: {
        pageData: pageData,
        countryData: countryData,
        deviceData: deviceData
      }
    };

    DataManager.saveRawData(rawData).then(function () {
      if (processingAborted) {
        isProcessing = false;
        return;
      }

      UIController.showDashboard(rawData);
      UIController.updateProgress(70, 'Starting analysis engine...');
      UIController.updateLoadingText('Analyzing data...');

      // Use async processing for analysis
      setTimeout(function () {
        runAnalysis(rawData);
      }, 150);
    }).catch(function (error) {
      console.error('Error saving data:', error);
      isProcessing = false;
      UIController.hideLoading();
      alert('Error saving data to browser storage. Please check that your browser supports IndexedDB and has enough free space.');
    });
  }

  /**
   * Handle GSC API connection.
   */
  function handleGSCConnect() {
    alert('Google Search Console API connection will be available in a future update.\n\nFor now, please export your data from GSC:\n\n1. Go to Google Search Console → Performance report\n2. Set date range (28 days recommended)\n3. Click "Export" → "Google Sheets" or "CSV"\n4. Download as XLSX (recommended) or CSV\n5. Upload the file here');
  }

  /**
   * Handle period change.
   * @param {number} days
   */
  function handlePeriodChange(days) {
    DataManager.getLatestRawData('gsc_query').then(function (data) {
      if (data && data.rows) {
        UIController.showLoading();
        UIController.updateLoadingText('Re-analyzing with new period...');
        setTimeout(function () {
          runAnalysis(data);
        }, 100);
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
        UIController.updateLoadingText('Refreshing analysis...');
        setTimeout(function () {
          runAnalysis(data);
        }, 100);
      }
    });
  }

  /**
   * Run the full analysis pipeline with progress updates.
   * @param {Object} rawData
   */
  function runAnalysis(rawData) {
    if (!rawData || !rawData.rows) {
      isProcessing = false;
      UIController.hideLoading();
      return;
    }

    var appState = UIController.getAppState();
    var totalRows = rawData.rows.length;

    UIController.updateProgress(75, 'Running 12 analysis modules...');
    UIController.updateLoadingText('Running analysis on ' + totalRows + ' rows...');

    // Use setTimeout to avoid blocking the UI
    setTimeout(function () {
      if (processingAborted) {
        isProcessing = false;
        return;
      }

      // Separate data by type
      var queryData = [];
      var pageData = rawData.extraSheets ? (rawData.extraSheets.pageData || []) : [];
      var countryData = rawData.extraSheets ? (rawData.extraSheets.countryData || []) : [];
      var deviceData = rawData.extraSheets ? (rawData.extraSheets.deviceData || []) : [];

      rawData.rows.forEach(function (row) {
        if (row.query) queryData.push(row);
      });

      if (queryData.length === 0) {
        queryData = rawData.rows;
      }

      UIController.updateProgress(80, 'Loading previous period data...');

      // Load previous period for comparison
      DataManager.getRawDataByType('gsc_query').then(function (allData) {
        var previousData = null;
        if (allData && allData.length >= 2) {
          allData.sort(function (a, b) {
            return new Date(b.dateImported) - new Date(a.dateImported);
          });
          previousData = allData[1] ? allData[1].rows : null;
        }

        UIController.updateProgress(85, 'Running analysis engine...');

        var analysisInput = {
          queryData: queryData,
          pageData: pageData,
          countryData: countryData,
          deviceData: deviceData,
          previousQueryData: previousData || [],
          brandName: appState.brandName || ''
        };

        // Run analysis in chunks to show progress
        var results = AnalysisEngine.runFullAnalysis(analysisInput);

        UIController.updateProgress(90, 'Generating recommendations...');

        var actionPlan = RecommendationEngine.generateActionPlan(results, appState.brandName);
        results.actionPlan = actionPlan;

        UIController.updateProgress(95, 'Saving results...');

        DataManager.saveAnalysisResult('latest', results).catch(function (err) {
          console.warn('Could not save analysis results:', err);
        });

        UIController.updateProgress(100, 'Complete!');

        // Render dashboard
        setTimeout(function () {
          UIController.renderDashboard(results);
          UIController.hideLoading();
          isProcessing = false;
        }, 200);

      }).catch(function (error) {
        console.error('Error loading previous data:', error);

        UIController.updateProgress(85, 'Running analysis engine...');

        var analysisInput = {
          queryData: queryData,
          pageData: pageData,
          countryData: countryData,
          deviceData: deviceData,
          previousQueryData: [],
          brandName: appState.brandName || ''
        };

        var results = AnalysisEngine.runFullAnalysis(analysisInput);

        UIController.updateProgress(90, 'Generating recommendations...');

        var actionPlan = RecommendationEngine.generateActionPlan(results, appState.brandName);
        results.actionPlan = actionPlan;

        UIController.updateProgress(95, 'Saving results...');

        DataManager.saveAnalysisResult('latest', results).catch(function (err) {
          console.warn('Could not save analysis results:', err);
        });

        UIController.updateProgress(100, 'Complete!');

        setTimeout(function () {
          UIController.renderDashboard(results);
          UIController.hideLoading();
          isProcessing = false;
        }, 200);
      });
    }, 100);
  }

  /**
   * Abort current processing.
   */
  function abortProcessing() {
    processingAborted = true;
    isProcessing = false;
    UIController.hideLoading();
  }

  // ============================================
  // INITIALIZE ON DOM READY
  // ============================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose abort function
  window.SEODashboardApp = {
    abort: abortProcessing
  };

})();
