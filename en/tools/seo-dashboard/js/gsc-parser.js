/**
 * SEO Dashboard — GSC Data Parser
 * 
 * Parses Google Search Console CSV exports into a normalized format.
 * Handles column mapping, data cleaning, and validation.
 * 
 * @version 1.0.0
 * @date 2026-06
 */

(function () {
  'use strict';

  /**
   * Expected column mappings for GSC CSV export.
   * GSC exports can vary slightly based on the report type.
   */
  var COLUMN_MAPS = {
    query: {
      query: ['Query', 'Search query', 'query', 'Top queries'],
      clicks: ['Clicks', 'clicks'],
      impressions: ['Impressions', 'impressions'],
      ctr: ['CTR', 'ctr', 'Click through rate'],
      position: ['Position', 'position', 'Average position', 'Avg. position']
    },
    page: {
      page: ['Page', 'page', 'Top pages', 'URL'],
      clicks: ['Clicks', 'clicks'],
      impressions: ['Impressions', 'impressions'],
      ctr: ['CTR', 'ctr'],
      position: ['Position', 'position', 'Average position']
    },
    country: {
      country: ['Country', 'country'],
      clicks: ['Clicks', 'clicks'],
      impressions: ['Impressions', 'impressions'],
      ctr: ['CTR', 'ctr'],
      position: ['Position', 'position']
    },
    device: {
      device: ['Device', 'device'],
      clicks: ['Clicks', 'clicks'],
      impressions: ['Impressions', 'impressions'],
      ctr: ['CTR', 'ctr'],
      position: ['Position', 'position']
    }
  };

  /**
   * Detect the type of GSC report based on column headers.
   * @param {Array} headers
   * @returns {string} - 'query', 'page', 'country', 'device', or 'unknown'
   */
  function detectReportType(headers) {
    var headerStr = headers.join(' ').toLowerCase();

    if (headerStr.indexOf('query') !== -1 || headerStr.indexOf('search query') !== -1) {
      return 'query';
    }
    if (headerStr.indexOf('page') !== -1 || headerStr.indexOf('url') !== -1) {
      return 'page';
    }
    if (headerStr.indexOf('country') !== -1) {
      return 'country';
    }
    if (headerStr.indexOf('device') !== -1) {
      return 'device';
    }
    return 'unknown';
  }

  /**
   * Find the matching column index from headers based on possible names.
   * @param {Array} headers
   * @param {Array} possibleNames
   * @returns {number} - Column index or -1 if not found
   */
  function findColumn(headers, possibleNames) {
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i].trim().toLowerCase();
      for (var j = 0; j < possibleNames.length; j++) {
        if (header === possibleNames[j].toLowerCase()) {
          return i;
        }
      }
    }
    return -1;
  }

  /**
   * Parse a numeric value from a string.
   * @param {string} value
   * @returns {number}
   */
  function parseNumber(value) {
    if (!value || value.trim() === '') return 0;
    // Remove commas, percentage signs, etc.
    var cleaned = value.replace(/,/g, '').replace(/%/g, '').trim();
    var num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Clean a query string.
   * @param {string} query
   * @returns {string}
   */
  function cleanQuery(query) {
    if (!query) return '';
    return query.trim().toLowerCase();
  }

  /**
   * Clean a URL string — extract path from full URL.
   * @param {string} url
   * @returns {string}
   */
  function cleanUrl(url) {
    if (!url) return '';
    url = url.trim();
    // If it's a full URL, extract the path
    if (url.indexOf('http') === 0) {
      try {
        var parsed = new URL(url);
        return parsed.pathname + parsed.search;
      } catch (e) {
        return url;
      }
    }
    return url;
  }

  /**
   * Parse a GSC CSV string into structured data.
   * @param {string} csvText - Raw CSV text
   * @returns {Object} - { type, headers, rows, rowCount, errors }
   */
  function parseGSCExport(csvText) {
    if (!csvText || csvText.trim() === '') {
      return { type: 'unknown', headers: [], rows: [], rowCount: 0, errors: ['File is empty.'] };
    }

    var lines = csvText.split(/\r?\n/).filter(function (line) {
      return line.trim() !== '';
    });

    if (lines.length < 2) {
      return { type: 'unknown', headers: [], rows: [], rowCount: 0, errors: ['File must have at least a header row and one data row.'] };
    }

    // Parse header row
    var headers = parseCSVLine(lines[0]);
    var type = detectReportType(headers);
    var columnMap = COLUMN_MAPS[type] || COLUMN_MAPS['query'];

    if (type === 'unknown') {
      return {
        type: 'unknown',
        headers: headers,
        rows: [],
        rowCount: 0,
        errors: ['Could not detect report type. Please upload a valid Google Search Console export file.']
      };
    }

    // Find column indices
    var colIndices = {};
    for (var key in columnMap) {
      if (columnMap.hasOwnProperty(key)) {
        colIndices[key] = findColumn(headers, columnMap[key]);
      }
    }

    // Validate required columns
    var missingCols = [];
    if (colIndices.clicks === -1) missingCols.push('Clicks');
    if (colIndices.impressions === -1) missingCols.push('Impressions');
    if (colIndices.position === -1) missingCols.push('Position');

    if (missingCols.length > 0) {
      return {
        type: type,
        headers: headers,
        rows: [],
        rowCount: 0,
        errors: ['Missing required columns: ' + missingCols.join(', ') + '. Please check your export file.']
      };
    }

    // Parse data rows
    var rows = [];
    var errors = [];

    for (var i = 1; i < lines.length; i++) {
      try {
        var values = parseCSVLine(lines[i]);

        if (values.length < headers.length) {
          // Pad with empty strings if row is shorter
          while (values.length < headers.length) {
            values.push('');
          }
        }

        var row = {
          clicks: parseNumber(values[colIndices.clicks]),
          impressions: parseNumber(values[colIndices.impressions]),
          ctr: colIndices.ctr !== -1 ? parseNumber(values[colIndices.ctr]) : 0,
          position: parseNumber(values[colIndices.position])
        };

        // Calculate CTR if not provided
        if (row.ctr === 0 && row.impressions > 0) {
          row.ctr = parseFloat(((row.clicks / row.impressions) * 100).toFixed(1));
        }

        // Add type-specific fields
        if (type === 'query' && colIndices.query !== -1) {
          row.query = cleanQuery(values[colIndices.query]);
        } else if (type === 'page' && colIndices.page !== -1) {
          row.page = cleanUrl(values[colIndices.page]);
        } else if (type === 'country' && colIndices.country !== -1) {
          row.country = values[colIndices.country].trim();
        } else if (type === 'device' && colIndices.device !== -1) {
          row.device = values[colIndices.device].trim().toUpperCase();
        }

        // Skip rows with no impressions (usually noise)
        if (row.impressions === 0 && row.clicks === 0) {
          continue;
        }

        rows.push(row);
      } catch (e) {
        errors.push('Row ' + (i + 1) + ': ' + e.message);
      }
    }

    return {
      type: type,
      headers: headers,
      rows: rows,
      rowCount: rows.length,
      errors: errors
    };
  }

  /**
   * Parse a single CSV line into an array of values.
   * Handles quoted fields with commas inside them.
   * @param {string} line
   * @returns {Array<string>}
   */
  function parseCSVLine(line) {
    var result = [];
    var current = '';
    var inQuotes = false;

    for (var i = 0; i < line.length; i++) {
      var char = line[i];
      var nextChar = line[i + 1];

      if (char === '"' && !inQuotes) {
        inQuotes = true;
        continue;
      }

      if (char === '"' && inQuotes) {
        if (nextChar === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    // Push the last value
    result.push(current);

    return result;
  }

  /**
   * Try to detect the date range from the CSV content.
   * Some GSC exports include the date range in the first few lines before the header.
   * @param {string} csvText
   * @returns {Object|null} - { startDate, endDate } or null
   */
  function detectDateRange(csvText) {
    var lines = csvText.split(/\r?\n/);
    var datePattern = /(\d{4}[-/]\d{2}[-/]\d{2})|(\d{2}[-/]\d{2}[-/]\d{4})|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i;

    // Check first 10 lines for date hints
    for (var i = 0; i < Math.min(10, lines.length); i++) {
      var match = lines[i].match(datePattern);
      if (match) {
        // Simple detection — we'll rely on user input for exact dates
        return null;
      }
    }
    return null;
  }

  /**
   * Validate that the parsed data looks reasonable.
   * @param {Object} parsedData
   * @returns {Object} - { valid, warnings }
   */
  function validateData(parsedData) {
    var warnings = [];

    if (parsedData.rowCount === 0) {
      return { valid: false, warnings: ['No data rows found in the file.'] };
    }

    if (parsedData.rowCount < 5) {
      warnings.push('Very few data rows (' + parsedData.rowCount + '). Analysis may be limited.');
    }

    // Check for suspiciously high CTR values
    var highCTRCount = parsedData.rows.filter(function (r) { return r.ctr > 50; }).length;
    if (highCTRCount > parsedData.rowCount * 0.3) {
      warnings.push('Many rows have CTR > 50%. Please verify your data.');
    }

    // Check for all-zero clicks
    var zeroClicksCount = parsedData.rows.filter(function (r) { return r.clicks === 0; }).length;
    if (zeroClicksCount === parsedData.rowCount) {
      warnings.push('All rows have zero clicks. The site may have very low traffic or the data may be incorrect.');
    }

    return { valid: true, warnings: warnings };
  }

  // ============================================
  // PUBLIC API
  // ============================================

  window.GSCParser = {
    parseGSCExport: parseGSCExport,
    detectReportType: detectReportType,
    validateData: validateData,
    detectDateRange: detectDateRange
  };

})();
