/**
 * PromptHub — Home Page Logic
 * 
 * Handles: rendering prompt cards, search, filter, featured section,
 * and all client-side interactivity for the home page.
 * Supports both English and Persian via data attribute on <html>.
 * 
 * @version 2.0.0
 */

(function () {
  'use strict';

  // --- Detect language from HTML lang attribute ---
  var htmlEl = document.documentElement;
  var lang = htmlEl.getAttribute('lang') || 'en';
  var isRTL = htmlEl.getAttribute('dir') === 'rtl';

  // --- Select correct data source ---
  var PROMPTS_DATA = (lang === 'fa' && typeof PROMPTS_DATA_FA !== 'undefined')
    ? PROMPTS_DATA_FA
    : (typeof PROMPTS_DATA_EN !== 'undefined' ? PROMPTS_DATA_EN : []);

  // --- DOM References ---
  var featuredContainer = document.getElementById('featured-container');
  var promptsContainer = document.getElementById('prompts-container');
  var resultsCount = document.getElementById('results-count');
  var noResults = document.getElementById('no-results');
  var searchInput = document.getElementById('search-input');

  // --- State ---
  var activeFilters = {
    category: 'all',
    type: 'all',
    difficulty: 'all',
    search: ''
  };

  // --- Helper Functions ---

  /**
   * Capitalize first letter of a string.
   * @param {string} str
   * @returns {string}
   */
  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Format prompt type for display.
   * @param {string} type
   * @returns {string}
   */
  function formatType(type) {
    var typeMapEN = {
      'meta': 'Meta',
      'multi-step': 'Multi-Step',
      'single': 'Single',
      'role': 'Role',
      'template': 'Template',
      'workflow': 'Workflow',
      'pack': 'Pack'
    };
    var typeMapFA = {
      'meta': 'متا',
      'multi-step': 'چندمرحله‌ای',
      'single': 'تکی',
      'role': 'نقش',
      'template': 'تمپلیت',
      'workflow': 'فرآیند',
      'pack': 'پک'
    };
    var typeMap = (lang === 'fa') ? typeMapFA : typeMapEN;
    return typeMap[type] || capitalize(type);
  }

  /**
   * Format difficulty for display.
   * @param {string} difficulty
   * @returns {string}
   */
  function formatDifficulty(difficulty) {
    var diffMapEN = {
      'beginner': 'Beginner',
      'intermediate': 'Intermediate',
      'advanced': 'Advanced'
    };
    var diffMapFA = {
      'beginner': 'مبتدی',
      'intermediate': 'متوسط',
      'advanced': 'حرفه‌ای'
    };
    var diffMap = (lang === 'fa') ? diffMapFA : diffMapEN;
    return diffMap[difficulty] || capitalize(difficulty);
  }

  /**
   * Format category for display.
   * @param {string} category
   * @returns {string}
   */
  function formatCategory(category) {
    var catMapEN = {
      'strategy': 'Strategy',
      'seo': 'SEO',
      'marketing': 'Marketing',
      'automation': 'Automation',
      'ai': 'AI',
      'productivity': 'Productivity',
      'research': 'Research'
    };
    var catMapFA = {
      'strategy': 'استراتژی',
      'seo': 'سئو',
      'marketing': 'بازاریابی',
      'automation': 'اتوماسیون',
      'ai': 'هوش مصنوعی',
      'productivity': 'بهره‌وری',
      'research': 'تحقیق'
    };
    var catMap = (lang === 'fa') ? catMapFA : catMapEN;
    return catMap[category] || capitalize(category);
  }

  /**
   * Get card meta text based on prompt type.
   * @param {Object} prompt
   * @returns {string}
   */
  function getCardMeta(prompt) {
    var modesLabel = (lang === 'fa') ? 'حالت' : 'Modes';
    var stepsLabel = (lang === 'fa') ? 'مرحله' : 'Steps';
    var promptsLabel = (lang === 'fa') ? 'پرامپت' : 'Prompts';
    var promptLabel = (lang === 'fa') ? 'پرامپت' : 'Prompt';
    var templateLabel = (lang === 'fa') ? 'تمپلیت' : 'Template';

    if (prompt.type === 'meta' && prompt.modesCount) {
      return prompt.modesCount + ' ' + modesLabel + ' · ' + prompt.totalSetupTime;
    }
    if ((prompt.type === 'multi-step' || prompt.type === 'workflow') && prompt.stepsCount) {
      return prompt.stepsCount + ' ' + stepsLabel + ' · ' + prompt.totalSetupTime;
    }
    if (prompt.type === 'pack' && prompt.promptBlocks) {
      return prompt.promptBlocks.length + ' ' + promptsLabel + ' · ' + prompt.totalSetupTime;
    }
    if (prompt.type === 'single' || prompt.type === 'role') {
      return '1 ' + promptLabel + ' · ' + prompt.totalSetupTime;
    }
    if (prompt.type === 'template') {
      return '1 ' + templateLabel + ' · ' + prompt.totalSetupTime;
    }
    return prompt.totalSetupTime || '';
  }

  /**
   * Build URL for a prompt detail page.
   * Uses the /{lang}/{category}/{slug}/ structure.
   * @param {Object} prompt
   * @returns {string}
   */
  function buildPromptUrl(prompt) {
    return '/' + lang + '/' + prompt.category + '/' + prompt.slug + '/';
  }

  /**
   * Create a single prompt card element.
   * @param {Object} prompt
   * @param {boolean} isFeatured
   * @returns {HTMLElement}
   */
  function createPromptCard(prompt, isFeatured) {
    var card = document.createElement('a');
    card.href = buildPromptUrl(prompt);
    card.className = 'prompt-card';
    if (isFeatured) {
      card.className += ' prompt-card--featured';
    }

    // Badges
    var badgesDiv = document.createElement('div');
    badgesDiv.className = 'prompt-card__badges badge-group';

    var categoryBadge = document.createElement('span');
    categoryBadge.className = 'badge badge--category ' + prompt.category;
    categoryBadge.textContent = formatCategory(prompt.category);
    badgesDiv.appendChild(categoryBadge);

    var typeBadge = document.createElement('span');
    typeBadge.className = 'badge badge--type';
    typeBadge.textContent = formatType(prompt.type);
    badgesDiv.appendChild(typeBadge);

    var difficultyBadge = document.createElement('span');
    difficultyBadge.className = 'badge badge--difficulty ' + prompt.difficulty;
    difficultyBadge.textContent = formatDifficulty(prompt.difficulty);
    badgesDiv.appendChild(difficultyBadge);

    // Title
    var titleEl = document.createElement('h3');
    titleEl.className = 'prompt-card__title';
    titleEl.textContent = prompt.title;

    // Description
    var descEl = document.createElement('p');
    descEl.className = 'prompt-card__description';
    descEl.textContent = prompt.shortDescription;

    // Meta
    var metaDiv = document.createElement('div');
    metaDiv.className = 'prompt-card__meta';
    var metaText = getCardMeta(prompt);
    if (metaText) {
      var metaItem = document.createElement('span');
      metaItem.className = 'prompt-card__meta-item';
      metaItem.textContent = '📊 ' + metaText;
      metaDiv.appendChild(metaItem);
    }

    // View link text
    var viewText = document.createElement('span');
    viewText.style.cssText = 'margin-' + (isRTL ? 'right' : 'left') + ': auto; color: var(--color-accent-primary); font-weight: var(--font-weight-medium);';
    viewText.textContent = (lang === 'fa') ? 'مشاهده پرامپت ←' : 'View Prompt →';
    metaDiv.appendChild(viewText);

    // Assemble
    card.appendChild(badgesDiv);
    card.appendChild(titleEl);
    card.appendChild(descEl);
    card.appendChild(metaDiv);

    return card;
  }

  /**
   * Check if a prompt matches active filters.
   * @param {Object} prompt
   * @returns {boolean}
   */
  function promptMatchesFilters(prompt) {
    if (activeFilters.category !== 'all' && prompt.category !== activeFilters.category) {
      return false;
    }
    if (activeFilters.type !== 'all' && prompt.type !== activeFilters.type) {
      return false;
    }
    if (activeFilters.difficulty !== 'all' && prompt.difficulty !== activeFilters.difficulty) {
      return false;
    }
    if (activeFilters.search) {
      var searchLower = activeFilters.search.toLowerCase();
      var searchableText = [
        prompt.title,
        prompt.shortDescription,
        prompt.category,
        prompt.type,
        prompt.difficulty,
        (prompt.tags || []).join(' ')
      ].join(' ').toLowerCase();
      if (searchableText.indexOf(searchLower) === -1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Render all prompt cards based on current filters.
   */
  function renderPrompts() {
    if (promptsContainer) {
      promptsContainer.innerHTML = '';
    }
    if (featuredContainer) {
      featuredContainer.innerHTML = '';
    }

    var filteredPrompts = PROMPTS_DATA.filter(promptMatchesFilters);
    var featuredPrompts = filteredPrompts.filter(function (p) { return p.featured; });
    var nonFeaturedPrompts = filteredPrompts.filter(function (p) { return !p.featured; });

    if (featuredContainer && featuredPrompts.length > 0) {
      featuredPrompts.forEach(function (prompt) {
        featuredContainer.appendChild(createPromptCard(prompt, true));
      });
    } else if (featuredContainer) {
      var featuredSection = document.getElementById('featured-section');
      if (featuredSection) {
        featuredSection.style.display = 'none';
      }
    }

    if (promptsContainer) {
      nonFeaturedPrompts.forEach(function (prompt) {
        promptsContainer.appendChild(createPromptCard(prompt, false));
      });
    }

    if (resultsCount) {
      var count = filteredPrompts.length;
      if (lang === 'fa') {
        if (count === 0) {
          resultsCount.textContent = 'هیچ پرامپتی یافت نشد';
        } else {
          resultsCount.textContent = count + ' پرامپت یافت شد';
        }
      } else {
        if (count === 0) {
          resultsCount.textContent = 'No prompts found';
        } else if (count === 1) {
          resultsCount.textContent = '1 prompt found';
        } else {
          resultsCount.textContent = count + ' prompts found';
        }
      }
    }

    if (noResults) {
      noResults.style.display = filteredPrompts.length === 0 ? 'block' : 'none';
    }

    if (filteredPrompts.length > 0) {
      var featuredSection = document.getElementById('featured-section');
      if (featuredSection && featuredContainer && featuredContainer.children.length > 0) {
        featuredSection.style.display = '';
      }
    }
  }

  /**
   * Update active filters and re-render.
   * @param {string} filterType
   * @param {string} value
   */
  function setFilter(filterType, value) {
    activeFilters[filterType] = value;
    renderPrompts();
  }

  // --- Event Listeners ---

  var searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        activeFilters.search = searchInput.value.trim();
        renderPrompts();
      }, 200);
    });
  }

  function handleFilterClick(filterType) {
    var containerId = filterType + '-filters';
    var container = document.getElementById(containerId);
    if (!container) return;

    container.addEventListener('click', function (e) {
      var chip = e.target.closest('.filter-chip');
      if (!chip) return;

      var chips = container.querySelectorAll('.filter-chip');
      chips.forEach(function (c) {
        c.classList.remove('active');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-pressed', 'true');

      var filterValue = chip.getAttribute('data-filter');
      setFilter(filterType, filterValue);
    });
  }

  handleFilterClick('category');
  handleFilterClick('type');
  handleFilterClick('difficulty');

  // --- Initial Render ---
  renderPrompts();

})();
