/**
 * PromptHub — Detail Page Logic
 * 
 * Handles: rendering prompt detail page, expand/collapse blocks,
 * copy buttons, related prompts, and toast notifications.
 * Supports both English and Persian.
 * 
 * Expected: PROMPTS_DATA_FA and PROMPTS_DATA_EN globals (from data files)
 *           and a data-prompt-id attribute on the main element.
 * 
 * @version 2.0.0
 */

(function () {
  'use strict';

  // --- Detect language ---
  var htmlEl = document.documentElement;
  var lang = htmlEl.getAttribute('lang') || 'en';
  var isRTL = htmlEl.getAttribute('dir') === 'rtl';

  // --- Select correct data source ---
  var PROMPTS_DATA = (lang === 'fa' && typeof PROMPTS_DATA_FA !== 'undefined')
    ? PROMPTS_DATA_FA
    : (typeof PROMPTS_DATA_EN !== 'undefined' ? PROMPTS_DATA_EN : []);

  // --- Get prompt ID from DOM ---
  var mainEl = document.querySelector('main[data-prompt-id]');
  if (!mainEl) return;

  var promptId = mainEl.getAttribute('data-prompt-id');
  var prompt = null;

  for (var i = 0; i < PROMPTS_DATA.length; i++) {
    if (PROMPTS_DATA[i].id === promptId) {
      prompt = PROMPTS_DATA[i];
      break;
    }
  }

  if (!prompt) {
    var notFoundMsg = (lang === 'fa')
      ? '<div class="container" style="padding: var(--space-2xl) 0; text-align: center;"><p style="color: var(--color-error);">پرامپت مورد نظر یافت نشد.</p><a href="/fa/" class="btn btn--secondary mt-lg">← بازگشت به صفحه اصلی</a></div>'
      : '<div class="container" style="padding: var(--space-2xl) 0; text-align: center;"><p style="color: var(--color-error);">Prompt not found.</p><a href="/" class="btn btn--secondary mt-lg">← Back to Home</a></div>';
    mainEl.innerHTML = notFoundMsg;
    return;
  }

  // --- Helper Functions ---

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

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

  function getRelatedPrompt(id) {
    for (var i = 0; i < PROMPTS_DATA.length; i++) {
      if (PROMPTS_DATA[i].id === id) {
        return PROMPTS_DATA[i];
      }
    }
    return null;
  }

  function buildPromptUrl(p) {
    return '/' + lang + '/' + p.category + '/' + p.slug + '/';
  }

  function getHomeUrl() {
    return '/' + lang + '/';
  }

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

  function copyToClipboard(text, buttonEl) {
    var copiedMsg = (lang === 'fa') ? '✓ کپی شد!' : '✓ Copied!';
    var toastMsg = (lang === 'fa') ? 'در کلیپ‌بورد کپی شد!' : 'Copied to clipboard!';
    var failMsg = (lang === 'fa') ? 'کپی ناموفق بود. لطفاً دوباره تلاش کنید.' : 'Failed to copy. Please try again.';

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        buttonEl.classList.add('copied');
        var originalText = buttonEl.textContent;
        buttonEl.textContent = copiedMsg;
        showToast(toastMsg);
        setTimeout(function () {
          buttonEl.classList.remove('copied');
          buttonEl.textContent = originalText;
        }, 2000);
      }).catch(function () {
        fallbackCopy(text, buttonEl, copiedMsg, toastMsg, failMsg);
      });
    } else {
      fallbackCopy(text, buttonEl, copiedMsg, toastMsg, failMsg);
    }
  }

  function fallbackCopy(text, buttonEl, copiedMsg, toastMsg, failMsg) {
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
      buttonEl.textContent = copiedMsg;
      showToast(toastMsg);
      setTimeout(function () {
        buttonEl.classList.remove('copied');
        buttonEl.textContent = originalText;
      }, 2000);
    } catch (e) {
      showToast(failMsg);
    }
    document.body.removeChild(textarea);
  }

  function getBlockLabel(index, total) {
    var stepOf = (lang === 'fa') ? 'از' : 'of';
    if (prompt.type === 'multi-step' || prompt.type === 'workflow') {
      return ((lang === 'fa') ? 'مرحله ' : 'Step ') + (index + 1) + ' ' + stepOf + ' ' + total;
    }
    if (prompt.type === 'pack') {
      return ((lang === 'fa') ? 'پرامپت ' : 'Prompt ') + (index + 1) + ' ' + stepOf + ' ' + total;
    }
    if (total > 1) {
      return ((lang === 'fa') ? 'بخش ' : 'Block ') + (index + 1) + ' ' + stepOf + ' ' + total;
    }
    return (lang === 'fa') ? 'پرامپت' : 'Prompt';
  }

  // --- Build Page ---

  function buildDetailPage() {
    var container = document.createElement('div');
    container.className = 'container';

    // Back link
    var backLink = document.createElement('a');
    backLink.href = getHomeUrl();
    backLink.className = 'back-link';
    backLink.innerHTML = (lang === 'fa') ? '← بازگشت به همه پرامپت‌ها' : '← Back to All Prompts';
    container.appendChild(backLink);

    // Page Header
    var header = document.createElement('header');
    header.className = 'page-header';

    var badgesDiv = document.createElement('div');
    badgesDiv.className = 'page-header__badges badge-group';

    var catBadge = document.createElement('span');
    catBadge.className = 'badge badge--category ' + prompt.category;
    catBadge.textContent = formatCategory(prompt.category);
    badgesDiv.appendChild(catBadge);

    var typeBadge = document.createElement('span');
    typeBadge.className = 'badge badge--type';
    typeBadge.textContent = formatType(prompt.type);
    badgesDiv.appendChild(typeBadge);

    var diffBadge = document.createElement('span');
    diffBadge.className = 'badge badge--difficulty ' + prompt.difficulty;
    diffBadge.textContent = formatDifficulty(prompt.difficulty);
    badgesDiv.appendChild(diffBadge);

    header.appendChild(badgesDiv);

    var titleEl = document.createElement('h1');
    titleEl.className = 'page-header__title';
    titleEl.textContent = prompt.title;
    header.appendChild(titleEl);

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
      whoTitle.innerHTML = '<span class="section__title-icon">👤</span> ' + ((lang === 'fa') ? 'مناسب چه کسانی است؟' : 'Who Is This For?');
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
      usageTitle.innerHTML = '<span class="section__title-icon">📖</span> ' + ((lang === 'fa') ? 'نحوه استفاده' : 'How To Use');
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
      outputTitle.innerHTML = '<span class="section__title-icon">📊</span> ' + ((lang === 'fa') ? 'خروجی مورد انتظار' : 'Expected Output');
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
      summary.innerHTML = '<span style="display: inline-flex; align-items: center; gap: var(--space-sm);">💡 ' + ((lang === 'fa') ? 'مثال' : 'Example') + '</span>';
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

        var blockBody = document.createElement('div');
        blockBody.className = 'prompt-block__body';

        var blockText = document.createElement('pre');
        blockText.className = 'prompt-block__text';
        blockText.textContent = block.text;
        blockBody.appendChild(blockText);

        blockEl.appendChild(blockBody);

        var expandLabel = (lang === 'fa') ? 'باز کردن ▼' : 'Expand ▼';
        var collapseLabel = (lang === 'fa') ? 'بستن ▲' : 'Collapse ▲';
        var expandBtn = document.createElement('button');
        expandBtn.className = 'prompt-block__expand';
        expandBtn.textContent = expandLabel;
        expandBtn.setAttribute('aria-expanded', 'false');
        expandBtn.addEventListener('click', function () {
          var isExpanded = blockBody.classList.contains('expanded');
          if (isExpanded) {
            blockBody.classList.remove('expanded');
            expandBtn.textContent = expandLabel;
            expandBtn.setAttribute('aria-expanded', 'false');
          } else {
            blockBody.classList.add('expanded');
            expandBtn.textContent = collapseLabel;
            expandBtn.setAttribute('aria-expanded', 'true');
          }
        });
        blockEl.appendChild(expandBtn);

        var blockFooter = document.createElement('div');
        blockFooter.className = 'prompt-block__footer';

        var copyLabel = (lang === 'fa') ? '📋 کپی' : '📋 Copy';
        var copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn--copy';
        copyBtn.textContent = copyLabel;
        copyBtn.setAttribute('aria-label', (lang === 'fa' ? 'کپی ' : 'Copy ') + getBlockLabel(index, prompt.promptBlocks.length));
        copyBtn.addEventListener('click', function () {
          copyToClipboard(block.text, copyBtn);
        });
        blockFooter.appendChild(copyBtn);

        blockEl.appendChild(blockFooter);
        blocksContainer.appendChild(blockEl);
      });

      blocksSection.appendChild(blocksContainer);

      if (prompt.promptBlocks.length > 1) {
        var copyAllWrap = document.createElement('div');
        copyAllWrap.style.cssText = 'text-align: center; margin-top: var(--space-lg);';

        var copyAllBtn = document.createElement('button');
        copyAllBtn.className = 'btn btn--secondary btn--block';
        var blockTypeLabel = (lang === 'fa') ? 'مراحل' : 'Steps';
        if (prompt.type === 'pack') blockTypeLabel = (lang === 'fa') ? 'پرامپت‌ها' : 'Prompts';
        copyAllBtn.textContent = '📋 ' + ((lang === 'fa') ? 'کپی همه ' : 'Copy All ') + blockTypeLabel;

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
      relatedTitle.innerHTML = '<span class="section__title-icon">🔗</span> ' + ((lang === 'fa') ? 'پرامپت‌های مرتبط' : 'Related Prompts');
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
        rCatBadge.textContent = formatCategory(relatedPrompt.category);
        cardBadges.appendChild(rCatBadge);

        var rDiffBadge = document.createElement('span');
        rDiffBadge.className = 'badge badge--difficulty ' + relatedPrompt.difficulty;
        rDiffBadge.textContent = formatDifficulty(relatedPrompt.difficulty);
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
      tagsTitle.innerHTML = '<span class="section__title-icon">🏷</span> ' + ((lang === 'fa') ? 'برچسب‌ها' : 'Tags');
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
    var updateLabel = (lang === 'fa') ? 'بروزرسانی' : 'Updated';
    var versionLabel = (lang === 'fa') ? 'نسخه' : 'Version';
    metaText.textContent = updateLabel + ': ' + prompt.updatedDate + ' · ' + versionLabel + ' ' + prompt.version;
    metaFooter.appendChild(metaText);

    container.appendChild(metaFooter);

    // Bottom back link
    var backLinkBottom = document.createElement('a');
    backLinkBottom.href = getHomeUrl();
    backLinkBottom.className = 'back-link';
    backLinkBottom.style.cssText = 'display: block; text-align: center;';
    backLinkBottom.innerHTML = (lang === 'fa') ? '← بازگشت به همه پرامپت‌ها' : '← Back to All Prompts';
    container.appendChild(backLinkBottom);

    mainEl.appendChild(container);
  }

  buildDetailPage();

})();
