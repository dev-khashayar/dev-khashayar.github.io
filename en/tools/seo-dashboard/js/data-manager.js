/**
 * SEO Dashboard — Data Manager
 * 
 * Handles all data persistence using IndexedDB.
 * Stores: GSC data, analysis results, user preferences, OAuth tokens.
 * All data stays in the browser — nothing is sent to any server.
 * 
 * @version 1.0.0
 * @date 2026-06
 */

(function () {
  'use strict';

  const DB_NAME = 'seo-dashboard-db';
  const DB_VERSION = 1;

  /**
   * Stores configuration
   */
  const STORES = {
    RAW_DATA: 'rawData',
    ANALYSIS_RESULTS: 'analysisResults',
    USER_PREFS: 'userPrefs',
    OAUTH_TOKENS: 'oauthTokens'
  };

  let db = null;

  /**
   * Open (or create) the IndexedDB database.
   * @returns {Promise<IDBDatabase>}
   */
  function openDB() {
    return new Promise(function (resolve, reject) {
      if (db) {
        resolve(db);
        return;
      }

      var request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function (e) {
        var database = e.target.result;

        // Raw GSC data store
        if (!database.objectStoreNames.contains(STORES.RAW_DATA)) {
          var rawStore = database.createObjectStore(STORES.RAW_DATA, { keyPath: 'id', autoIncrement: true });
          rawStore.createIndex('type', 'type', { unique: false });
          rawStore.createIndex('dateImported', 'dateImported', { unique: false });
          rawStore.createIndex('periodStart', 'periodStart', { unique: false });
        }

        // Analysis results store
        if (!database.objectStoreNames.contains(STORES.ANALYSIS_RESULTS)) {
          var analysisStore = database.createObjectStore(STORES.ANALYSIS_RESULTS, { keyPath: 'id' });
          analysisStore.createIndex('type', 'type', { unique: false });
          analysisStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // User preferences store
        if (!database.objectStoreNames.contains(STORES.USER_PREFS)) {
          database.createObjectStore(STORES.USER_PREFS, { keyPath: 'key' });
        }

        // OAuth tokens store
        if (!database.objectStoreNames.contains(STORES.OAUTH_TOKENS)) {
          database.createObjectStore(STORES.OAUTH_TOKENS, { keyPath: 'provider' });
        }
      };

      request.onsuccess = function (e) {
        db = e.target.result;
        resolve(db);
      };

      request.onerror = function (e) {
        console.error('IndexedDB open error:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  /**
   * Get a transaction for a specific store.
   * @param {string} storeName
   * @param {string} mode - 'readonly' or 'readwrite'
   * @returns {Promise<IDBObjectStore>}
   */
  function getStore(storeName, mode) {
    return openDB().then(function (database) {
      var transaction = database.transaction(storeName, mode);
      return transaction.objectStore(storeName);
    });
  }

  /**
   * Perform a generic operation on a store.
   * @param {string} storeName
   * @param {string} mode
   * @param {Function} callback - receives the store and returns a request
   * @returns {Promise}
   */
  function operateOnStore(storeName, mode, callback) {
    return new Promise(function (resolve, reject) {
      getStore(storeName, mode).then(function (store) {
        var request = callback(store);
        request.onsuccess = function (e) {
          resolve(e.target.result);
        };
        request.onerror = function (e) {
          console.error('IndexedDB operation error:', e.target.error);
          reject(e.target.error);
        };
      }).catch(reject);
    });
  }

  // ============================================
  // RAW DATA OPERATIONS
  // ============================================

  /**
   * Save raw GSC data to IndexedDB.
   * @param {Object} data - { type: 'gsc_query'|'gsc_page'|'gsc_country'|'gsc_device', rows: [], periodStart, periodEnd, dateImported }
   * @returns {Promise<number>} - The ID of the saved record
   */
  function saveRawData(data) {
    return operateOnStore(STORES.RAW_DATA, 'readwrite', function (store) {
      return store.add({
        type: data.type,
        rows: data.rows,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        dateImported: data.dateImported || new Date().toISOString(),
        source: data.source || 'csv',
        propertyUrl: data.propertyUrl || null
      });
    });
  }

  /**
   * Get all raw data of a specific type.
   * @param {string} type - 'gsc_query', 'gsc_page', etc.
   * @returns {Promise<Array>}
   */
  function getRawDataByType(type) {
    return operateOnStore(STORES.RAW_DATA, 'readonly', function (store) {
      var index = store.index('type');
      return index.getAll(type);
    });
  }

  /**
   * Get all raw data (all types).
   * @returns {Promise<Array>}
   */
  function getAllRawData() {
    return operateOnStore(STORES.RAW_DATA, 'readonly', function (store) {
      return store.getAll();
    });
  }

  /**
   * Get the most recent raw data of a specific type.
   * @param {string} type
   * @returns {Promise<Object|null>}
   */
  function getLatestRawData(type) {
    return operateOnStore(STORES.RAW_DATA, 'readonly', function (store) {
      var index = store.index('type');
      return index.getAll(type);
    }).then(function (results) {
      if (!results || results.length === 0) return null;
      // Sort by dateImported descending and return the latest
      results.sort(function (a, b) {
        return new Date(b.dateImported) - new Date(a.dateImported);
      });
      return results[0];
    });
  }

  /**
   * Delete raw data by ID.
   * @param {number} id
   * @returns {Promise}
   */
  function deleteRawData(id) {
    return operateOnStore(STORES.RAW_DATA, 'readwrite', function (store) {
      return store.delete(id);
    });
  }

  /**
   * Clear all raw data.
   * @returns {Promise}
   */
  function clearAllRawData() {
    return operateOnStore(STORES.RAW_DATA, 'readwrite', function (store) {
      return store.clear();
    });
  }

  // ============================================
  // ANALYSIS RESULTS OPERATIONS
  // ============================================

  /**
   * Save analysis results.
   * @param {string} id - Unique identifier for this analysis (e.g., 'ctr-health', 'opportunities')
   * @param {Object} data - The analysis result data
   * @returns {Promise}
   */
  function saveAnalysisResult(id, data) {
    return operateOnStore(STORES.ANALYSIS_RESULTS, 'readwrite', function (store) {
      return store.put({
        id: id,
        data: data,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Get a specific analysis result.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  function getAnalysisResult(id) {
    return operateOnStore(STORES.ANALYSIS_RESULTS, 'readonly', function (store) {
      return store.get(id);
    }).then(function (result) {
      return result ? result.data : null;
    });
  }

  /**
   * Get all analysis results.
   * @returns {Promise<Array>}
   */
  function getAllAnalysisResults() {
    return operateOnStore(STORES.ANALYSIS_RESULTS, 'readonly', function (store) {
      return store.getAll();
    });
  }

  /**
   * Clear all analysis results.
   * @returns {Promise}
   */
  function clearAllAnalysisResults() {
    return operateOnStore(STORES.ANALYSIS_RESULTS, 'readwrite', function (store) {
      return store.clear();
    });
  }

  // ============================================
  // USER PREFERENCES OPERATIONS
  // ============================================

  /**
   * Save a user preference.
   * @param {string} key
   * @param {*} value
   * @returns {Promise}
   */
  function savePreference(key, value) {
    return operateOnStore(STORES.USER_PREFS, 'readwrite', function (store) {
      return store.put({ key: key, value: value });
    });
  }

  /**
   * Get a user preference.
   * @param {string} key
   * @param {*} defaultValue
   * @returns {Promise<*>}
   */
  function getPreference(key, defaultValue) {
    return operateOnStore(STORES.USER_PREFS, 'readonly', function (store) {
      return store.get(key);
    }).then(function (result) {
      return result ? result.value : defaultValue;
    }).catch(function () {
      return defaultValue;
    });
  }

  // ============================================
  // OAUTH TOKEN OPERATIONS
  // ============================================

  /**
   * Save an OAuth token.
   * @param {string} provider - 'google'
   * @param {Object} tokenData - { access_token, refresh_token, expiry_date, scope }
   * @returns {Promise}
   */
  function saveOAuthToken(provider, tokenData) {
    return operateOnStore(STORES.OAUTH_TOKENS, 'readwrite', function (store) {
      return store.put({
        provider: provider,
        tokenData: tokenData,
        savedAt: new Date().toISOString()
      });
    });
  }

  /**
   * Get an OAuth token.
   * @param {string} provider
   * @returns {Promise<Object|null>}
   */
  function getOAuthToken(provider) {
    return operateOnStore(STORES.OAUTH_TOKENS, 'readonly', function (store) {
      return store.get(provider);
    }).then(function (result) {
      if (!result) return null;
      // Check if token is expired
      if (result.tokenData.expiry_date && result.tokenData.expiry_date < Date.now()) {
        return { ...result, expired: true };
      }
      return { ...result, expired: false };
    });
  }

  /**
   * Delete an OAuth token.
   * @param {string} provider
   * @returns {Promise}
   */
  function deleteOAuthToken(provider) {
    return operateOnStore(STORES.OAUTH_TOKENS, 'readwrite', function (store) {
      return store.delete(provider);
    });
  }

  // ============================================
  // UTILITY
  // ============================================

  /**
   * Get the total size of data stored in IndexedDB (approximate).
   * @returns {Promise<number>} - Size in bytes
   */
  function getStorageSize() {
    return getAllRawData().then(function (rawData) {
      return getAllAnalysisResults().then(function (analysisData) {
        var totalItems = (rawData ? rawData.length : 0) + (analysisData ? analysisData.length : 0);
        var estimatedSize = JSON.stringify(rawData).length + JSON.stringify(analysisData).length;
        return {
          items: totalItems,
          estimatedSizeBytes: estimatedSize,
          estimatedSizeMB: (estimatedSize / (1024 * 1024)).toFixed(2)
        };
      });
    });
  }

  /**
   * Clear all data in the database.
   * @returns {Promise}
   */
  function clearAllData() {
    return Promise.all([
      clearAllRawData(),
      clearAllAnalysisResults()
    ]);
  }

  // ============================================
  // PUBLIC API
  // ============================================

  window.SEODashboardData = {
    // Raw Data
    saveRawData: saveRawData,
    getRawDataByType: getRawDataByType,
    getAllRawData: getAllRawData,
    getLatestRawData: getLatestRawData,
    deleteRawData: deleteRawData,
    clearAllRawData: clearAllRawData,

    // Analysis Results
    saveAnalysisResult: saveAnalysisResult,
    getAnalysisResult: getAnalysisResult,
    getAllAnalysisResults: getAllAnalysisResults,
    clearAllAnalysisResults: clearAllAnalysisResults,

    // User Preferences
    savePreference: savePreference,
    getPreference: getPreference,

    // OAuth
    saveOAuthToken: saveOAuthToken,
    getOAuthToken: getOAuthToken,
    deleteOAuthToken: deleteOAuthToken,

    // Utility
    getStorageSize: getStorageSize,
    clearAllData: clearAllData,
    openDB: openDB,
    STORES: STORES
  };

})();
