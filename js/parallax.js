(function() {
    var hero = document.querySelector('.hx-hero, .mc-hero');
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var glow = hero.querySelector('.hx-hero__glow, .mc-hero__glow');
    var ticking = false;

    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(function() {
                var scroll = window.pageYOffset;
                hero.style.backgroundPositionY = (scroll * 0.4) + 'px';
                if (glow) glow.style.transform = 'translate(-50%, calc(-50% + ' + (scroll * 0.2) + 'px))';
                ticking = false;
            });
            ticking = true;
        }
    });
})();
