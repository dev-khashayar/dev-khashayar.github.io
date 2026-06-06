/**
 * SEO Dashboard — GSC Data Parser (v2)
 * 
 * Parses Google Search Console CSV exports into a normalized format.
 * Handles column mapping, data cleaning, encoding detection, and validation.
 * 
 * Changelog v2:
 * - Added encoding detection (UTF-8 BOM, mojibake detection)
 * - More robust report type detection with column position mapping
 * - Fallback detection when headers are garbled
 * 
 * @version 2.0.0
 * @date 2026-06
 */

(function () {
  'use strict';

  /**
   * Expected column mappings for GSC CSV export.
   * Each key has an array of possible header names (case-insensitive matching).
   */
  var COLUMN_MAPS = {
    query: {
      query: ['Query', 'Search query', 'query', 'Top queries', 'Queries', 'search query', 'top queries', 'queries'],
      clicks: ['Clicks', 'clicks', 'Click', 'click'],
      impressions: ['Impressions', 'impressions', 'Impression', 'impression'],
      ctr: ['CTR', 'ctr', 'Click through rate', 'click through rate', 'Ctr'],
      position: ['Position', 'position', 'Average position', 'Avg. position', 'Avg position', 'average position']
    },
    page: {
      page: ['Page', 'page', 'Top pages', 'Top page', 'URL', 'url', 'Pages', 'pages'],
      clicks: ['Clicks', 'clicks'],
      impressions: ['Impressions', 'impressions'],
      ctr: ['CTR', 'ctr'],
      position: ['Position', 'position', 'Average position']
    },
    country: {
      country: ['Country', 'country', 'Countries', 'countries'],
      clicks: ['Clicks', 'clicks'],
      impressions: ['Impressions', 'impressions'],
      ctr: ['CTR', 'ctr'],
      position: ['Position', 'position']
    },
    device: {
      device: ['Device', 'device', 'Devices', 'devices'],
      clicks: ['Clicks', 'clicks'],
      impressions: ['Impressions', 'impressions'],
      ctr: ['CTR', 'ctr'],
      position: ['Position', 'position']
    }
  };

  /**
   * Known English header keywords — used as fallback when headers are garbled.
   * GSC always exports these in a specific order for each report type.
   */
  var GSC_EXPORT_PATTERNS = {
    query: {
      columnOrder: ['query', 'clicks', 'impressions', 'ctr', 'position'],
      // GSC query export always has: Query, Clicks, Impressions, CTR, Position
      columnCount: 5
    },
    page: {
      columnOrder: ['page', 'clicks', 'impressions', 'ctr', 'position'],
      columnCount: 5
    },
    country: {
      columnOrder: ['country', 'clicks', 'impressions', 'ctr', 'position'],
      columnCount: 5
    },
    device: {
      columnOrder: ['device', 'clicks', 'impressions', 'ctr', 'position'],
      columnCount: 5
    }
  };

  /**
   * Try to decode text that might be garbled due to encoding issues.
   * GSC exports as UTF-8, but some editors re-encode as Windows-1256 or ISO-8859-6.
   * @param {string} text
   * @returns {string}
   */
  function tryFixEncoding(text) {
    if (!text || text.trim() === '') return text;

    // Check if text already contains valid Persian characters
    var persianPattern = /[\u0600-\u06FF]/;
    if (persianPattern.test(text)) {
      return text; // Already valid Persian
    }

    // Check if text looks like mojibake (garbled UTF-8 interpreted as Latin-1)
    // Common patterns: Ã, Â, Ù, Ú, Û, etc. for Persian text
    var mojibakePattern = /[\u00C0-\u00FF]{3,}/;
    if (mojibakePattern.test(text)) {
      try {
        // Attempt to fix: re-encode from Latin-1 to UTF-8
        var fixed = '';
        for (var i = 0; i < text.length; i++) {
          var code = text.charCodeAt(i);
          if (code > 127) {
            // This might be a UTF-8 byte misinterpreted as Latin-1
            // Try to recover by converting back
            fixed += String.fromCharCode(code);
          } else {
            fixed += text.charAt(i);
          }
        }
        // Try decoding as UTF-8 bytes
        try {
          var decoder = new TextDecoder('utf-8');
          var encoder = new TextEncoder();
          var bytes = new Uint8Array(text.length);
          for (var j = 0; j < text.length; j++) {
            bytes[j] = text.charCodeAt(j) & 0xFF;
          }
          var decoded = decoder.decode(bytes);
          if (persianPattern.test(decoded)) {
            return decoded;
          }
        } catch (e) {
          // Decoding failed, return original
        }
      } catch (e) {
        // Fix failed
      }
    }

    return text;
  }

  /**
   * Detect the type of GSC report based on column headers.
   * Uses multiple strategies for robustness.
   * @param {Array} headers
   * @returns {string} - 'query', 'page', 'country', 'device', or 'unknown'
   */
  function detectReportType(headers) {
    if (!headers || headers.length === 0) return 'unknown';

    // Strategy 1: Try to fix encoding and match
    var fixedHeaders = headers.map(function (h) {
      return tryFixEncoding(h).toLowerCase().trim();
    });

    var headerStr = fixedHeaders.join(' ');

    // Check for Persian keywords that indicate query report
    var persianQueryKeywords = ['Ú©ÙˆØ¦Ø±ÛŒ', 'Ú©ÙˆØ¦Ø±ÛŒâ€ŒÙ‡Ø§', 'Ø¨Ø±ØªØ±ÛŒÙ†', 'query', 'search query', 'top queries'];
    var hasQueryIndicator = persianQueryKeywords.some(function (kw) {
      return headerStr.indexOf(kw.toLowerCase()) !== -1;
    });

    if (hasQueryIndicator) return 'query';

    // Strategy 2: Use column count pattern matching
    if (headers.length === 5) {
      // GSC exports with 5 columns: [dimension, clicks, impressions, ctr, position]
      var firstHeader = fixedHeaders[0];

      // If first header contains country-related terms
      if (firstHeader.indexOf('country') !== -1 || firstHeader.indexOf('countries') !== -1) {
        return 'country';
      }

      // If first header contains device-related terms
      if (firstHeader.indexOf('device') !== -1 || firstHeader.indexOf('devices') !== -1) {
        return 'device';
      }

      // If first header contains page/url terms
      if (firstHeader.indexOf('page') !== -1 || firstHeader.indexOf('url') !== -1 || firstHeader.indexOf('pages') !== -1) {
        return 'page';
      }

      // Default: treat 5-column exports as query reports (most common)
      // Check if the first column header doesn't look like a known page/device/country column
      if (firstHeader.indexOf('click') === -1 &&
          firstHeader.indexOf('impression') === -1 &&
          firstHeader.indexOf('ctr') === -1 &&
          firstHeader.indexOf('position') === -1) {
        return 'query';
      }
    }

    // Strategy 3: Look for specific English keywords
    if (headerStr.indexOf('query') !== -1 || headerStr.indexOf('search query') !== -1 || headerStr.indexOf('top queries') !== -1) {
      return 'query';
    }
    if (headerStr.indexOf('page') !== -1 || headerStr.indexOf('url') !== -1 || headerStr.indexOf('top pages') !== -1) {
      return 'page';
    }
    if (headerStr.indexOf('country') !== -1) {
      return 'country';
    }
    if (headerStr.indexOf('device') !== -1) {
      return 'device';
    }

    // Strategy 4: Last resort — if we have exactly 5 columns, it's probably a query report
    if (headers.length === 5) {
      return 'query';
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
      var header = (headers[i] || '').trim().toLowerCase();
      // Try original header
      for (var j = 0; j < possibleNames.length; j++) {
        if (header === possibleNames[j].toLowerCase()) {
          return i;
        }
      }
      // Try fixed encoding header
      var fixedHeader = tryFixEncoding(headers[i] || '').toLowerCase().trim();
      for (var k = 0; k < possibleNames.length; k++) {
        if (fixedHeader === possibleNames[k].toLowerCase()) {
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
   * Clean a query string — fix encoding if needed.
   * @param {string} query
   * @returns {string}
   */
  function cleanQuery(query) {
    if (!query) return '';
    return tryFixEncoding(query.trim().toLowerCase());
  }

  /**
   * Clean a URL string — extract path from full URL.
   * @param {string} url
   * @returns {string}
   */
  function cleanUrl(url) {
    if (!url) return '';
    url = url.trim();
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
   * @returns {Object} - { type, headers, rows, rowCount, errors, encodingFixed }
   */
  function parseGSCExport(csvText) {
    if (!csvText || csvText.trim() === '') {
      return { type: 'unknown', headers: [], rows: [], rowCount: 0, errors: ['File is empty.'], encodingFixed: false };
    }

    // Try to detect and fix BOM (Byte Order Mark)
    if (csvText.charCodeAt(0) === 0xFEFF) {
      csvText = csvText.slice(1);
    }

    var lines = csvText.split(/\r?\n/).filter(function (line) {
      return line.trim() !== '';
    });

    if (lines.length < 2) {
      return { type: 'unknown', headers: [], rows: [], rowCount: 0, errors: ['File must have at least a header row and one data row.'], encodingFixed: false };
    }

    // Parse header row
    var headers = parseCSVLine(lines[0]);

    // Try to fix encoding in headers
    var encodingFixed = false;
    var fixedHeaders = headers.map(function (h) {
      var fixed = tryFixEncoding(h);
      if (fixed !== h) encodingFixed = true;
      return fixed;
    });

    var type = detectReportType(headers);
    var columnMap = COLUMN_MAPS[type] || COLUMN_MAPS['query'];

    if (type === 'unknown') {
      return {
        type: 'unknown',
        headers: headers,
        rows: [],
        rowCount: 0,
        errors: ['Could not detect report type. Expected columns: Query/Search query, Clicks, Impressions, CTR, Position. Please ensure you exported from Google Search Console Performance report with all 5 metrics selected.'],
        encodingFixed: encodingFixed
      };
    }

    // Find column indices — try original headers first, then fixed
    var colIndices = {};
    var allColsFound = true;

    for (var key in columnMap) {
      if (columnMap.hasOwnProperty(key)) {
        colIndices[key] = findColumn(headers, columnMap[key]);

        // If not found with original headers, try with fixed headers
        if (colIndices[key] === -1 && encodingFixed) {
          colIndices[key] = findColumn(fixedHeaders, columnMap[key]);
        }
      }
    }

    // If column detection failed, try position-based fallback
    if (colIndices.clicks === -1 || colIndices.impressions === -1 || colIndices.position === -1) {
      // GSC exports have a specific order: [dimension, clicks, impressions, ctr, position]
      if (headers.length >= 5) {
        // Assume the last 4 columns are: clicks, impressions, ctr, position
        colIndices.clicks = headers.length - 4;
        colIndices.impressions = headers.length - 3;
        colIndices.ctr = headers.length - 2;
        colIndices.position = headers.length - 1;
      }
    }

    // Validate required columns
    var missingCols = [];
    if (colIndices.clicks === -1 || colIndices.clicks === undefined) missingCols.push('Clicks');
    if (colIndices.impressions === -1 || colIndices.impressions === undefined) missingCols.push('Impressions');
    if (colIndices.position === -1 || colIndices.position === undefined) missingCols.push('Position');

    if (missingCols.length > 0) {
      return {
        type: type,
        headers: headers,
        rows: [],
        rowCount: 0,
        errors: ['Missing required columns: ' + missingCols.join(', ') + '. Found headers: ' + headers.join(', ') + '. Please ensure you exported with all metrics selected (Clicks, Impressions, CTR, Position).'],
        encodingFixed: encodingFixed
      };
    }

    // Parse data rows
    var rows = [];
    var errors = [];

    for (var i = 1; i < lines.length; i++) {
      try {
        var values = parseCSVLine(lines[i]);

        if (values.length < headers.length) {
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

        // Calculate CTR if not provided or zero
        if ((row.ctr === 0 || isNaN(row.ctr)) && row.impressions > 0) {
          row.ctr = parseFloat(((row.clicks / row.impressions) * 100).toFixed(1));
        }

        // Add type-specific fields
        if (type === 'query') {
          var queryIndex = colIndices.query !== undefined ? colIndices.query : 0;
          row.query = cleanQuery(values[queryIndex] || '');
        } else if (type === 'page') {
          var pageIndex = colIndices.page !== undefined ? colIndices.page : 0;
          row.page = cleanUrl(values[pageIndex] || '');
        } else if (type === 'country') {
          var countryIndex = colIndices.country !== undefined ? colIndices.country : 0;
          row.country = (values[countryIndex] || '').trim();
        } else if (type === 'device') {
          var deviceIndex = colIndices.device !== undefined ? colIndices.device : 0;
          row.device = (values[deviceIndex] || '').trim().toUpperCase();
        }

        // Skip rows with no impressions and no clicks (usually noise)
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
      errors: errors,
      encodingFixed: encodingFixed
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

    result.push(current);
    return result;
  }

  /**
   * Detect the date range from the CSV content.
   * Some GSC exports include the date range in the first few lines before the header.
   * @param {string} csvText
   * @returns {Object|null} - { startDate, endDate } or null
   */
  function detectDateRange(csvText) {
    var lines = csvText.split(/\r?\n/);
    var datePattern = /(\d{4}[-/]\d{2}[-/]\d{2})|(\d{2}[-/]\d{2}[-/]\d{4})|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i;

    for (var i = 0; i < Math.min(10, lines.length); i++) {
      var match = lines[i].match(datePattern);
      if (match) {
        return null; // Found date hints, but exact extraction is complex
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
      return { valid: false, warnings: ['No data rows found in the file. Please check that your CSV export contains data.'] };
    }

    if (parsedData.rowCount < 5) {
      warnings.push('Very few data rows (' + parsedData.rowCount + '). Analysis may be limited. Consider exporting a longer date range.');
    }

    // Check for suspiciously high CTR values
    var highCTRCount = parsedData.rows.filter(function (r) { return r.ctr > 50; }).length;
    if (highCTRCount > parsedData.rowCount * 0.3) {
      warnings.push('Many rows have CTR > 50%. Please verify your data is correct.');
    }

    // Check for all-zero clicks
    var zeroClicksCount = parsedData.rows.filter(function (r) { return r.clicks === 0; }).length;
    if (zeroClicksCount === parsedData.rowCount) {
      warnings.push('All rows have zero clicks. The site may have very low traffic or the exported date range had no click data.');
    }

    // Check for encoding issues
    if (parsedData.encodingFixed) {
      warnings.push('Some text encoding was automatically fixed. If query names still look garbled, please re-export from Google Search Console using UTF-8 encoding.');
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
    detectDateRange: detectDateRange,
    tryFixEncoding: tryFixEncoding
  };

})();
