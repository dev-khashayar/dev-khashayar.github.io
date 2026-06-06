/**
 * SEO Dashboard — Table Builder
 * 
 * Creates interactive, sortable, paginated data tables.
 * Pure JavaScript — no library dependencies.
 * 
 * @version 1.0.0
 * @date 2026-06
 */

(function () {
  'use strict';

  /**
   * Configuration for a data table.
   * @typedef {Object} TableConfig
   * @property {string} containerId — ID of the container element
   * @property {Array} columns — [{ key, label, sortable, render }]
   * @property {Array} data — Array of row objects
   * @property {number} pageSize — Default rows per page (10, 25, 50, 100)
   * @property {boolean} searchable — Show search input
   * @property {string} emptyMessage — Message when no data
   */

  /**
   * Build a complete data table inside the container.
   * @param {TableConfig} config
   */
  function buildTable(config) {
    var container = document.getElementById(config.containerId);
    if (!container) return;

    var state = {
      data: config.data || [],
      columns: config.columns || [],
      pageSize: config.pageSize || 25,
      currentPage: 1,
      sortColumn: null,
      sortDirection: 'desc',
      searchQuery: '',
      searchable: config.searchable !== false,
      emptyMessage: config.emptyMessage || 'No data available.'
    };

    // Clear container
    container.innerHTML = '';

    // Build table structure
    var wrapper = document.createElement('div');
    wrapper.className = 'data-table-wrapper';

    // Controls: Search + Page Size
    if (state.searchable || true) {
      var controls = document.createElement('div');
      controls.className = 'data-table-controls';

      // Search input
      if (state.searchable) {
        var searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.className = 'data-table-search';
        searchInput.placeholder = 'Search...';
        searchInput.addEventListener('input', function () {
          state.searchQuery = this.value.toLowerCase();
          state.currentPage = 1;
          renderTableBody(wrapper, state);
          renderPagination(wrapper, state);
        });
        controls.appendChild(searchInput);
      }

      // Page size selector
      var pageSizeDiv = document.createElement('div');
      pageSizeDiv.className = 'data-table-page-size';
      var pageSizeLabel = document.createElement('span');
      pageSizeLabel.textContent = 'Show:';
      pageSizeDiv.appendChild(pageSizeLabel);

      var pageSizeSelect = document.createElement('select');
      [10, 25, 50, 100].forEach(function (size) {
        var option = document.createElement('option');
        option.value = size;
        option.textContent = size;
        if (size === state.pageSize) option.selected = true;
        pageSizeSelect.appendChild(option);
      });
      pageSizeSelect.addEventListener('change', function () {
        state.pageSize = parseInt(this.value, 10);
        state.currentPage = 1;
        renderTableBody(wrapper, state);
        renderPagination(wrapper, state);
      });
      pageSizeDiv.appendChild(pageSizeSelect);
      controls.appendChild(pageSizeDiv);

      wrapper.appendChild(controls);
    }

    // Scrollable table area
    var scrollDiv = document.createElement('div');
    scrollDiv.className = 'data-table-scroll';

    var table = document.createElement('table');
    table.className = 'data-table';

    // Header
    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');

    state.columns.forEach(function (col) {
      var th = document.createElement('th');
      th.textContent = col.label || col.key;
      th.setAttribute('data-column', col.key);

      if (col.sortable !== false) {
        th.style.cursor = 'pointer';
        th.addEventListener('click', function () {
          handleSort(state, col.key);
          renderTableBody(wrapper, state);
          updateSortIndicators(wrapper, state);
        });
      }

      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    var tbody = document.createElement('tbody');
    table.appendChild(tbody);
    scrollDiv.appendChild(table);
    wrapper.appendChild(scrollDiv);

    // Pagination
    var paginationDiv = document.createElement('div');
    paginationDiv.className = 'data-table-pagination';
    wrapper.appendChild(paginationDiv);

    container.appendChild(wrapper);

    // Initial render
    renderTableBody(wrapper, state);
    renderPagination(wrapper, state);
  }

  /**
   * Handle column sorting.
   * @param {Object} state
   * @param {string} columnKey
   */
  function handleSort(state, columnKey) {
    if (state.sortColumn === columnKey) {
      // Toggle direction
      state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortColumn = columnKey;
      state.sortDirection = 'desc';
    }

    // Sort data
    state.data.sort(function (a, b) {
      var valA = a[columnKey];
      var valB = b[columnKey];

      // Handle numbers
      if (typeof valA === 'number' && typeof valB === 'number') {
        return state.sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      // Handle strings
      var strA = String(valA || '').toLowerCase();
      var strB = String(valB || '').toLowerCase();

      if (state.sortDirection === 'asc') {
        return strA.localeCompare(strB);
      } else {
        return strB.localeCompare(strA);
      }
    });

    state.currentPage = 1;
  }

  /**
   * Update sort indicators in table header.
   * @param {HTMLElement} wrapper
   * @param {Object} state
   */
  function updateSortIndicators(wrapper, state) {
    var headers = wrapper.querySelectorAll('th');
    headers.forEach(function (th) {
      var col = th.getAttribute('data-column');
      // Remove existing indicators
      var existingIcon = th.querySelector('.sort-icon');
      if (existingIcon) existingIcon.remove();

      th.classList.remove('sorted');

      if (col === state.sortColumn) {
        th.classList.add('sorted');
        var icon = document.createElement('span');
        icon.className = 'sort-icon';
        icon.textContent = state.sortDirection === 'asc' ? ' ▲' : ' ▼';
        th.appendChild(icon);
      }
    });
  }

  /**
   * Render the table body with current page data.
   * @param {HTMLElement} wrapper
   * @param {Object} state
   */
  function renderTableBody(wrapper, state) {
    var tbody = wrapper.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Filter data
    var filteredData = state.data;
    if (state.searchQuery) {
      filteredData = state.data.filter(function (row) {
        return state.columns.some(function (col) {
          var value = row[col.key];
          return String(value || '').toLowerCase().indexOf(state.searchQuery) !== -1;
        });
      });
    }

    // Empty state
    if (filteredData.length === 0) {
      var emptyRow = document.createElement('tr');
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = state.columns.length;
      emptyCell.style.cssText = 'text-align: center; padding: var(--space-2xl); color: var(--color-text-muted);';
      emptyCell.textContent = state.searchQuery ? 'No results match your search.' : state.emptyMessage;
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return;
    }

    // Paginate
    var startIndex = (state.currentPage - 1) * state.pageSize;
    var endIndex = Math.min(startIndex + state.pageSize, filteredData.length);
    var pageData = filteredData.slice(startIndex, endIndex);

    // Render rows
    pageData.forEach(function (row) {
      var tr = document.createElement('tr');
      state.columns.forEach(function (col) {
        var td = document.createElement('td');
        if (col.render) {
          // Custom render function
          var rendered = col.render(row[col.key], row);
          if (typeof rendered === 'string') {
            td.innerHTML = rendered;
          } else if (rendered instanceof HTMLElement) {
            td.appendChild(rendered);
          } else {
            td.textContent = rendered;
          }
        } else {
          td.textContent = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  /**
   * Render pagination controls.
   * @param {HTMLElement} wrapper
   * @param {Object} state
   */
  function renderPagination(wrapper, state) {
    var paginationDiv = wrapper.querySelector('.data-table-pagination');
    if (!paginationDiv) return;

    paginationDiv.innerHTML = '';

    // Apply search filter to get correct total
    var filteredData = state.data;
    if (state.searchQuery) {
      filteredData = state.data.filter(function (row) {
        return state.columns.some(function (col) {
          var value = row[col.key];
          return String(value || '').toLowerCase().indexOf(state.searchQuery) !== -1;
        });
      });
    }

    var totalPages = Math.ceil(filteredData.length / state.pageSize);
    if (totalPages <= 1) return;

    var currentPage = state.currentPage;

    // Previous button
    var prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = '←';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', function () {
      if (currentPage > 1) {
        state.currentPage--;
        renderTableBody(wrapper, state);
        renderPagination(wrapper, state);
      }
    });
    paginationDiv.appendChild(prevBtn);

    // Page buttons
    var startPage = Math.max(1, currentPage - 2);
    var endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      var firstBtn = document.createElement('button');
      firstBtn.className = 'pagination-btn';
      firstBtn.textContent = '1';
      firstBtn.addEventListener('click', function () {
        state.currentPage = 1;
        renderTableBody(wrapper, state);
        renderPagination(wrapper, state);
      });
      paginationDiv.appendChild(firstBtn);

      if (startPage > 2) {
        var dots = document.createElement('span');
        dots.className = 'pagination-info';
        dots.textContent = '...';
        paginationDiv.appendChild(dots);
      }
    }

    for (var i = startPage; i <= endPage; i++) {
      var pageBtn = document.createElement('button');
      pageBtn.className = 'pagination-btn';
      if (i === currentPage) pageBtn.classList.add('active');
      pageBtn.textContent = i;
      (function (pageNum) {
        pageBtn.addEventListener('click', function () {
          state.currentPage = pageNum;
          renderTableBody(wrapper, state);
          renderPagination(wrapper, state);
        });
      })(i);
      paginationDiv.appendChild(pageBtn);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        var dotsEnd = document.createElement('span');
        dotsEnd.className = 'pagination-info';
        dotsEnd.textContent = '...';
        paginationDiv.appendChild(dotsEnd);
      }

      var lastBtn = document.createElement('button');
      lastBtn.className = 'pagination-btn';
      lastBtn.textContent = totalPages;
      lastBtn.addEventListener('click', function () {
        state.currentPage = totalPages;
        renderTableBody(wrapper, state);
        renderPagination(wrapper, state);
      });
      paginationDiv.appendChild(lastBtn);
    }

    // Next button
    var nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = '→';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', function () {
      if (currentPage < totalPages) {
        state.currentPage++;
        renderTableBody(wrapper, state);
        renderPagination(wrapper, state);
      }
    });
    paginationDiv.appendChild(nextBtn);

    // Info text
    var info = document.createElement('span');
    info.className = 'pagination-info';
    var showingStart = (currentPage - 1) * state.pageSize + 1;
    var showingEnd = Math.min(currentPage * state.pageSize, filteredData.length);
    info.textContent = showingStart + '-' + showingEnd + ' of ' + filteredData.length;
    paginationDiv.appendChild(info);
  }

  /**
   * Render a status badge inside a table cell.
   * @param {string} status — 'growing', 'declining', 'stable', 'opportunity', 'at-risk'
   * @param {string} text — Display text
   * @returns {string} — HTML string
   */
  function renderStatusBadge(status, text) {
    var statusMap = {
      'growing': 'td-status--growing',
      'declining': 'td-status--declining',
      'stable': 'td-status--stable',
      'opportunity': 'td-status--opportunity',
      'at-risk': 'td-status--at-risk'
    };
    var className = statusMap[status] || 'td-status--stable';
    var label = text || (status.charAt(0).toUpperCase() + status.slice(1));
    return '<span class="td-status ' + className + '">' + label + '</span>';
  }

  /**
   * Render a severity badge.
   * @param {string} severity — 'high', 'medium', 'low'
   * @returns {string}
   */
  function renderSeverityBadge(severity) {
    return '<span class="severity-badge severity-badge--' + severity + '">' + severity.toUpperCase() + '</span>';
  }

  // ============================================
  // PUBLIC API
  // ============================================

  window.SEOTableBuilder = {
    buildTable: buildTable,
    renderStatusBadge: renderStatusBadge,
    renderSeverityBadge: renderSeverityBadge
  };

})();
