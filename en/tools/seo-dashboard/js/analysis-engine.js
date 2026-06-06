/**
 * SEO Dashboard — Analysis Engine
 * 
 * Performs all 12 types of SEO analysis on GSC data.
 * Each analysis function takes normalized data and returns structured results.
 * All computations are done client-side — zero server dependency.
 * 
 * @version 1.0.0
 * @date 2026-06
 */

(function () {
  'use strict';

  /**
   * CTR Benchmark data — loaded from JSON.
   * This is set by the main app after loading the benchmark file.
   */
  var ctrBenchmark = null;

  /**
   * Set the CTR benchmark data.
   * @param {Object} data
   */
  function setCTRBenchmark(data) {
    ctrBenchmark = data;
  }

  /**
   * Get expected CTR for a given position.
   * @param {number} position
   * @returns {number} - Expected CTR as a percentage (0-100)
   */
  function getExpectedCTR(position) {
    if (!ctrBenchmark || !ctrBenchmark.ctrByPosition) return 0;

    var roundedPos = Math.round(position);
    if (roundedPos < 1) roundedPos = 1;
    if (roundedPos > 20) roundedPos = 20;

    var ctr = ctrBenchmark.ctrByPosition[String(roundedPos)] || 0;
    return ctr * 100; // Convert to percentage
  }

  /**
   * Get expected CTR for a given position and device type.
   * @param {number} position
   * @param {string} device - 'desktop', 'mobile', or 'tablet'
   * @returns {number}
   */
  function getExpectedCTRByDevice(position, device) {
    if (!ctrBenchmark || !ctrBenchmark.ctrByDevice) return getExpectedCTR(position);

    var deviceData = ctrBenchmark.ctrByDevice[device.toLowerCase()];
    if (!deviceData) return getExpectedCTR(position);

    var roundedPos = Math.round(position);
    if (roundedPos < 1) roundedPos = 1;
    if (roundedPos > 10) roundedPos = 10;

    var ctr = deviceData[String(roundedPos)] || 0;
    return ctr * 100;
  }

  // ============================================
  // ANALYSIS 1: EXECUTIVE SUMMARY & KPI
  // ============================================

  /**
   * Calculate overall KPIs from query data.
   * @param {Array} queryData - Array of query rows
   * @returns {Object}
   */
  function analyzeKPIs(queryData) {
    if (!queryData || queryData.length === 0) {
      return {
        totalClicks: 0,
        totalImpressions: 0,
        averageCTR: 0,
        averagePosition: 0,
        queryCount: 0
      };
    }

    var totalClicks = 0;
    var totalImpressions = 0;
    var weightedPositionSum = 0;

    queryData.forEach(function (row) {
      totalClicks += row.clicks || 0;
      totalImpressions += row.impressions || 0;
      weightedPositionSum += (row.position || 0) * (row.impressions || 0);
    });

    var averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    var averagePosition = totalImpressions > 0 ? weightedPositionSum / totalImpressions : 0;

    return {
      totalClicks: totalClicks,
      totalImpressions: totalImpressions,
      averageCTR: parseFloat(averageCTR.toFixed(2)),
      averagePosition: parseFloat(averagePosition.toFixed(1)),
      queryCount: queryData.length
    };
  }

  // ============================================
  // ANALYSIS 2: CTR HEALTH CHECK
  // ============================================

  /**
   * Analyze CTR health for each query.
   * @param {Array} queryData
   * @returns {Array}
   */
  function analyzeCTRHealth(queryData) {
    if (!queryData || queryData.length === 0) return [];

    return queryData
      .filter(function (row) {
        return row.impressions >= 10 && row.position <= 20;
      })
      .map(function (row) {
        var expectedCTR = getExpectedCTR(row.position);
        var ctrGap = expectedCTR - row.ctr;
        var ctrRatio = expectedCTR > 0 ? row.ctr / expectedCTR : 0;

        return {
          query: row.query,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
          expectedCTR: parseFloat(expectedCTR.toFixed(1)),
          ctrGap: parseFloat(ctrGap.toFixed(1)),
          status: ctrRatio < 0.6 ? 'critical' : (ctrRatio < 0.8 ? 'warning' : 'healthy')
        };
      })
      .sort(function (a, b) {
        return b.ctrGap - a.ctrGap;
      });
  }

  // ============================================
  // ANALYSIS 3: OPPORTUNITY KEYWORDS
  // ============================================

  /**
   * Find keywords with high opportunity (position 4-20, decent impressions, low CTR).
   * @param {Array} queryData
   * @returns {Array}
   */
  function analyzeOpportunities(queryData) {
    if (!queryData || queryData.length === 0) return [];

    return queryData
      .filter(function (row) {
        return row.position >= 4 && row.position <= 20 && row.impressions >= 20;
      })
      .map(function (row) {
        var expectedCTRTop3 = getExpectedCTR(1.5); // Expected CTR if moved to position 1-3
        var potentialClicks = Math.round((row.impressions * expectedCTRTop3) / 100);
        var clickGain = potentialClicks - row.clicks;
        var priorityScore = Math.round(clickGain * (1 + (20 - row.position) / 20));

        var difficulty;
        if (row.position <= 7) difficulty = 'easy';
        else if (row.position <= 12) difficulty = 'medium';
        else difficulty = 'hard';

        return {
          query: row.query,
          currentClicks: row.clicks,
          impressions: row.impressions,
          currentPosition: row.position,
          currentCTR: row.ctr,
          potentialClicks: potentialClicks,
          clickGain: clickGain,
          priorityScore: priorityScore,
          difficulty: difficulty,
          category: row.position <= 7 ? 'Low-Hanging Fruit' : (row.position <= 12 ? 'Mid-Term' : 'Long-Term')
        };
      })
      .sort(function (a, b) {
        return b.priorityScore - a.priorityScore;
      });
  }

  // ============================================
  // ANALYSIS 4: KEYWORD CANNIBALIZATION
  // ============================================

  /**
   * Detect keyword cannibalization — same query ranking for multiple URLs.
   * Requires both query and page data.
   * @param {Array} queryData
   * @returns {Array}
   */
  function analyzeCannibalization(queryData) {
    if (!queryData || queryData.length === 0) return [];

    // For CSV data that includes both query AND page columns,
    // we detect duplicate queries across different pages.
    // If only query data is available, we flag queries with high position variance.

    var cannibalGroups = [];

    // Group by query
    var queryMap = {};
    queryData.forEach(function (row) {
      var q = row.query;
      if (!q) return;
      if (!queryMap[q]) {
        queryMap[q] = [];
      }
      queryMap[q].push(row);
    });

    // Find queries with multiple URLs
    for (var query in queryMap) {
      if (queryMap.hasOwnProperty(query)) {
        var rows = queryMap[query];
        if (rows.length >= 2) {
          // Check if positions are close enough to be cannibalizing
          var positions = rows.map(function (r) { return r.position; }).sort(function (a, b) { return a - b; });
          var minPos = positions[0];
          var maxPos = positions[positions.length - 1];

          if (maxPos <= 30) {
            var severity;
            if (minPos <= 10 && maxPos <= 15) severity = 'high';
            else if (minPos <= 20) severity = 'medium';
            else severity = 'low';

            cannibalGroups.push({
              query: query,
              urls: rows.map(function (r) {
                return {
                  url: r.page || 'Unknown URL',
                  position: r.position,
                  clicks: r.clicks,
                  impressions: r.impressions
                };
              }),
              urlCount: rows.length,
              minPosition: minPos,
              maxPosition: maxPos,
              severity: severity
            });
          }
        }
      }
    }

    // Sort by severity then by position spread
    var severityOrder = { high: 0, medium: 1, low: 2 };
    cannibalGroups.sort(function (a, b) {
      var sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return a.minPosition - b.minPosition;
    });

    return cannibalGroups;
  }

  // ============================================
  // ANALYSIS 5: CONTENT DECAY DETECTION
  // ============================================

  /**
   * Detect content decay by comparing two periods.
   * Requires two datasets from different time periods.
   * @param {Array} currentData
   * @param {Array} previousData
   * @returns {Array}
   */
  function analyzeContentDecay(currentData, previousData) {
    if (!currentData || !previousData || previousData.length === 0) return [];

    // Build a map of previous period data by query
    var prevMap = {};
    previousData.forEach(function (row) {
      prevMap[row.query] = row;
    });

    var decaying = [];

    currentData.forEach(function (row) {
      var prev = prevMap[row.query];
      if (!prev) return;

      var clickChange = row.clicks - prev.clicks;
      var clickChangePercent = prev.clicks > 0 ? (clickChange / prev.clicks) * 100 : 0;

      // Only flag significant declines
      if (clickChangePercent < -15 && row.clicks < prev.clicks) {
        var stage;
        if (clickChangePercent < -40) stage = 'critical';
        else if (clickChangePercent < -25) stage = 'accelerating';
        else stage = 'early';

        decaying.push({
          query: row.query,
          currentClicks: row.clicks,
          previousClicks: prev.clicks,
          clickChange: clickChange,
          clickChangePercent: parseFloat(clickChangePercent.toFixed(1)),
          currentPosition: row.position,
          previousPosition: prev.position,
          stage: stage
        });
      }
    });

    // Sort by worst decline first
    decaying.sort(function (a, b) {
      return a.clickChangePercent - b.clickChangePercent;
    });

    return decaying;
  }

  // ============================================
  // ANALYSIS 6: DEVICE PERFORMANCE GAP
  // ============================================

  /**
   * Analyze performance gap between devices.
   * @param {Array} deviceData - Rows with 'device' field
   * @returns {Object}
   */
  function analyzeDeviceGap(deviceData) {
    if (!deviceData || deviceData.length === 0) return {};

    var devices = {};
    deviceData.forEach(function (row) {
      var d = (row.device || 'UNKNOWN').toUpperCase();
      if (!devices[d]) {
        devices[d] = { totalClicks: 0, totalImpressions: 0, weightedPosition: 0, rowCount: 0 };
      }
      devices[d].totalClicks += row.clicks || 0;
      devices[d].totalImpressions += row.impressions || 0;
      devices[d].weightedPosition += (row.position || 0) * (row.impressions || 0);
      devices[d].rowCount++;
    });

    var result = {};
    var deviceTypes = ['DESKTOP', 'MOBILE', 'TABLET'];

    for (var key in devices) {
      if (devices.hasOwnProperty(key)) {
        var d = devices[key];
        result[key] = {
          clicks: d.totalClicks,
          impressions: d.totalImpressions,
          ctr: d.totalImpressions > 0 ? parseFloat(((d.totalClicks / d.totalImpressions) * 100).toFixed(2)) : 0,
          avgPosition: d.totalImpressions > 0 ? parseFloat((d.weightedPosition / d.totalImpressions).toFixed(1)) : 0,
          rowCount: d.rowCount
        };
      }
    }

    // Calculate gaps
    if (result['DESKTOP'] && result['MOBILE']) {
      result['gap'] = {
        positionGap: parseFloat((result['MOBILE'].avgPosition - result['DESKTOP'].avgPosition).toFixed(1)),
        ctrGap: parseFloat((result['MOBILE'].ctr - result['DESKTOP'].ctr).toFixed(2)),
        clicksRatio: result['DESKTOP'].clicks > 0 ? parseFloat((result['MOBILE'].clicks / result['DESKTOP'].clicks).toFixed(2)) : 0
      };
    }

    return result;
  }

  // ============================================
  // ANALYSIS 7: COUNTRY PERFORMANCE
  // ============================================

  /**
   * Analyze performance by country.
   * @param {Array} countryData - Rows with 'country' field
   * @returns {Array}
   */
  function analyzeCountryPerformance(countryData) {
    if (!countryData || countryData.length === 0) return [];

    var countries = {};
    countryData.forEach(function (row) {
      var c = row.country || 'Unknown';
      if (!countries[c]) {
        countries[c] = { totalClicks: 0, totalImpressions: 0, weightedPosition: 0 };
      }
      countries[c].totalClicks += row.clicks || 0;
      countries[c].totalImpressions += row.impressions || 0;
      countries[c].weightedPosition += (row.position || 0) * (row.impressions || 0);
    });

    var result = [];
    for (var key in countries) {
      if (countries.hasOwnProperty(key)) {
        var c = countries[key];
        result.push({
          country: key,
          clicks: c.totalClicks,
          impressions: c.totalImpressions,
          ctr: c.totalImpressions > 0 ? parseFloat(((c.totalClicks / c.totalImpressions) * 100).toFixed(2)) : 0,
          avgPosition: c.totalImpressions > 0 ? parseFloat((c.weightedPosition / c.totalImpressions).toFixed(1)) : 0
        });
      }
    }

    result.sort(function (a, b) {
      return b.impressions - a.impressions;
    });

    return result;
  }

  // ============================================
  // ANALYSIS 8: TOP QUERIES DEEP DIVE
  // ============================================

  /**
   * Deep analysis of top queries with trend indicators.
   * @param {Array} queryData
   * @returns {Array}
   */
  function analyzeTopQueries(queryData) {
    if (!queryData || queryData.length === 0) return [];

    return queryData
      .map(function (row) {
        var expectedCTR = getExpectedCTR(row.position);
        var status = 'stable';
        if (row.position >= 4 && row.position <= 15 && row.ctr < expectedCTR * 0.8) {
          status = 'opportunity';
        } else if (row.position <= 3 && row.ctr < expectedCTR * 0.7) {
          status = 'at-risk';
        }

        return {
          query: row.query,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
          expectedCTR: parseFloat(expectedCTR.toFixed(1)),
          status: status
        };
      })
      .sort(function (a, b) {
        return b.clicks - a.clicks;
      });
  }

  // ============================================
  // ANALYSIS 9: TOP PAGES DEEP DIVE
  // ============================================

  /**
   * Deep analysis of top pages.
   * @param {Array} pageData
   * @returns {Array}
   */
  function analyzeTopPages(pageData) {
    if (!pageData || pageData.length === 0) return [];

    return pageData
      .map(function (row) {
        return {
          page: row.page,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position
        };
      })
      .sort(function (a, b) {
        return b.clicks - a.clicks;
      });
  }

  // ============================================
  // ANALYSIS 10: BRAND vs NON-BRAND
  // ============================================

  /**
   * Separate queries into brand and non-brand.
   * @param {Array} queryData
   * @param {string} brandName
   * @returns {Object}
   */
  function analyzeBrandVsNonBrand(queryData, brandName) {
    if (!queryData || queryData.length === 0 || !brandName) {
      return { brand: { clicks: 0, impressions: 0, count: 0 }, nonBrand: { clicks: 0, impressions: 0, count: 0 } };
    }

    var brandLower = brandName.toLowerCase();
    var brandKeywords = brandLower.split(/\s+/); // Split brand name into words

    var brand = { clicks: 0, impressions: 0, queries: [], count: 0 };
    var nonBrand = { clicks: 0, impressions: 0, queries: [], count: 0 };

    queryData.forEach(function (row) {
      var queryLower = row.query.toLowerCase();
      var isBrand = brandKeywords.some(function (kw) {
        return queryLower.indexOf(kw) !== -1;
      });

      // Also check if the query IS the brand name
      if (queryLower === brandLower || queryLower.indexOf(brandLower) !== -1) {
        isBrand = true;
      }

      if (isBrand) {
        brand.clicks += row.clicks || 0;
        brand.impressions += row.impressions || 0;
        brand.count++;
      } else {
        nonBrand.clicks += row.clicks || 0;
        nonBrand.impressions += row.impressions || 0;
        nonBrand.count++;
      }
    });

    var totalClicks = brand.clicks + nonBrand.clicks;
    var totalImpressions = brand.impressions + nonBrand.impressions;

    return {
      brand: {
        clicks: brand.clicks,
        impressions: brand.impressions,
        count: brand.count,
        clickShare: totalClicks > 0 ? parseFloat(((brand.clicks / totalClicks) * 100).toFixed(1)) : 0,
        impressionShare: totalImpressions > 0 ? parseFloat(((brand.impressions / totalImpressions) * 100).toFixed(1)) : 0
      },
      nonBrand: {
        clicks: nonBrand.clicks,
        impressions: nonBrand.impressions,
        count: nonBrand.count,
        clickShare: totalClicks > 0 ? parseFloat(((nonBrand.clicks / totalClicks) * 100).toFixed(1)) : 0,
        impressionShare: totalImpressions > 0 ? parseFloat(((nonBrand.impressions / totalImpressions) * 100).toFixed(1)) : 0
      }
    };
  }

  // ============================================
  // ANALYSIS 11: ANOMALY DETECTION
  // ============================================

  /**
   * Detect anomalies using simple moving average.
   * Works best when we have daily data.
   * @param {Array} queryData - If data includes daily breakdown, use that. Otherwise analyze query-level changes.
   * @param {Array} previousData
   * @returns {Array}
   */
  function analyzeAnomalies(queryData, previousData) {
    var anomalies = [];

    if (!queryData || queryData.length === 0) return anomalies;

    // If we have previous data, detect query-level anomalies
    if (previousData && previousData.length > 0) {
      var prevMap = {};
      previousData.forEach(function (row) {
        prevMap[row.query] = row;
      });

      queryData.forEach(function (row) {
        var prev = prevMap[row.query];
        if (!prev) return;

        var clickChange = row.clicks - prev.clicks;
        var clickChangePercent = prev.clicks > 0 ? Math.abs((clickChange / prev.clicks) * 100) : 0;
        var positionChange = row.position - prev.position;

        // Detect significant anomalies
        if (clickChangePercent > 50 && row.impressions > 50) {
          anomalies.push({
            type: 'click_change',
            query: row.query,
            currentClicks: row.clicks,
            previousClicks: prev.clicks,
            changePercent: parseFloat(clickChangePercent.toFixed(1)),
            direction: clickChange > 0 ? 'increase' : 'decrease',
            severity: clickChangePercent > 80 ? 'high' : 'medium'
          });
        }

        if (Math.abs(positionChange) >= 10 && row.impressions > 50) {
          anomalies.push({
            type: 'position_change',
            query: row.query,
            currentPosition: row.position,
            previousPosition: prev.position,
            change: parseFloat(positionChange.toFixed(1)),
            direction: positionChange > 0 ? 'dropped' : 'improved',
            severity: Math.abs(positionChange) >= 20 ? 'high' : 'medium'
          });
        }
      });
    }

    // Also detect queries with zero clicks but significant impressions
    queryData.forEach(function (row) {
      if (row.clicks === 0 && row.impressions > 100 && row.position <= 10) {
        anomalies.push({
          type: 'zero_clicks',
          query: row.query,
          impressions: row.impressions,
          position: row.position,
          severity: 'high',
          description: 'Ranking in top 10 with zero clicks — possible SERP feature stealing traffic or title/meta issue.'
        });
      }
    });

    // Sort by severity
    var severityOrder = { high: 0, medium: 1, low: 2 };
    anomalies.sort(function (a, b) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return anomalies.slice(0, 20); // Top 20 anomalies
  }

  // ============================================
  // ANALYSIS 12: HEALTH SCORE
  // ============================================

  /**
   * Calculate an overall SEO Health Score (0-100).
   * @param {Object} kpis
   * @param {Array} ctrHealth
   * @param {Array} opportunities
   * @returns {Object}
   */
  function calculateHealthScore(kpis, ctrHealth, opportunities) {
    var score = 0;

    // 1. CTR Score (30% weight)
    var ctrScore = 0;
    if (kpis.averageCTR >= 5) ctrScore = 30;
    else if (kpis.averageCTR >= 3) ctrScore = 22;
    else if (kpis.averageCTR >= 1.5) ctrScore = 15;
    else ctrScore = 8;

    // 2. Position Score (25% weight)
    var posScore = 0;
    if (kpis.averagePosition <= 5) posScore = 25;
    else if (kpis.averagePosition <= 10) posScore = 20;
    else if (kpis.averagePosition <= 15) posScore = 14;
    else if (kpis.averagePosition <= 20) posScore = 8;
    else posScore = 3;

    // 3. CTR Health Score (25% weight)
    var healthyCTRRatio = 0;
    if (ctrHealth && ctrHealth.length > 0) {
      var healthyCount = ctrHealth.filter(function (r) { return r.status === 'healthy'; }).length;
      healthyCTRRatio = healthyCount / ctrHealth.length;
    }
    var ctrHealthScore = Math.round(healthyCTRRatio * 25);

    // 4. Opportunity Score (20% weight) — inverted: more opportunities = lower score
    var oppScore = 20;
    if (opportunities && opportunities.length > 20) oppScore = 5;
    else if (opportunities && opportunities.length > 10) oppScore = 10;
    else if (opportunities && opportunities.length > 5) oppScore = 15;

    score = ctrScore + posScore + ctrHealthScore + oppScore;

    var status;
    if (score >= 80) status = 'good';
    else if (score >= 60) status = 'fair';
    else if (score >= 40) status = 'needs_attention';
    else status = 'critical';

    return {
      score: score,
      status: status,
      breakdown: {
        ctrScore: ctrScore,
        positionScore: posScore,
        ctrHealthScore: ctrHealthScore,
        opportunityScore: oppScore
      },
      message: getHealthMessage(score)
    };
  }

  /**
   * Generate a human-readable health message.
   * @param {number} score
   * @returns {string}
   */
  function getHealthMessage(score) {
    if (score >= 85) return 'Your SEO performance looks excellent. Keep monitoring and optimizing for continued growth.';
    if (score >= 70) return 'Your site is performing well overall, but there are specific opportunities that can drive significant additional traffic.';
    if (score >= 55) return 'Your SEO has room for improvement. Focus on the priority recommendations to boost your search visibility.';
    if (score >= 40) return 'Your site needs attention. Several key metrics are below average. Prioritize the critical actions below.';
    return 'Immediate action required. Multiple critical issues are impacting your search performance.';
  }

  // ============================================
  // MASTER ANALYZER — Runs all analyses
  // ============================================

  /**
   * Run all analyses on the available data.
   * @param {Object} data - { queryData, pageData, countryData, deviceData, previousQueryData, brandName }
   * @returns {Object}
   */
  function runFullAnalysis(data) {
    var queryData = data.queryData || [];
    var pageData = data.pageData || [];
    var countryData = data.countryData || [];
    var deviceData = data.deviceData || [];
    var previousQueryData = data.previousQueryData || [];
    var brandName = data.brandName || '';

    var kpis = analyzeKPIs(queryData);
    var ctrHealth = analyzeCTRHealth(queryData);
    var opportunities = analyzeOpportunities(queryData);
    var cannibalization = analyzeCannibalization(queryData);
    var contentDecay = analyzeContentDecay(queryData, previousQueryData);
    var deviceGap = analyzeDeviceGap(deviceData);
    var countryPerformance = analyzeCountryPerformance(countryData);
    var topQueries = analyzeTopQueries(queryData);
    var topPages = analyzeTopPages(pageData);
    var brandVsNonBrand = analyzeBrandVsNonBrand(queryData, brandName);
    var anomalies = analyzeAnomalies(queryData, previousQueryData);
    var healthScore = calculateHealthScore(kpis, ctrHealth, opportunities);

    return {
      kpis: kpis,
      healthScore: healthScore,
      ctrHealth: ctrHealth,
      opportunities: opportunities,
      cannibalization: cannibalization,
      contentDecay: contentDecay,
      deviceGap: deviceGap,
      countryPerformance: countryPerformance,
      topQueries: topQueries,
      topPages: topPages,
      brandVsNonBrand: brandVsNonBrand,
      anomalies: anomalies,
      analysisTimestamp: new Date().toISOString()
    };
  }

  // ============================================
  // PUBLIC API
  // ============================================

  window.SEOAnalysisEngine = {
    setCTRBenchmark: setCTRBenchmark,
    getExpectedCTR: getExpectedCTR,
    analyzeKPIs: analyzeKPIs,
    analyzeCTRHealth: analyzeCTRHealth,
    analyzeOpportunities: analyzeOpportunities,
    analyzeCannibalization: analyzeCannibalization,
    analyzeContentDecay: analyzeContentDecay,
    analyzeDeviceGap: analyzeDeviceGap,
    analyzeCountryPerformance: analyzeCountryPerformance,
    analyzeTopQueries: analyzeTopQueries,
    analyzeTopPages: analyzeTopPages,
    analyzeBrandVsNonBrand: analyzeBrandVsNonBrand,
    analyzeAnomalies: analyzeAnomalies,
    calculateHealthScore: calculateHealthScore,
    runFullAnalysis: runFullAnalysis
  };

})();
