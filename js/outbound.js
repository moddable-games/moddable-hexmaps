'use strict';
(function() {
    document.addEventListener('click', function(e) {
        var link = e.target.closest('a[href^="http"]');
        if (!link) return;
        var href = link.getAttribute('href');
        if (href.indexOf(window.location.hostname) !== -1) return;
        if (typeof window.gtag === 'function') {
            window.gtag('event', 'outbound_click', {
                link_url: href,
                link_label: link.textContent.trim().substring(0, 50)
            });
        }
    });
})();
