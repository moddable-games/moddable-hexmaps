(function() {
    var hero = document.querySelector('.hx-hero, .mc-hero');
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var glow = hero.querySelector('.hx-hero__glow, .mc-hero__glow');
    var content = hero.querySelector('.hx-hero__title, .mc-hero__title');
    var lede = hero.querySelector('.hx-hero__lede, .mc-hero__lede');
    var btns = hero.querySelector('.hx-hero__btns, .mc-hero__btns');
    var ticking = false;

    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(function() {
                var scroll = window.pageYOffset;
                var heroHeight = hero.offsetHeight;
                if (scroll > heroHeight) { ticking = false; return; }

                var ratio = scroll / heroHeight;
                hero.style.backgroundPositionY = (scroll * 0.5) + 'px';
                if (glow) glow.style.transform = 'translate(-50%, calc(-50% + ' + (scroll * 0.3) + 'px))';
                if (content) content.style.transform = 'translateY(' + (scroll * 0.15) + 'px)';
                if (lede) lede.style.transform = 'translateY(' + (scroll * 0.1) + 'px)';
                if (btns) btns.style.opacity = Math.max(0, 1 - ratio * 1.5);

                ticking = false;
            });
            ticking = true;
        }
    });
})();
