/**
 * SEO Dashboard — Chart Builder
 * 
 * Creates all Chart.js visualizations for the dashboard.
 * Each function returns a Chart.js config object or creates a chart instance.
 * 
 * @version 1.0.0
 * @date 2026-06
 */

(function () {
  'use strict';

  // Common chart colors (matches our design system)
  var COLORS = {
    primary: '#4da6ff',
    primaryAlpha: 'rgba(77, 166, 255, 0.3)',
    success: '#3dd68c',
    successAlpha: 'rgba(61, 214, 140, 0.3)',
    warning: '#f5a623',
    warningAlpha: 'rgba(245, 166, 35, 0.3)',
    error: '#f04770',
    errorAlpha: 'rgba(240, 71, 112, 0.3)',
    purple: '#a78bfa',
    purpleAlpha: 'rgba(167, 139, 250, 0.3)',
    grid: '#1e2838',
    text: '#6b768a',
    textPrimary: '#e6ecf4'
  };

  // Common font config
  var FONT_FAMILY = "'Vazirmatn', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  /**
   * Default Chart.js options used across all charts.
   * @returns {Object}
   */
  function getDefaultOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          labels: {
            color: COLORS.text,
            font: { family: FONT_FAMILY, size: 12 },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 8
          }
        },
        tooltip: {
          backgroundColor: '#1c2330',
          titleColor: COLORS.textPrimary,
          bodyColor: COLORS.text,
          borderColor: COLORS.grid,
          borderWidth: 1,
          padding: 12,
          titleFont: { family: FONT_FAMILY, size: 13, weight: '600' },
          bodyFont: { family: FONT_FAMILY, size: 12 }
        }
      },
      scales: {
        x: {
          grid: { color: COLORS.grid, drawBorder: false },
          ticks: { color: COLORS.text, font: { family: FONT_FAMILY, size: 11 } }
        },
        y: {
          grid: { color: COLORS.grid, drawBorder: false },
          ticks: { color: COLORS.text, font: { family: FONT_FAMILY, size: 11 } }
        }
      }
    };
  }

  /**
   * Create a Health Score Gauge (Doughnut chart).
   * @param {string} canvasId
   * @param {number} score — 0 to 100
   * @returns {Chart}
   */
  function createHealthGauge(canvasId, score) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    var ctx = canvas.getContext('2d');
    var remaining = 100 - score;

    var color;
    if (score >= 80) color = COLORS.success;
    else if (score >= 60) color = COLORS.primary;
    else if (score >= 40) color = COLORS.warning;
    else color = COLORS.error;

    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [score, remaining],
          backgroundColor: [color, 'rgba(255, 255, 255, 0.05)'],
          borderWidth: 0,
          borderRadius: score > 0 ? 100 : 0,
          cutout: '80%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
  }

  /**
   * Create a CTR vs Position Scatter Plot.
   * @param {string} canvasId
   * @param {Array} data — [{ query, ctr, position, expectedCTR }]
   * @returns {Chart}
   */
  function createCTRScatterPlot(canvasId, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || !data || data.length === 0) return null;

    var ctx = canvas.getContext('2d');

    // Separate data by status
    var healthyPoints = data
      .filter(function (d) { return d.status === 'healthy'; })
      .map(function (d) { return { x: d.position, y: d.ctr, query: d.query }; });

    var warningPoints = data
      .filter(function (d) { return d.status === 'warning'; })
      .map(function (d) { return { x: d.position, y: d.ctr, query: d.query }; });

    var criticalPoints = data
      .filter(function (d) { return d.status === 'critical'; })
      .map(function (d) { return { x: d.position, y: d.ctr, query: d.query }; });

    // Expected CTR curve (positions 1-20)
    var expectedCurve = [];
    if (window.SEOAnalysisEngine) {
      for (var i = 1; i <= 20; i++) {
        expectedCurve.push({
          x: i,
          y: window.SEOAnalysisEngine.getExpectedCTR(i)
        });
      }
    }

    var datasets = [];

    if (criticalPoints.length > 0) {
      datasets.push({
        label: 'Needs Attention (Critical)',
        data: criticalPoints,
        backgroundColor: COLORS.error,
        borderColor: COLORS.error,
        pointRadius: 5,
        pointHoverRadius: 8
      });
    }

    if (warningPoints.length > 0) {
      datasets.push({
        label: 'Below Average (Warning)',
        data: warningPoints,
        backgroundColor: COLORS.warning,
        borderColor: COLORS.warning,
        pointRadius: 5,
        pointHoverRadius: 8
      });
    }

    if (healthyPoints.length > 0) {
      datasets.push({
        label: 'Healthy',
        data: healthyPoints,
        backgroundColor: COLORS.success,
        borderColor: COLORS.success,
        pointRadius: 4,
        pointHoverRadius: 7
      });
    }

    if (expectedCurve.length > 0) {
      datasets.push({
        label: 'Industry Average CTR',
        data: expectedCurve,
        type: 'line',
        borderColor: COLORS.text,
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        order: 1
      });
    }

    var options = getDefaultOptions();
    options.scales = {
      x: {
        title: { display: true, text: 'Position', color: COLORS.text, font: { family: FONT_FAMILY, size: 12 } },
        grid: { color: COLORS.grid, drawBorder: false },
        ticks: { color: COLORS.text, font: { family: FONT_FAMILY, size: 11 }, stepSize: 1 },
        reverse: true,
        min: 1,
        max: 20
      },
      y: {
        title: { display: true, text: 'CTR (%)', color: COLORS.text, font: { family: FONT_FAMILY, size: 12 } },
        grid: { color: COLORS.grid, drawBorder: false },
        ticks: { color: COLORS.text, font: { family: FONT_FAMILY, size: 11 }, callback: function (value) { return value + '%'; } },
        beginAtZero: true
      }
    };
    options.plugins.tooltip.callbacks = {
      label: function (context) {
        var point = context.raw;
        if (point && point.query) {
          return '"' + point.query + '" — CTR: ' + point.y + '%, Position: ' + point.x;
        }
        return 'CTR: ' + point.y + '%, Position: ' + point.x;
      }
    };

    return new Chart(ctx, {
      type: 'scatter',
      data: { datasets: datasets },
      options: options
    });
  }

  /**
   * Create a Brand vs Non-Brand Pie Chart.
   * @param {string} canvasId
   * @param {Object} brandData — { brand: { clicks, clickShare }, nonBrand: { clicks, clickShare } }
   * @returns {Chart}
   */
  function createBrandPieChart(canvasId, brandData) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || !brandData) return null;

    var ctx = canvas.getContext('2d');

    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Brand Queries', 'Non-Brand Queries'],
        datasets: [{
          data: [brandData.brand.clicks, brandData.nonBrand.clicks],
          backgroundColor: [COLORS.primary, COLORS.purple],
          borderColor: 'transparent',
          borderWidth: 2,
          hoverBorderColor: COLORS.textPrimary
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: COLORS.text,
              font: { family: FONT_FAMILY, size: 12 },
              padding: 16,
              usePointStyle: true,
              generateLabels: function (chart) {
                var data = chart.data;
                return data.labels.map(function (label, i) {
                  return {
                    text: label + ': ' + data.datasets[0].data[i] + ' clicks (' + (i === 0 ? brandData.brand.clickShare : brandData.nonBrand.clickShare) + '%)',
                    fillStyle: data.datasets[0].backgroundColor[i],
                    strokeStyle: data.datasets[0].backgroundColor[i],
                    index: i
                  };
                });
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                var value = context.raw;
                var total = context.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                var percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return value + ' clicks (' + percent + '%)';
              }
            }
          }
        }
      }
    });
  }

  /**
   * Create a Device Comparison Bar Chart.
   * @param {string} canvasId
   * @param {Object} deviceGap — From analysis engine
   * @returns {Chart}
   */
  function createDeviceBarChart(canvasId, deviceGap) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || !deviceGap) return null;

    var ctx = canvas.getContext('2d');
    var devices = ['DESKTOP', 'MOBILE', 'TABLET'];
    var labels = [];
    var ctrValues = [];
    var positionValues = [];
    var colors = [COLORS.primary, COLORS.warning, COLORS.purple];

    devices.forEach(function (device, index) {
      if (deviceGap[device]) {
        labels.push(device.charAt(0) + device.slice(1).toLowerCase());
        ctrValues.push(deviceGap[device].ctr || 0);
        positionValues.push(deviceGap[device].avgPosition || 0);
      }
    });

    var options = getDefaultOptions();
    options.scales = {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { color: COLORS.text, font: { family: FONT_FAMILY, size: 12 } }
      },
      y: {
        title: { display: true, text: 'CTR (%)', color: COLORS.text, font: { family: FONT_FAMILY, size: 12 } },
        grid: { color: COLORS.grid, drawBorder: false },
        ticks: { color: COLORS.text, font: { family: FONT_FAMILY, size: 11 }, callback: function (value) { return value + '%'; } },
        beginAtZero: true
      }
    };

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'CTR (%)',
          data: ctrValues,
          backgroundColor: colors.map(function (c) { return c + '80'; }),
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: options
    });
  }

  /**
   * Create a Country Performance Horizontal Bar Chart.
   * @param {string} canvasId
   * @param {Array} countryData — Top 10 countries
   * @returns {Chart}
   */
  function createCountryBarChart(canvasId, countryData) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || !countryData || countryData.length === 0) return null;

    var ctx = canvas.getContext('2d');
    var top10 = countryData.slice(0, 10);

    var options = getDefaultOptions();
    options.indexAxis = 'y';
    options.scales = {
      x: {
        title: { display: true, text: 'Clicks', color: COLORS.text, font: { family: FONT_FAMILY, size: 12 } },
        grid: { color: COLORS.grid, drawBorder: false },
        ticks: { color: COLORS.text, font: { family: FONT_FAMILY, size: 11 } },
        beginAtZero: true
      },
      y: {
        grid: { display: false, drawBorder: false },
        ticks: { color: COLORS.textPrimary, font: { family: FONT_FAMILY, size: 12 } }
      }
    };

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top10.map(function (c) { return c.country; }),
        datasets: [{
          label: 'Clicks',
          data: top10.map(function (c) { return c.clicks; }),
          backgroundColor: top10.map(function (_, i) {
            var alpha = 0.3 + (0.7 * (1 - i / top10.length));
            return 'rgba(77, 166, 255, ' + alpha.toFixed(2) + ')';
          }),
          borderColor: COLORS.primary,
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: options
    });
  }

  /**
   * Create a Trend Line Chart (clicks over time — placeholder for when daily data is available).
   * @param {string} canvasId
   * @param {Array} trendData
   * @returns {Chart}
   */
  function createTrendLineChart(canvasId, trendData) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    var ctx = canvas.getContext('2d');

    // For now, create a simple summary chart
    var options = getDefaultOptions();
    options.scales = {
      x: {
        grid: { color: COLORS.grid, drawBorder: false },
        ticks: { color: COLORS.text, font: { family: FONT_FAMILY, size: 11 } }
      },
      y: {
        title: { display: true, text: 'Count', color: COLORS.text, font: { family: FONT_FAMILY, size: 12 } },
        grid: { color: COLORS.grid, drawBorder: false },
        ticks: { color: COLORS.text, font: { family: FONT_FAMILY, size: 11 } },
        beginAtZero: true
      }
    };

    if (trendData && trendData.length > 0) {
      return new Chart(ctx, {
        type: 'line',
        data: {
          labels: trendData.map(function (d) { return d.label || ''; }),
          datasets: [{
            label: 'Clicks',
            data: trendData.map(function (d) { return d.clicks || 0; }),
            borderColor: COLORS.primary,
            backgroundColor: COLORS.primaryAlpha,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6
          }]
        },
        options: options
      });
    }

    // Empty chart with message
    return new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: options
    });
  }

  // ============================================
  // PUBLIC API
  // ============================================

  window.SEOChartBuilder = {
    COLORS: COLORS,
    getDefaultOptions: getDefaultOptions,
    createHealthGauge: createHealthGauge,
    createCTRScatterPlot: createCTRScatterPlot,
    createBrandPieChart: createBrandPieChart,
    createDeviceBarChart: createDeviceBarChart,
    createCountryBarChart: createCountryBarChart,
    createTrendLineChart: createTrendLineChart
  };

})();
