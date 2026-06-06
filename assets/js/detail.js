/**
 * PromptHub — Detail Page Logic
 * 
 * Handles: rendering prompt detail page, expand/collapse blocks,
 * copy buttons, related prompts, and toast notifications.
 * 
 * Expected: A global PROMPTS_DATA array (from prompts-data.js)
 *           and a data-prompt-id attribute on the main element.
 * 
 * @version 1.0.0
 */

(function () {
  'use strict';

  // --- Get prompt ID from DOM ---
  var mainEl = document.querySelector('main[data-prompt-id]');
  if (!mainEl) return;

  var promptId = mainEl.getAttribute('data-prompt-id');
  var prompt = null;

  // Find prompt data
  for (var i = 0; i < PROMPTS_DATA.length; i++) {
    if (PROMPTS_DATA[i].id === promptId) {
      prompt = PROMPTS_DATA[i];
      break;
    }
  }

  if (!prompt) {
    mainEl.innerHTML = '<div class="container" style="padding: var(--space-2xl) 0; text-align: center;"><p style="color: var(--color-error);">Prompt not found.</p><a href="/" class="btn btn--secondary mt-lg">← Back to Home</a></div>';
    return;
  }

  // --- Helper Functions ---

  /**
   * Capitalize first letter.
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
    var typeMap = {
      'meta': 'Meta',
      'multi-step': 'Multi-Step',
      'single': 'Single',
      'role': 'Role',
      'template': 'Template',
      'workflow': 'Workflow',
      'pack': 'Pack'
    };
    return typeMap[type] || capitalize(type);
  }

  /**
   * Get related prompt data by ID.
   * @param {string} id
   * @returns {Object|null}
   */
  function getRelatedPrompt(id) {
    for (var i = 0; i < PROMPTS_DATA.length; i++) {
      if (PROMPTS_DATA[i].id === id) {
        return PROMPTS_DATA[i];
      }
    }
    return null;
  }

  /**
   * Build URL for a prompt detail page.
   * @param {Object} p
   * @returns {string}
   */
  function buildPromptUrl(p) {
    return '/' + p.category + '/' + p.slug + '/';
  }

  /**
   * Show toast notification.
   * @param {string} message
   */
  function showToast(message) {
    var toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(function () {
      toast.classList.remove('visible');
    }, 2000);
  }

  /**
   * Copy text to clipboard.
   * @param {string} text
   * @param {HTMLElement} buttonEl
   */
  function copyToClipboard(text, buttonEl) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        buttonEl.classList.add('copied');
        var originalText = buttonEl.textContent;
        buttonEl.textContent = '✓ Copied!';
        showToast('Copied to clipboard!');
        setTimeout(function () {
          buttonEl.classList.remove('copied');
          buttonEl.textContent = originalText;
        }, 2000);
      }).catch(function () {
        fallbackCopy(text, buttonEl);
      });
    } else {
      fallbackCopy(text, buttonEl);
    }
  }

  /**
   * Fallback copy method using textarea.
   * @param {string} text
   * @param {HTMLElement} buttonEl
   */
  function fallbackCopy(text, buttonEl) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      buttonEl.classList.add('copied');
      var originalText = buttonEl.textContent;
      buttonEl.textContent = '✓ Copied!';
      showToast('Copied to clipboard!');
      setTimeout(function () {
        buttonEl.classList.remove('copied');
        buttonEl.textContent = originalText;
      }, 2000);
    } catch (e) {
      showToast('Failed to copy. Please try again.');
    }
    document.body.removeChild(textarea);
  }

  /**
   * Get block type label (Step, Prompt, or generic Block).
   * @param {number} index
   * @param {number} total
   * @returns {string}
   */
  function getBlockLabel(index, total) {
    if (prompt.type === 'multi-step' || prompt.type === 'workflow') {
      return 'Step ' + (index + 1) + ' of ' + total;
    }
    if (prompt.type === 'pack') {
      return 'Prompt ' + (index + 1) + ' of ' + total;
    }
    if (total > 1) {
      return 'Block ' + (index + 1) + ' of ' + total;
    }
    return 'Prompt';
  }

  // --- Build Page ---

  /**
   * Build the complete detail page.
   */
  function buildDetailPage() {
    var container = document.createElement('div');
    container.className = 'container';

    // Back link
    var backLink = document.createElement('a');
    backLink.href = '/';
    backLink.className = 'back-link';
    backLink.innerHTML = '← Back to All Prompts';
    container.appendChild(backLink);

    // Page Header
    var header = document.createElement('header');
    header.className = 'page-header';

    // Badges
    var badgesDiv = document.createElement('div');
    badgesDiv.className = 'page-header__badges badge-group';

    var catBadge = document.createElement('span');
    catBadge.className = 'badge badge--category ' + prompt.category;
    catBadge.textContent = capitalize(prompt.category);
    badgesDiv.appendChild(catBadge);

    var typeBadge = document.createElement('span');
    typeBadge.className = 'badge badge--type';
    typeBadge.textContent = formatType(prompt.type);
    badgesDiv.appendChild(typeBadge);

    var diffBadge = document.createElement('span');
    diffBadge.className = 'badge badge--difficulty ' + prompt.difficulty;
    diffBadge.textContent = capitalize(prompt.difficulty);
    badgesDiv.appendChild(diffBadge);

    header.appendChild(badgesDiv);

    // Title
    var titleEl = document.createElement('h1');
    titleEl.className = 'page-header__title';
    titleEl.textContent = prompt.title;
    header.appendChild(titleEl);

    // Description
    var descEl = document.createElement('p');
    descEl.className = 'page-header__description';
    descEl.textContent = prompt.fullDescription;
    header.appendChild(descEl);

    container.appendChild(header);

    // Who Is This For Section
    if (prompt.whoIsThisFor && prompt.whoIsThisFor.length > 0) {
      var whoSection = document.createElement('section');
      whoSection.className = 'section';

      var whoTitle = document.createElement('h2');
      whoTitle.className = 'section__title';
      whoTitle.innerHTML = '<span class="section__title-icon">👤</span> Who Is This For?';
      whoSection.appendChild(whoTitle);

      var whoList = document.createElement('div');
      whoList.className = 'who-for-list';

      prompt.whoIsThisFor.forEach(function (person) {
        var item = document.createElement('div');
        item.className = 'who-for-list__item';
        item.innerHTML = '<span class="who-for-list__check">✓</span> ' + person;
        whoList.appendChild(item);
      });

      whoSection.appendChild(whoList);
      container.appendChild(whoSection);
    }

    // How To Use Section
    if (prompt.usageGuide) {
      var usageSection = document.createElement('section');
      usageSection.className = 'section';

      var usageTitle = document.createElement('h2');
      usageTitle.className = 'section__title';
      usageTitle.innerHTML = '<span class="section__title-icon">📖</span> How To Use';
      usageSection.appendChild(usageTitle);

      var usageContent = document.createElement('div');
      usageContent.className = 'section__content';
      usageContent.style.whiteSpace = 'pre-line';
      usageContent.textContent = prompt.usageGuide;
      usageSection.appendChild(usageContent);

      container.appendChild(usageSection);
    }

    // Expected Output Section
    if (prompt.expectedOutput) {
      var outputSection = document.createElement('section');
      outputSection.className = 'section';

      var outputTitle = document.createElement('h2');
      outputTitle.className = 'section__title';
      outputTitle.innerHTML = '<span class="section__title-icon">📊</span> Expected Output';
      outputSection.appendChild(outputTitle);

      var callout = document.createElement('div');
      callout.className = 'callout';
      callout.textContent = prompt.expectedOutput;
      outputSection.appendChild(callout);

      container.appendChild(outputSection);
    }

    // Example Section (collapsible)
    if (prompt.example) {
      var exampleSection = document.createElement('details');
      exampleSection.className = 'example-section section';

      var summary = document.createElement('summary');
      summary.innerHTML = '<span style="display: inline-flex; align-items: center; gap: var(--space-sm);">💡 Example</span>';
      exampleSection.appendChild(summary);

      var exampleContent = document.createElement('div');
      exampleContent.className = 'example-section__content';
      exampleContent.style.whiteSpace = 'pre-line';
      exampleContent.textContent = prompt.example;
      exampleSection.appendChild(exampleContent);

      container.appendChild(exampleSection);
    }

    // Prompt Blocks Section
    if (prompt.promptBlocks && prompt.promptBlocks.length > 0) {
      var blocksSection = document.createElement('section');
      blocksSection.className = 'section';

      var blocksContainer = document.createElement('div');
      blocksContainer.className = 'prompt-blocks';

      prompt.promptBlocks.forEach(function (block, index) {
        var blockEl = document.createElement('div');
        blockEl.className = 'prompt-block';

        // Header
        var blockHeader = document.createElement('div');
        blockHeader.className = 'prompt-block__header';

        var blockTitleWrap = document.createElement('div');

        var blockTitle = document.createElement('span');
        blockTitle.className = 'prompt-block__title';
        blockTitle.textContent = getBlockLabel(index, prompt.promptBlocks.length) + ' — ' + block.title;
        blockTitleWrap.appendChild(blockTitle);

        if (block.setupTime && block.setupTime !== 'N/A') {
          var blockMeta = document.createElement('span');
          blockMeta.className = 'prompt-block__meta';
          blockMeta.textContent = '⏱ ' + block.setupTime;
          blockMeta.style.cssText = 'display: block; margin-top: 2px;';
          blockTitleWrap.appendChild(blockMeta);
        }

        blockHeader.appendChild(blockTitleWrap);
        blockEl.appendChild(blockHeader);

        // Body
        var blockBody = document.createElement('div');
        blockBody.className = 'prompt-block__body';

        var blockText = document.createElement('pre');
        blockText.className = 'prompt-block__text';
        blockText.textContent = block.text;
        blockBody.appendChild(blockText);

        blockEl.appendChild(blockBody);

        // Expand/Collapse button
        var expandBtn = document.createElement('button');
        expandBtn.className = 'prompt-block__expand';
        expandBtn.textContent = 'Expand ▼';
        expandBtn.setAttribute('aria-expanded', 'false');
        expandBtn.addEventListener('click', function () {
          var isExpanded = blockBody.classList.contains('expanded');
          if (isExpanded) {
            blockBody.classList.remove('expanded');
            expandBtn.textContent = 'Expand ▼';
            expandBtn.setAttribute('aria-expanded', 'false');
          } else {
            blockBody.classList.add('expanded');
            expandBtn.textContent = 'Collapse ▲';
            expandBtn.setAttribute('aria-expanded', 'true');
          }
        });
        blockEl.appendChild(expandBtn);

        // Footer with copy button
        var blockFooter = document.createElement('div');
        blockFooter.className = 'prompt-block__footer';

        var copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn--copy';
        copyBtn.textContent = '📋 Copy';
        copyBtn.setAttribute('aria-label', 'Copy ' + getBlockLabel(index, prompt.promptBlocks.length));
        copyBtn.addEventListener('click', function () {
          copyToClipboard(block.text, copyBtn);
        });
        blockFooter.appendChild(copyBtn);

        blockEl.appendChild(blockFooter);
        blocksContainer.appendChild(blockEl);
      });

      blocksSection.appendChild(blocksContainer);

      // Copy All button for multi-block prompts
      if (prompt.promptBlocks.length > 1) {
        var copyAllWrap = document.createElement('div');
        copyAllWrap.style.cssText = 'text-align: center; margin-top: var(--space-lg);';

        var copyAllBtn = document.createElement('button');
        copyAllBtn.className = 'btn btn--secondary btn--block';
        copyAllBtn.textContent = '📋 Copy All ' + getBlockLabel(0, 0).split(' ')[0] + 's';

        var allText = prompt.promptBlocks.map(function (b) {
          return '--- ' + b.title + ' ---\n\n' + b.text;
        }).join('\n\n\n');

        copyAllBtn.addEventListener('click', function () {
          copyToClipboard(allText, copyAllBtn);
        });
        copyAllWrap.appendChild(copyAllBtn);
        blocksSection.appendChild(copyAllWrap);
      }

      container.appendChild(blocksSection);
    }

    // Related Prompts Section
    if (prompt.relatedPrompts && prompt.relatedPrompts.length > 0) {
      var relatedSection = document.createElement('section');
      relatedSection.className = 'section';

      var relatedTitle = document.createElement('h2');
      relatedTitle.className = 'section__title';
      relatedTitle.innerHTML = '<span class="section__title-icon">🔗</span> Related Prompts';
      relatedSection.appendChild(relatedTitle);

      var relatedGrid = document.createElement('div');
      relatedGrid.className = 'prompt-cards-grid';

      prompt.relatedPrompts.forEach(function (relatedId) {
        var relatedPrompt = getRelatedPrompt(relatedId);
        if (!relatedPrompt) return;

        var card = document.createElement('a');
        card.href = buildPromptUrl(relatedPrompt);
        card.className = 'prompt-card';

        var cardBadges = document.createElement('div');
        cardBadges.className = 'prompt-card__badges badge-group';

        var rCatBadge = document.createElement('span');
        rCatBadge.className = 'badge badge--category ' + relatedPrompt.category;
        rCatBadge.textContent = capitalize(relatedPrompt.category);
        cardBadges.appendChild(rCatBadge);

        var rDiffBadge = document.createElement('span');
        rDiffBadge.className = 'badge badge--difficulty ' + relatedPrompt.difficulty;
        rDiffBadge.textContent = capitalize(relatedPrompt.difficulty);
        cardBadges.appendChild(rDiffBadge);

        card.appendChild(cardBadges);

        var rTitle = document.createElement('h3');
        rTitle.className = 'prompt-card__title';
        rTitle.textContent = relatedPrompt.title;
        card.appendChild(rTitle);

        relatedGrid.appendChild(card);
      });

      relatedSection.appendChild(relatedGrid);
      container.appendChild(relatedSection);
    }

    // Tags Section
    if (prompt.tags && prompt.tags.length > 0) {
      var tagsSection = document.createElement('section');
      tagsSection.className = 'section';

      var tagsTitle = document.createElement('h2');
      tagsTitle.className = 'section__title';
      tagsTitle.innerHTML = '<span class="section__title-icon">🏷</span> Tags';
      tagsSection.appendChild(tagsTitle);

      var tagsList = document.createElement('div');
      tagsList.className = 'tags-list';

      prompt.tags.forEach(function (tag) {
        var tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.textContent = tag;
        tagsList.appendChild(tagEl);
      });

      tagsSection.appendChild(tagsList);
      container.appendChild(tagsSection);
    }

    // Meta Footer
    var metaFooter = document.createElement('div');
    metaFooter.className = 'section';
    metaFooter.style.cssText = 'text-align: center;';

    var metaText = document.createElement('p');
    metaText.style.cssText = 'font-size: var(--font-size-xs); color: var(--color-text-muted);';
    metaText.textContent = 'Updated: ' + prompt.updatedDate + ' · Version ' + prompt.version;
    metaFooter.appendChild(metaText);

    container.appendChild(metaFooter);

    // Bottom back link
    var backLinkBottom = document.createElement('a');
    backLinkBottom.href = '/';
    backLinkBottom.className = 'back-link';
    backLinkBottom.style.cssText = 'display: block; text-align: center;';
    backLinkBottom.innerHTML = '← Back to All Prompts';
    container.appendChild(backLinkBottom);

    // Append to main
    mainEl.appendChild(container);
  }

  // --- Initialize ---
  buildDetailPage();

})();
