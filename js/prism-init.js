'use strict';
(function() {
  document.querySelectorAll('pre > code').forEach(function(code) {
    if (!code.className || !(/language-/.test(code.className))) {
      var lang = 'javascript';
      var text = code.textContent;
      if (/^\s*</.test(text) || /&lt;/.test(text)) lang = 'html';
      else if (/^\s*#|^\s*node\s/.test(text)) lang = 'bash';
      code.classList.add('language-' + lang);
    }
    var pre = code.parentElement;
    if (pre && !pre.className) {
      pre.className = 'language-' + code.className.match(/language-(\w+)/)[1];
    }
  });

  if (window.Prism) {
    Prism.highlightAll();
  }

  document.querySelectorAll('pre[class*="language-"]').forEach(function(pre, index) {
    var btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.addEventListener('click', function() {
      var code = pre.querySelector('code');
      var text = code ? code.textContent : pre.textContent;
      navigator.clipboard.writeText(text).then(function() {
        if (typeof window.gtag === 'function') {
          var page = window.location.pathname.split('/').pop() || 'index';
          window.gtag('event', 'code_copy', { page: page, snippet_index: index });
        }
        btn.textContent = 'Copied';
        btn.classList.add('copied');
        setTimeout(function() {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });
})();
