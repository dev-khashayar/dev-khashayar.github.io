/**
 * Proxy Finder — QR Code Generator
 * 
 * Generates QR codes for proxy/vpn configuration URLs.
 * Uses the lightweight qrcodejs library loaded from CDN.
 * Supports VLESS, VMess, Trojan, Shadowsocks, and MTProto URLs.
 * 
 * @version 1.0.0
 * @date 2026-06
 */

(function () {
  'use strict';

  // Track active QR modals
  var activeModals = [];

  /**
   * Generate a QR code for a configuration URL.
   * Creates a modal overlay with the QR code image.
   * 
   * @param {string} url — The configuration URL to encode
   * @param {string} type — Protocol type (vless, vmess, trojan, ss, mtproto)
   * @param {Object} options — Optional configuration
   * @param {number} options.size — QR code size in pixels (default: 256)
   * @param {string} options.colorDark — Dark color (default: '#e6ecf4')
   * @param {string} options.colorLight — Light color (default: '#0a0e14')
   */
  function showQRCode(url, type, options) {
    if (!url) return;

    options = options || {};
    var size = options.size || 256;
    var colorDark = options.colorDark || '#e6ecf4';
    var colorLight = options.colorLight || '#0a0e14';

    // Check if qrcodejs is loaded
    if (typeof QRCode === 'undefined') {
      alert('QR Code library is loading. Please try again in a moment.');
      return;
    }

    // Create modal backdrop
    var backdrop = document.createElement('div');
    backdrop.className = 'qr-backdrop';
    backdrop.setAttribute('aria-hidden', 'false');

    // Create modal container
    var modal = document.createElement('div');
    modal.className = 'qr-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'QR Code for ' + type.toUpperCase() + ' configuration');

    // Create modal content
    var content = document.createElement('div');
    content.className = 'qr-modal__content';

    // Header
    var header = document.createElement('div');
    header.className = 'qr-modal__header';

    var title = document.createElement('h3');
    title.className = 'qr-modal__title';
    title.textContent = getTypeLabel(type) + ' Configuration';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'qr-modal__close';
    closeBtn.setAttribute('aria-label', 'Close QR code');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', function () {
      closeQRModal(backdrop);
    });

    header.appendChild(title);
    header.appendChild(closeBtn);
    content.appendChild(header);

    // QR code container
    var qrContainer = document.createElement('div');
    qrContainer.className = 'qr-modal__code';
    qrContainer.id = 'qr-code-' + Date.now();
    content.appendChild(qrContainer);

    // Info text
    var info = document.createElement('p');
    info.className = 'qr-modal__info';
    info.textContent = 'Scan this QR code with your VPN client app to import the configuration.';
    content.appendChild(info);

    // URL display (truncated)
    var urlDisplay = document.createElement('div');
    urlDisplay.className = 'qr-modal__url';

    var urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.className = 'qr-modal__url-input';
    urlInput.value = url;
    urlInput.readOnly = true;
    urlInput.setAttribute('aria-label', 'Configuration URL');
    urlDisplay.appendChild(urlInput);

    var copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn--copy';
    copyBtn.textContent = '📋 Copy';
    copyBtn.addEventListener('click', function () {
      copyToClipboard(url, copyBtn);
    });
    urlDisplay.appendChild(copyBtn);

    content.appendChild(urlDisplay);

    // Type badge
    var typeBadge = document.createElement('span');
    typeBadge.className = 'qr-modal__type-badge qr-modal__type-badge--' + type;
    typeBadge.textContent = type.toUpperCase();
    content.appendChild(typeBadge);

    modal.appendChild(content);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Prevent body scroll
    document.body.classList.add('qr-modal-open');

    // Track active modal
    activeModals.push(backdrop);

    // Generate QR code
    setTimeout(function () {
      try {
        new QRCode(qrContainer.id, {
          text: url,
          width: size,
          height: size,
          colorDark: colorDark,
          colorLight: colorLight,
          correctLevel: QRCode.CorrectLevel.M
        });
      } catch (e) {
        console.error('QR Code generation error:', e);
        qrContainer.innerHTML = '<div class="qr-modal__error">Failed to generate QR code. The URL may be too long.</div>';
      }
    }, 100);

    // Close on backdrop click
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) {
        closeQRModal(backdrop);
      }
    });

    // Close on Escape key
    var escHandler = function (e) {
      if (e.key === 'Escape') {
        closeQRModal(backdrop);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Add entrance animation
    setTimeout(function () {
      backdrop.classList.add('qr-backdrop--visible');
      modal.classList.add('qr-modal--visible');
    }, 10);
  }

  /**
   * Close a QR modal by removing its backdrop.
   * @param {HTMLElement} backdrop
   */
  function closeQRModal(backdrop) {
    if (!backdrop) return;

    backdrop.classList.remove('qr-backdrop--visible');
    var modal = backdrop.querySelector('.qr-modal');
    if (modal) {
      modal.classList.remove('qr-modal--visible');
    }

    // Remove after animation
    setTimeout(function () {
      if (backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
      // Remove from active modals
      var index = activeModals.indexOf(backdrop);
      if (index !== -1) {
        activeModals.splice(index, 1);
      }
      // Restore body scroll if no more modals
      if (activeModals.length === 0) {
        document.body.classList.remove('qr-modal-open');
      }
    }, 300);
  }

  /**
   * Close all active QR modals.
   */
  function closeAllQRModals() {
    var modals = activeModals.slice();
    modals.forEach(function (backdrop) {
      closeQRModal(backdrop);
    });
  }

  /**
   * Get a human-readable label for a protocol type.
   * @param {string} type
   * @returns {string}
   */
  function getTypeLabel(type) {
    var labels = {
      'vless': 'VLESS',
      'vmess': 'VMess',
      'trojan': 'Trojan',
      'shadowsocks': 'Shadowsocks',
      'ss': 'Shadowsocks',
      'mtproto': 'MTProto',
      'unknown': 'Proxy'
    };
    return labels[type] || type.toUpperCase();
  }

  /**
   * Copy text to clipboard with visual feedback.
   * @param {string} text
   * @param {HTMLElement} buttonEl
   */
  function copyToClipboard(text, buttonEl) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showCopySuccess(buttonEl);
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
      showCopySuccess(buttonEl);
    } catch (e) {
      // Silent fail
    }
    document.body.removeChild(textarea);
  }

  /**
   * Show copy success state on a button.
   * @param {HTMLElement} buttonEl
   */
  function showCopySuccess(buttonEl) {
    var originalText = buttonEl.textContent;
    buttonEl.textContent = '✓ Copied!';
    buttonEl.classList.add('copied');
    setTimeout(function () {
      buttonEl.textContent = originalText;
      buttonEl.classList.remove('copied');
    }, 2000);
  }

  /**
   * Generate a deep link for importing into VPN client apps.
   * @param {string} url — Configuration URL
   * @param {string} type — Protocol type
   * @returns {string} — Deep link URL
   */
  function getDeepLink(url, type) {
    if (!url) return '';

    // v2rayNG uses the raw URL directly via clipboard or intent
    // Nekobox can use nekobox:// import
    // For now, we provide the most common import formats

    var encodedUrl = encodeURIComponent(url);

    switch (type) {
      case 'vless':
      case 'vmess':
      case 'trojan':
        // v2rayNG custom scheme (some versions support it)
        return 'v2rayng://install-config?url=' + encodedUrl;

      case 'shadowsocks':
      case 'ss':
        // Shadowsocks import
        return 'ss://import?url=' + encodedUrl;

      case 'mtproto':
        // MTProto can be opened directly by Telegram
        return url; // tg://proxy links open directly

      default:
        return url;
    }
  }

  /**
   * Open a deep link to import configuration into a VPN client.
   * @param {string} url
   * @param {string} type
   */
  function openDeepLink(url, type) {
    var deepLink = getDeepLink(url, type);

    if (type === 'mtproto') {
      // Open Telegram proxy link directly
      window.open(deepLink, '_blank');
      return;
    }

    // For other types, try to open the deep link
    // If it fails, copy the URL to clipboard and show instructions
    try {
      window.location.href = deepLink;
    } catch (e) {
      // Fallback: copy URL
      copyToClipboard(url, null);
      alert('The configuration URL has been copied to your clipboard. Paste it into your VPN client to import.');
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  window.QRGenerator = {
    showQRCode: showQRCode,
    closeQRModal: closeQRModal,
    closeAllQRModals: closeAllQRModals,
    getDeepLink: getDeepLink,
    openDeepLink: openDeepLink,
    copyToClipboard: copyToClipboard,
    getTypeLabel: getTypeLabel
  };

})();
