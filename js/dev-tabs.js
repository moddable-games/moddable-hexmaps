(function() {
    var tabs = document.querySelectorAll('.dev-tabs__tab');
    var panels = document.querySelectorAll('.dev-tabs__panel');

    for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function() {
            var target = this.getAttribute('data-tab');
            for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
            for (var j = 0; j < panels.length; j++) panels[j].classList.remove('active');
            this.classList.add('active');
            document.querySelector('[data-panel="' + target + '"]').classList.add('active');
        });
    }
})();
