/**
 * PromptHub — Navigation Logic
 * 
 * Handles: Hamburger menu toggle, Bottom Sheet open/close,
 * Backdrop interaction, Swipe down to close, Keyboard Escape,
 * Desktop active link detection, and Body scroll lock.
 * 
 * @version 1.0.0
 * @date 2026-06
 */

(function () {
  'use strict';

  // --- DOM References ---
  var hamburgerBtn = document.getElementById('hamburger-btn');
  var bottomSheet = document.getElementById('bottom-sheet');
  var backdrop = document.getElementById('backdrop');
  var body = document.body;

  // Exit early if critical elements don't exist (e.g., on pages without the menu)
  if (!hamburgerBtn || !bottomSheet || !backdrop) {
    return;
  }

  // --- State ---
  var isOpen = false;
  var touchStartY = 0;
  var touchCurrentY = 0;
  var isDragging = false;

  // --- Helper Functions ---

  /**
   * Open the bottom sheet with animation.
   */
  function openSheet() {
    isOpen = true;

    // Show backdrop
    backdrop.classList.add('visible');

    // Show bottom sheet
    bottomSheet.classList.add('visible');

    // Lock body scroll
    body.classList.add('bottom-sheet-open');

    // Update hamburger state
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    hamburgerBtn.setAttribute('aria-label', hamburgerBtn.getAttribute('data-close-label') || 'Close menu');

    // Focus the first nav link inside the sheet for accessibility
    setTimeout(function () {
      var firstLink = bottomSheet.querySelector('.bottom-sheet__nav-link');
      if (firstLink) {
        firstLink.focus();
      }
    }, 400); // Wait for transition to complete
  }

  /**
   * Close the bottom sheet with animation.
   */
  function closeSheet() {
    isOpen = false;

    // Hide backdrop
    backdrop.classList.remove('visible');

    // Hide bottom sheet
    bottomSheet.classList.remove('visible');

    // Unlock body scroll
    body.classList.remove('bottom-sheet-open');

    // Update hamburger state
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    hamburgerBtn.setAttribute('aria-label', hamburgerBtn.getAttribute('data-open-label') || 'Open menu');

    // Return focus to hamburger button
    hamburgerBtn.focus();
  }

  /**
   * Toggle the bottom sheet.
   */
  function toggleSheet() {
    if (isOpen) {
      closeSheet();
    } else {
      openSheet();
    }
  }

  // --- Event Listeners ---

  // Hamburger button click
  hamburgerBtn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    toggleSheet();
  });

  // Backdrop click to close
  backdrop.addEventListener('click', function (e) {
    if (isOpen) {
      e.preventDefault();
      closeSheet();
    }
  });

  // Keyboard: Escape to close
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      closeSheet();
    }
  });

  // --- Touch / Swipe Down to Close ---

  bottomSheet.addEventListener('touchstart', function (e) {
    // Only track touches starting inside the sheet
    touchStartY = e.touches[0].clientY;
    touchCurrentY = touchStartY;
    isDragging = false;
  }, { passive: true });

  bottomSheet.addEventListener('touchmove', function (e) {
    touchCurrentY = e.touches[0].clientY;
    var deltaY = touchCurrentY - touchStartY;

    // Only consider it a drag if moving downward significantly
    if (deltaY > 10) {
      isDragging = true;
    }

    // If dragging down, apply visual feedback by transforming the sheet
    if (isDragging && isOpen) {
      var sheetHeight = bottomSheet.offsetHeight;
      var translateValue = Math.min(deltaY, sheetHeight);
      bottomSheet.style.transition = 'none';
      bottomSheet.style.transform = 'translateY(' + translateValue + 'px)';
    }
  }, { passive: true });

  bottomSheet.addEventListener('touchend', function (e) {
    // Reset transition
    bottomSheet.style.transition = '';

    if (isDragging) {
      var deltaY = touchCurrentY - touchStartY;
      var threshold = bottomSheet.offsetHeight * 0.25; // 25% of sheet height

      if (deltaY > threshold) {
        // Swiped down enough — close
        bottomSheet.style.transform = '';
        closeSheet();
      } else {
        // Not enough — snap back
        bottomSheet.style.transform = '';
        if (isOpen) {
          bottomSheet.classList.add('visible');
        }
      }
    }

    isDragging = false;
    touchStartY = 0;
    touchCurrentY = 0;
  });

  // --- Desktop: Active Link Detection ---

  /**
   * Determine which nav link should be marked as active
   * based on the current URL path.
   */
  function setActiveNavLink() {
    var currentPath = window.location.pathname;
    var lang = document.documentElement.getAttribute('lang') || 'en';

    // Build the base path for the current language
    var langPrefix = '/' + lang + '/';

    // Desktop nav links
    var desktopLinks = document.querySelectorAll('.desktop-nav__link');

    // Bottom sheet nav links
    var sheetLinks = document.querySelectorAll('.bottom-sheet__nav-link');

    // Remove active class from all links
    desktopLinks.forEach(function (link) {
      link.classList.remove('active');
    });
    sheetLinks.forEach(function (link) {
      link.classList.remove('active');
    });

    // Determine which link to activate
    var activeHref = null;

    if (currentPath === langPrefix || currentPath === langPrefix + 'index.html' || currentPath === '/' + lang) {
      // Home page
      activeHref = langPrefix;
    } else if (currentPath.indexOf(langPrefix + 'strategy/') === 0 ||
               currentPath.indexOf(langPrefix + 'seo/') === 0 ||
               currentPath.indexOf(langPrefix + 'marketing/') === 0 ||
               currentPath.indexOf(langPrefix + 'research/') === 0 ||
               currentPath.indexOf(langPrefix + 'automation/') === 0) {
      // Any prompt detail page — activate Prompts tab
      activeHref = langPrefix + '#prompts-section';
    } else if (currentPath.indexOf(langPrefix + 'tools') === 0) {
      // Tools page
      activeHref = langPrefix + 'tools/';
    } else if (currentPath.indexOf(langPrefix + 'contact') === 0) {
      // Contact page
      activeHref = langPrefix + 'contact/';
    }

    // Apply active class
    if (activeHref) {
      desktopLinks.forEach(function (link) {
        var linkHref = link.getAttribute('href');
        if (linkHref === activeHref || linkHref === activeHref.replace(/\/$/, '')) {
          link.classList.add('active');
        }
      });

      sheetLinks.forEach(function (link) {
        var linkHref = link.getAttribute('href');
        if (linkHref === activeHref || linkHref === activeHref.replace(/\/$/, '')) {
          link.classList.add('active');
        }
      });
    }

    // Special case: if we're on a prompt detail page, the "Prompts" link
    // in the bottom sheet might have href="#prompts-section" which won't
    // match directly. We handle this separately.
    if (activeHref && activeHref.indexOf('#prompts-section') !== -1) {
      sheetLinks.forEach(function (link) {
        var linkHref = link.getAttribute('href');
        if (linkHref && linkHref.indexOf('#prompts-section') !== -1) {
          link.classList.add('active');
        }
      });
      desktopLinks.forEach(function (link) {
        var linkHref = link.getAttribute('href');
        if (linkHref && linkHref.indexOf('#prompts-section') !== -1) {
          link.classList.add('active');
        }
      });
    }
  }

  // Run on load
  setActiveNavLink();

  // --- Close sheet on nav link click (mobile) ---

  var allSheetLinks = bottomSheet.querySelectorAll('.bottom-sheet__nav-link');
  allSheetLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      // Small delay to allow the click to navigate before closing animation
      setTimeout(function () {
        if (isOpen) {
          closeSheet();
        }
      }, 100);
    });
  });

  // --- Handle resize: close sheet if switching to desktop ---

  var resizeTimeout;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      // If window width is now >= 768px (desktop) and sheet is open, close it
      if (window.innerWidth >= 768 && isOpen) {
        closeSheet();
      }
      // Re-check active link on resize
      setActiveNavLink();
    }, 200);
  });

})();
