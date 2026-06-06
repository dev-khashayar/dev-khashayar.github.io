/**
 * SEO Dashboard — Recommendation Engine
 * 
 * Generates prioritized, actionable recommendations based on analysis results.
 * Acts as a virtual SEO mentor — tells the user exactly what to do, why, and in what order.
 * 
 * @version 1.0.0
 * @date 2026-06
 */

(function () {
  'use strict';

  /**
   * Generate a complete action plan from all analysis results.
   * @param {Object} analysisResults — The full output from SEOAnalysisEngine.runFullAnalysis()
   * @param {string} brandName — Optional brand name for personalized recommendations
   * @returns {Object} — { actions, summary, estimatedImpact }
   */
  function generateActionPlan(analysisResults, brandName) {
    var allActions = [];

    // Collect actions from each analysis section
    allActions = allActions.concat(generateCTRHealthActions(analysisResults.ctrHealth));
    allActions = allActions.concat(generateOpportunityActions(analysisResults.opportunities));
    allActions = allActions.concat(generateCannibalizationActions(analysisResults.cannibalization));
    allActions = allActions.concat(generateContentDecayActions(analysisResults.contentDecay));
    allActions = allActions.concat(generateDeviceGapActions(analysisResults.deviceGap));
    allActions = allActions.concat(generateBrandActions(analysisResults.brandVsNonBrand, brandName));
    allActions = allActions.concat(generateAnomalyActions(analysisResults.anomalies));

    // Calculate priority scores and sort
    allActions.forEach(function (action) {
      action.priorityScore = calculatePriorityScore(action);
    });

    allActions.sort(function (a, b) {
      return b.priorityScore - a.priorityScore;
    });

    // Assign final priorities based on sorted position
    allActions.forEach(function (action, index) {
      if (index < 3) action.finalPriority = 'critical';
      else if (index < 8) action.finalPriority = 'high';
      else if (index < 15) action.finalPriority = 'medium';
      else action.finalPriority = 'low';
    });

    // Generate summary
    var summary = generateSummary(allActions, analysisResults);

    // Estimate total impact
    var estimatedImpact = estimateTotalImpact(allActions);

    return {
      actions: allActions,
      summary: summary,
      estimatedImpact: estimatedImpact,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Calculate priority score for an action.
   * @param {Object} action
   * @returns {number}
   */
  function calculatePriorityScore(action) {
    var impactWeight = 0.4;
    var urgencyWeight = 0.35;
    var effortWeight = -0.25; // Negative because lower effort = higher priority

    var impactScore = Math.min(action.expectedImpact || 0, 100) / 100;
    var urgencyScore = Math.min(action.urgency || 5, 10) / 10;
    var effortScore = Math.min(action.effortHours || 8, 40) / 40;

    return (impactScore * impactWeight + urgencyScore * urgencyWeight + (1 - effortScore) * Math.abs(effortWeight)) * 100;
  }

  // ============================================
  // CTR HEALTH ACTIONS
  // ============================================

  function generateCTRHealthActions(ctrHealth) {
    if (!ctrHealth || ctrHealth.length === 0) return [];

    var criticalItems = ctrHealth.filter(function (item) {
      return item.status === 'critical' && item.impressions >= 50;
    });

    if (criticalItems.length === 0) return [];

    var topItems = criticalItems.slice(0, 5);
    var totalImpressions = topItems.reduce(function (sum, item) { return sum + item.impressions; }, 0);
    var potentialCTRImprovement = 5; // Conservative estimate: 5% CTR improvement

    return [{
      id: 'ctr-optimization',
      category: 'CTR Optimization',
      title: 'Optimize Title Tags and Meta Descriptions for ' + topItems.length + ' Underperforming Queries',
      description: 'These queries have high impressions but CTR significantly below industry average. Improving title tags and meta descriptions can increase CTR by 2-8%. Start with the highest impression queries first.',
      details: topItems.map(function (item) {
        return '• "' + item.query + '" — Position ' + item.position + ', CTR ' + item.ctr + '% vs Expected ' + item.expectedCTR + '% (' + item.impressions + ' impressions)';
      }).join('\n'),
      expectedImpact: Math.round((totalImpressions * potentialCTRImprovement) / 100),
      impactUnit: 'additional clicks/month',
      effortHours: 3,
      urgency: 8,
      timeframe: 'today',
      tags: ['Title Tags', 'Meta Descriptions', 'CTR', 'Quick Win'],
      icon: '📝'
    }];
  }

  // ============================================
  // OPPORTUNITY ACTIONS
  // ============================================

  function generateOpportunityActions(opportunities) {
    if (!opportunities || opportunities.length === 0) return [];

    var actions = [];

    // Low-Hanging Fruit — immediate action
    var lowHanging = opportunities.filter(function (o) { return o.category === 'Low-Hanging Fruit'; }).slice(0, 5);
    if (lowHanging.length > 0) {
      var totalGain = lowHanging.reduce(function (sum, o) { return sum + o.clickGain; }, 0);
      actions.push({
        id: 'low-hanging-fruit',
        category: 'Quick Wins',
        title: 'Capture ' + lowHanging.length + ' Low-Hanging Fruit Keywords (Position 4-7)',
        description: 'These keywords are already ranking on page 1 (positions 4-7) and need only minor content improvements to move into the top 3 positions where CTR is significantly higher.',
        details: lowHanging.map(function (o) {
          return '• "' + o.query + '" — Position ' + o.currentPosition + ' → Target: Top 3 (+' + o.clickGain + ' estimated clicks)';
        }).join('\n'),
        expectedImpact: totalGain,
        impactUnit: 'additional clicks/month',
        effortHours: 4,
        urgency: 9,
        timeframe: 'this-week',
        tags: ['Content Optimization', 'Quick Win', 'High ROI'],
        icon: '⚡'
      });
    }

    // Mid-Term opportunities
    var midTerm = opportunities.filter(function (o) { return o.category === 'Mid-Term'; }).slice(0, 5);
    if (midTerm.length > 0) {
      var midTotalGain = midTerm.reduce(function (sum, o) { return sum + o.clickGain; }, 0);
      actions.push({
        id: 'mid-term-opportunities',
        category: 'Content Development',
        title: 'Develop Content for ' + midTerm.length + ' Mid-Term Opportunities (Position 8-12)',
        description: 'These keywords need more substantial content updates or new supporting content to move into top positions. Each one represents a significant traffic opportunity.',
        details: midTerm.map(function (o) {
          return '• "' + o.query + '" — Position ' + o.currentPosition + ', ' + o.impressions + ' impressions (+' + o.clickGain + ' estimated clicks)';
        }).join('\n'),
        expectedImpact: midTotalGain,
        impactUnit: 'additional clicks/month',
        effortHours: 12,
        urgency: 6,
        timeframe: 'this-month',
        tags: ['Content Strategy', 'Long-form Content', 'Topic Clusters'],
        icon: '📈'
      });
    }

    return actions;
  }

  // ============================================
  // CANNIBALIZATION ACTIONS
  // ============================================

  function generateCannibalizationActions(cannibalization) {
    if (!cannibalization || cannibalization.length === 0) return [];

    var highSeverity = cannibalization.filter(function (c) { return c.severity === 'high'; });
    if (highSeverity.length === 0) return [];

    return [{
      id: 'fix-cannibalization',
      category: 'Technical SEO',
      title: 'Resolve ' + highSeverity.length + ' Keyword Cannibalization Issues',
      description: 'Multiple URLs are competing for the same keywords, diluting your ranking authority. Consolidating these pages will strengthen the remaining page and improve rankings.',
      details: highSeverity.map(function (c) {
        return '• "' + c.query + '" — ' + c.urlCount + ' URLs competing (positions ' + c.minPosition + '-' + c.maxPosition + '). Recommendation: ' + getCannibalFix(c);
      }).join('\n'),
      expectedImpact: highSeverity.length * 50,
      impactUnit: 'additional clicks/month',
      effortHours: 4,
      urgency: 9,
      timeframe: 'today',
      tags: ['Cannibalization', '301 Redirect', 'Content Consolidation', 'Critical'],
      icon: '⚠️'
    }];
  }

  /**
   * Suggest a fix for a cannibalization case.
   * @param {Object} cannibal
   * @returns {string}
   */
  function getCannibalFix(cannibal) {
    if (cannibal.urlCount === 2) {
      return 'Merge the weaker page into the stronger one and set up a 301 redirect.';
    }
    if (cannibal.urlCount >= 3) {
      return 'Choose the best-performing URL as canonical. Differentiate or merge the others with 301 redirects.';
    }
    return 'Review content differentiation between these URLs.';
  }

  // ============================================
  // CONTENT DECAY ACTIONS
  // ============================================

  function generateContentDecayActions(contentDecay) {
    if (!contentDecay || contentDecay.length === 0) return [];

    var critical = contentDecay.filter(function (d) { return d.stage === 'critical'; }).slice(0, 3);
    var accelerating = contentDecay.filter(function (d) { return d.stage === 'accelerating'; }).slice(0, 3);

    var items = critical.concat(accelerating).slice(0, 5);
    if (items.length === 0) return [];

    return [{
      id: 'content-refresh',
      category: 'Content Maintenance',
      title: 'Refresh ' + items.length + ' Declining Content Pieces',
      description: 'These pages are losing traffic consistently. A content refresh — updating statistics, adding new insights, improving readability — can recover and even grow their traffic.',
      details: items.map(function (d) {
        return '• "' + d.query + '" — ' + Math.abs(d.clickChangePercent) + '% decline (' + d.previousClicks + ' → ' + d.currentClicks + ' clicks). Stage: ' + d.stage;
      }).join('\n'),
      expectedImpact: items.reduce(function (sum, d) { return sum + Math.abs(d.clickChange); }, 0),
      impactUnit: 'recovered clicks/month',
      effortHours: 6,
      urgency: 7,
      timeframe: 'this-week',
      tags: ['Content Refresh', 'Historical Optimization', 'Traffic Recovery'],
      icon: '🔄'
    }];
  }

  // ============================================
  // DEVICE GAP ACTIONS
  // ============================================

  function generateDeviceGapActions(deviceGap) {
    if (!deviceGap || !deviceGap.gap) return [];

    var gap = deviceGap.gap;

    if (gap.positionGap <= 1.5 && gap.ctrGap >= -1) return [];

    var actions = [];

    if (gap.positionGap > 2) {
      actions.push({
        id: 'mobile-optimization',
        category: 'Technical SEO',
        title: 'Improve Mobile Performance — ' + gap.positionGap.toFixed(1) + ' Position Gap vs Desktop',
        description: 'Your mobile rankings are significantly worse than desktop. This indicates mobile usability or Core Web Vitals issues. Google uses mobile-first indexing, so this directly impacts your overall rankings.',
        details: '• Mobile avg position: ' + deviceGap.MOBILE.avgPosition + ' vs Desktop: ' + deviceGap.DESKTOP.avgPosition +
                 '\n• Mobile CTR: ' + deviceGap.MOBILE.ctr + '% vs Desktop: ' + deviceGap.DESKTOP.ctr + '%' +
                 '\n• Priority actions: Run PageSpeed Insights for mobile, check Mobile Usability report in GSC, optimize images and fonts.',
        expectedImpact: Math.round(deviceGap.MOBILE.impressions * 0.02),
        impactUnit: 'additional mobile clicks/month',
        effortHours: 8,
        urgency: 7,
        timeframe: 'this-month',
        tags: ['Mobile SEO', 'Core Web Vitals', 'Mobile-First'],
        icon: '📱'
      });
    }

    return actions;
  }

  // ============================================
  // BRAND vs NON-BRAND ACTIONS
  // ============================================

  function generateBrandActions(brandVsNonBrand, brandName) {
    if (!brandVsNonBrand || !brandVsNonBrand.brand) return [];

    var brandShare = brandVsNonBrand.brand.clickShare || 0;

    if (brandShare <= 70) return [];

    return [{
      id: 'non-brand-strategy',
      category: 'Content Strategy',
      title: 'Develop Non-Brand Content Strategy — ' + brandShare + '% of Traffic is Branded',
      description: 'Heavy reliance on brand traffic is risky. If brand interest declines or a competitor targets your brand terms, your traffic could drop sharply. Building non-brand organic traffic creates a more resilient SEO foundation.',
      details: '• Brand clicks: ' + brandVsNonBrand.brand.clicks + ' (' + brandShare + '% of total)' +
               '\n• Non-brand clicks: ' + brandVsNonBrand.nonBrand.clicks + ' (' + brandVsNonBrand.nonBrand.clickShare + '% of total)' +
               '\n• Recommendation: Identify informational and commercial-intent keywords in your niche that don\'t include your brand name and create content targeting them.',
      expectedImpact: Math.round(brandVsNonBrand.brand.clicks * 0.2),
      impactUnit: 'additional non-brand clicks/month',
      effortHours: 20,
      urgency: 5,
      timeframe: 'this-quarter',
      tags: ['Brand Strategy', 'Content Marketing', 'Traffic Diversity'],
      icon: '🏗️'
    }];
  }

  // ============================================
  // ANOMALY ACTIONS
  // ============================================

  function generateAnomalyActions(anomalies) {
    if (!anomalies || anomalies.length === 0) return [];

    var highSeverity = anomalies.filter(function (a) { return a.severity === 'high'; }).slice(0, 5);
    if (highSeverity.length === 0) return [];

    return [{
      id: 'investigate-anomalies',
      category: 'Diagnostics',
      title: 'Investigate ' + highSeverity.length + ' Significant Anomalies',
      description: 'Unusual changes in clicks, impressions, or rankings can indicate technical issues, algorithm updates, or competitor activity. Investigating these early prevents long-term damage.',
      details: highSeverity.map(function (a) {
        var desc = '• ';
        if (a.type === 'click_change') {
          desc += '"' + a.query + '" — Clicks ' + a.direction + 'd by ' + a.changePercent + '%';
        } else if (a.type === 'position_change') {
          desc += '"' + a.query + '" — Position ' + a.direction + ' by ' + Math.abs(a.change) + ' positions';
        } else if (a.type === 'zero_clicks') {
          desc += '"' + a.query + '" — Ranking #' + a.position + ' with ' + a.impressions + ' impressions but ZERO clicks';
        }
        return desc;
      }).join('\n'),
      expectedImpact: highSeverity.length * 30,
      impactUnit: 'potential clicks recovered/month',
      effortHours: 3,
      urgency: 8,
      timeframe: 'today',
      tags: ['Anomaly Detection', 'Diagnostics', 'Monitoring'],
      icon: '🔍'
    }];
  }

  // ============================================
  // SUMMARY GENERATOR
  // ============================================

  function generateSummary(actions, analysisResults) {
    var criticalCount = actions.filter(function (a) { return a.finalPriority === 'critical'; }).length;
    var highCount = actions.filter(function (a) { return a.finalPriority === 'high'; }).length;
    var totalEstimatedImpact = actions.slice(0, 10).reduce(function (sum, a) { return sum + (a.expectedImpact || 0); }, 0);
    var healthStatus = analysisResults.healthScore ? analysisResults.healthScore.status : 'unknown';

    var summaries = {
      good: 'Your SEO is in great shape! Focus on the high-impact opportunities below to maintain and grow your traffic.',
      fair: 'Your site is performing decently, but there are clear opportunities to improve. Prioritize the ' + criticalCount + ' critical actions first.',
      needs_attention: 'Your SEO needs focused attention. Addressing the ' + criticalCount + ' critical and ' + highCount + ' high-priority actions below can significantly improve your search performance.',
      critical: 'Immediate action is needed. Multiple critical issues are affecting your search visibility. Start with the top priorities below.'
    };

    return {
      text: summaries[healthStatus] || summaries['needs_attention'],
      criticalCount: criticalCount,
      highCount: highCount,
      totalActions: actions.length,
      totalEstimatedImpact: totalEstimatedImpact,
      timeframe: '30 days'
    };
  }

  // ============================================
  // IMPACT ESTIMATOR
  // ============================================

  function estimateTotalImpact(actions) {
    var topActions = actions.filter(function (a) {
      return a.finalPriority === 'critical' || a.finalPriority === 'high';
    });

    var totalMin = 0;
    var totalMax = 0;

    topActions.forEach(function (action) {
      var base = action.expectedImpact || 0;
      totalMin += Math.round(base * 0.6); // Conservative: 60% of expected
      totalMax += Math.round(base * 1.3); // Optimistic: 130% of expected
    });

    return {
      min: totalMin,
      max: totalMax,
      unit: 'additional clicks/month',
      confidence: 'Based on industry benchmarks and historical data. Actual results depend on implementation quality and market conditions.'
    };
  }

  // ============================================
  // PUBLIC API
  // ============================================

  window.SEORecommendationEngine = {
    generateActionPlan: generateActionPlan,
    generateCTRHealthActions: generateCTRHealthActions,
    generateOpportunityActions: generateOpportunityActions,
    generateCannibalizationActions: generateCannibalizationActions,
    generateContentDecayActions: generateContentDecayActions,
    generateDeviceGapActions: generateDeviceGapActions,
    generateBrandActions: generateBrandActions,
    generateAnomalyActions: generateAnomalyActions
  };

})();
