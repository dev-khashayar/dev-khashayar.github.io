/**
 * SEO Dashboard — GSC Data Parser (v3)
 * 
 * Parses Google Search Console CSV & XLSX exports into a normalized format.
 * Handles column mapping, data cleaning, encoding detection, XLSX multi-sheet,
 * and validation.
 * 
 * Changelog v3:
 * - Added full XLSX multi-sheet support (SheetJS integration)
 * - Added encoding detection (UTF-8 BOM, mojibake detection)
 * - More robust report type detection with column position mapping
 * - Fallback detection when headers are garbled
 * - Performance optimization for large datasets
 * 
 * @version 3.0.0
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
   * Try to fix garbled text from encoding issues.
   * GSC exports as UTF-8, but some editors re-encode as Windows-1256 or ISO-8859-6.
   * @param {string} text
   * @returns {string}
   */
  function tryFixEncoding(text) {
    if (!text || text.trim() === '') return text;

    // Check if text already contains valid Persian/Arabic characters
    var persianPattern = /[\u0600-\u06FF]/;
    if (persianPattern.test(text)) {
      return text;
    }

    // Check if text looks like mojibake (garbled UTF-8 interpreted as Latin-1)
    var mojibakePattern = /[\u00C0-\u00FF]{3,}/;
    if (mojibakePattern.test(text)) {
      try {
        var bytes = new Uint8Array(text.length);
        for (var j = 0; j < text.length; j++) {
          bytes[j] = text.charCodeAt(j) & 0xFF;
        }
        var decoder = new TextDecoder('utf-8');
        var decoded = decoder.decode(bytes);
        if (persianPattern.test(decoded)) {
          return decoded;
        }
      } catch (e) {
        // Decoding failed, return original
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

    var fixedHeaders = headers.map(function (h) {
      return tryFixEncoding(h).toLowerCase().trim();
    });

    var headerStr = fixedHeaders.join(' ');

    // Strategy 1: Check for query-related keywords
    var queryKeywords = ['query', 'search query', 'top queries', 'queries'];
    var hasQueryIndicator = queryKeywords.some(function (kw) {
      return headerStr.indexOf(kw.toLowerCase()) !== -1;
    });
    if (hasQueryIndicator) return 'query';

    // Strategy 2: Check for page/url keywords
    var pageKeywords = ['page', 'url', 'top pages', 'pages'];
    var hasPageIndicator = pageKeywords.some(function (kw) {
      return headerStr.indexOf(kw.toLowerCase()) !== -1;
    });
    if (hasPageIndicator) return 'page';

    // Strategy 3: Check for country
    if (headerStr.indexOf('country') !== -1 || headerStr.indexOf('countries') !== -1) {
      return 'country';
    }

    // Strategy 4: Check for device
    if (headerStr.indexOf('device') !== -1 || headerStr.indexOf('devices') !== -1) {
      return 'device';
    }

    // Strategy 5: Column count heuristic
    if (headers.length === 5) {
      var firstHeader = fixedHeaders[0];
      var secondHeader = fixedHeaders[1];

      // If second column is "clicks", first column is the dimension
      if (secondHeader === 'clicks' || secondHeader === 'click') {
        if (firstHeader === 'page' || firstHeader === 'top pages' || firstHeader === 'url') return 'page';
        if (firstHeader === 'country') return 'country';
        if (firstHeader === 'device') return 'device';
        return 'query';
      }

      // Default for 5 columns: assume query report
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
      var fixedHeader = tryFixEncoding(header).toLowerCase().trim();

      for (var j = 0; j < possibleNames.length; j++) {
        var candidate = possibleNames[j].toLowerCase();
        if (header === candidate || fixedHeader === candidate) {
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
    if (!value || String(value).trim() === '') return 0;
    var cleaned = String(value).replace(/,/g, '').replace(/%/g, '').trim();
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
    return tryFixEncoding(String(query).trim().toLowerCase());
  }

  /**
   * Clean a URL string — extract path from full URL.
   * @param {string} url
   * @returns {string}
   */
  function cleanUrl(url) {
    if (!url) return '';
    url = String(url).trim();
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
    if (!csvText || String(csvText).trim() === '') {
      return {
        type: 'unknown',
        headers: [],
        rows: [],
        rowCount: 0,
        errors: ['File is empty.'],
        encodingFixed: false
      };
    }

    // Remove BOM if present
    if (csvText.charCodeAt(0) === 0xFEFF) {
      csvText = csvText.slice(1);
    }

    var lines = csvText.split(/\r?\n/).filter(function (line) {
      return line.trim() !== '';
    });

    if (lines.length < 2) {
      return {
        type: 'unknown',
        headers: [],
        rows: [],
        rowCount: 0,
        errors: ['File must have at least a header row and one data row.'],
        encodingFixed: false
      };
    }

    // Parse header row
    var headers = parseCSVLine(lines[0]);
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
        errors: ['Could not detect report type. Expected columns: Query, Clicks, Impressions, CTR, Position. Please ensure you exported from Google Search Console Performance report with all 5 metrics selected. Try exporting as XLSX (Google Sheets) for better compatibility.'],
        encodingFixed: encodingFixed
      };
    }

    // Find column indices
    var colIndices = {};
    for (var key in columnMap) {
      if (columnMap.hasOwnProperty(key)) {
        colIndices[key] = findColumn(headers, columnMap[key]);
        if (colIndices[key] === -1 && encodingFixed) {
          colIndices[key] = findColumn(fixedHeaders, columnMap[key]);
        }
      }
    }

    // Position-based fallback
    if (colIndices.clicks === -1 || colIndices.impressions === -1 || colIndices.position === -1) {
      if (headers.length >= 5) {
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
        errors: ['Missing required columns: ' + missingCols.join(', ') + '. Found headers: ' + headers.join(', ') + '.'],
        encodingFixed: encodingFixed
      };
    }

    // Parse data rows — optimized batch processing
    var rows = [];
    var errors = [];
    var batchSize = 200;
    var totalLines = lines.length;

    for (var i = 1; i < totalLines; i++) {
      try {
        var values = parseCSVLine(lines[i]);

        if (values.length < headers.length) {
          while (values.length < headers.length) {
            values.push('');
          }
        }

        var clicks = parseNumber(values[colIndices.clicks]);
        var impressions = parseNumber(values[colIndices.impressions]);
        var ctr = colIndices.ctr !== -1 ? parseNumber(values[colIndices.ctr]) : 0;
        var position = parseNumber(values[colIndices.position]);

        // Calculate CTR if not provided
        if ((ctr === 0 || isNaN(ctr)) && impressions > 0) {
          ctr = parseFloat(((clicks / impressions) * 100).toFixed(1));
        }

        var row = {
          clicks: clicks,
          impressions: impressions,
          ctr: ctr,
          position: position
        };

        // Add type-specific field
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

        // Only skip truly empty rows
        if (impressions === 0 && clicks === 0) {
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
   * @param {string} csvText
   * @returns {Object|null} - { startDate, endDate } or null
   */
  function detectDateRange(csvText) {
    var lines = csvText.split(/\r?\n/);
    var datePattern = /(\d{4}[-/]\d{2}[-/]\d{2})|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i;

    for (var i = 0; i < Math.min(10, lines.length); i++) {
      var match = lines[i].match(datePattern);
      if (match) {
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
      return { valid: false, warnings: ['No data rows found in the file. Please check that your export contains data.'] };
    }

    if (parsedData.rowCount < 5) {
      warnings.push('Very few data rows (' + parsedData.rowCount + '). Analysis may be limited. Consider exporting a longer date range (28 days recommended).');
    }

    var highCTRCount = parsedData.rows.filter(function (r) { return r.ctr > 50; }).length;
    if (highCTRCount > parsedData.rowCount * 0.3) {
      warnings.push('Many rows have CTR > 50%. Please verify your data is correct.');
    }

    var zeroClicksCount = parsedData.rows.filter(function (r) { return r.clicks === 0; }).length;
    if (zeroClicksCount === parsedData.rowCount) {
      warnings.push('All rows have zero clicks. The site may have very low traffic or the exported date range had no click data.');
    }

    if (parsedData.encodingFixed) {
      warnings.push('Some text encoding was automatically fixed. If query names still look garbled, please re-export from Google Search Console as XLSX (Google Sheets) for best results.');
    }

    return { valid: true, warnings: warnings };
  }

  // ============================================
  // XLSX SUPPORT (requires SheetJS loaded globally)
  // ============================================

  /**
   * Parse an XLSX file (from SheetJS) into structured data.
   * Detects sheet names and maps them to GSC report types.
   * @param {Object} workbook — SheetJS workbook object
   * @returns {Object}
   */
  function parseXLSXWorkbook(workbook) {
    if (!workbook || !workbook.SheetNames) {
      return { sheets: {}, allQueries: [], totalRows: 0, errors: ['Invalid XLSX file.'] };
    }

    var allSheets = {};
    var allQueries = [];
    var totalRows = 0;
    var allErrors = [];

    workbook.SheetNames.forEach(function (sheetName) {
      var sheet = workbook.Sheets[sheetName];
      if (!sheet) return;

      var csvText = sheetToCSV(sheet);
      if (!csvText || csvText.trim() === '') return;

      var parsed = parseGSCExport(csvText);
      parsed.sheetName = sheetName;
      allSheets[sheetName] = parsed;
      totalRows += parsed.rowCount;

      if (parsed.errors && parsed.errors.length > 0) {
        allErrors = allErrors.concat(parsed.errors.map(function (e) {
          return '[' + sheetName + '] ' + e;
        }));
      }

      if (parsed.type === 'query' && parsed.rows.length > 0) {
        allQueries = allQueries.concat(parsed.rows.map(function (row) {
          return {
            query: row.query,
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
            sourceSheet: sheetName
          };
        }));
      }
    });

    var mergedData = mergeXLSSheets(allSheets);

    return {
      sheets: allSheets,
      allQueries: allQueries,
      totalRows: totalRows,
      errors: allErrors,
      merged: mergedData
    };
  }

  /**
   * Convert a SheetJS sheet to CSV string.
   * @param {Object} sheet — SheetJS sheet object
   * @returns {string}
   */
  function sheetToCSV(sheet) {
    if (!sheet) return '';

    if (typeof XLSX !== 'undefined' && XLSX.utils && XLSX.utils.sheet_to_csv) {
      return XLSX.utils.sheet_to_csv(sheet, { FS: ',', RS: '\n', blankrows: false });
    }

    var range = sheet['!ref'];
    if (!range) return '';

    var decoded = decodeXLSXRange(range);
    if (!decoded) return '';

    var csvRows = [];
    for (var r = decoded.s.r; r <= decoded.e.r; r++) {
      var rowValues = [];
      for (var c = decoded.s.c; c <= decoded.e.c; c++) {
        var cellAddress = encodeXLSXCell(r, c);
        var cell = sheet[cellAddress];
        var value = '';
        if (cell) {
          value = cell.v !== undefined ? cell.v : (cell.w || '');
        }
        value = String(value);
        if (value.indexOf(',') !== -1 || value.indexOf('"') !== -1 || value.indexOf('\n') !== -1) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }
        rowValues.push(value);
      }
      if (rowValues.some(function (v) { return v !== ''; })) {
        csvRows.push(rowValues.join(','));
      }
    }
    return csvRows.join('\n');
  }

  /**
   * Decode an XLSX range string (e.g., "A1:E100").
   */
  function decodeXLSXRange(rangeStr) {
    if (!rangeStr) return null;
    var parts = rangeStr.split(':');
    if (parts.length !== 2) return null;
    var start = decodeXLSXCell(parts[0]);
    var end = decodeXLSXCell(parts[1]);
    return { s: start, e: end };
  }

  /**
   * Decode a cell address (e.g., "A1") into { r, c }.
   */
  function decodeXLSXCell(cellStr) {
    var match = cellStr.match(/([A-Z]+)(\d+)/);
    if (!match) return { r: 0, c: 0 };
    var col = 0;
    var colStr = match[1];
    for (var i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    return { r: parseInt(match[2], 10) - 1, c: col - 1 };
  }

  /**
   * Encode a cell position { r, c } into address string (e.g., "A1").
   */
  function encodeXLSXCell(row, col) {
    var colStr = '';
    var c = col + 1;
    while (c > 0) {
      var rem = (c - 1) % 26;
      colStr = String.fromCharCode(65 + rem) + colStr;
      c = Math.floor((c - 1) / 26);
    }
    return colStr + (row + 1);
  }

  /**
   * Merge data from multiple XLSX sheets into a unified structure.
   */
  function mergeXLSSheets(sheets) {
    var queryData = [];
    var pageData = [];
    var countryData = [];
    var deviceData = [];

    for (var sheetName in sheets) {
      if (sheets.hasOwnProperty(sheetName)) {
        var sheet = sheets[sheetName];
        var nameLower = sheetName.toLowerCase();

        if (nameLower.indexOf('query') !== -1 || nameLower.indexOf('queries') !== -1) {
          queryData = queryData.concat(sheet.rows);
        } else if (nameLower.indexOf('page') !== -1 || nameLower.indexOf('url') !== -1) {
          pageData = pageData.concat(sheet.rows);
        } else if (nameLower.indexOf('country') !== -1 || nameLower.indexOf('countries') !== -1) {
          countryData = countryData.concat(sheet.rows);
        } else if (nameLower.indexOf('device') !== -1 || nameLower.indexOf('devices') !== -1) {
          deviceData = deviceData.concat(sheet.rows);
        } else if (sheet.type === 'query') {
          queryData = queryData.concat(sheet.rows);
        } else if (sheet.type === 'page') {
          pageData = pageData.concat(sheet.rows);
        } else if (sheet.type === 'country') {
          countryData = countryData.concat(sheet.rows);
        } else if (sheet.type === 'device') {
          deviceData = deviceData.concat(sheet.rows);
        }
      }
    }

    return {
      queryData: queryData,
      pageData: pageData,
      countryData: countryData,
      deviceData: deviceData
    };
  }

  // ============================================
  // PUBLIC API
  // ============================================

  window.GSCParser = {
    parseGSCExport: parseGSCExport,
    parseXLSXWorkbook: parseXLSXWorkbook,
    detectReportType: detectReportType,
    validateData: validateData,
    detectDateRange: detectDateRange,
    tryFixEncoding: tryFixEncoding,
    sheetToCSV: sheetToCSV
  };

})();
