'use strict';
(function() {

var fromPage = window.location.pathname.split('/').pop() || 'index';
document.addEventListener('click', function(e) {
  var link = e.target.closest('a[href]');
  if (!link) return;
  var href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('http')) return;
  var toPage = href.split('/').pop().split('?')[0].split('#')[0] || 'index';
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'docs_navigate', { from_page: fromPage, to_page: toPage });
  }
});

var tocEl = document.getElementById('docs-toc');
var body = document.querySelector('.docs-body');
if (!tocEl || !body) return;

var headings = body.querySelectorAll('h2, h3');
if (headings.length === 0) return;

var title = document.createElement('div');
title.className = 'docs-toc__title';
title.textContent = 'On this page';
tocEl.appendChild(title);

var list = document.createElement('ul');
list.className = 'docs-toc__list';

headings.forEach(function(h, i) {
  if (!h.id) h.id = 'section-' + i;
  var li = document.createElement('li');
  var a = document.createElement('a');
  a.href = '#' + h.id;
  a.textContent = h.textContent;
  if (h.tagName === 'H3') a.className = 'toc-h3';
  li.appendChild(a);
  list.appendChild(li);
});

tocEl.appendChild(list);

var links = list.querySelectorAll('a');
var current = null;

function updateActive() {
  var scrollY = window.scrollY + 80;
  var active = null;
  headings.forEach(function(h) {
    if (h.offsetTop <= scrollY) active = h;
  });
  if (active && active !== current) {
    current = active;
    links.forEach(function(a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + active.id);
    });
  }
}

window.addEventListener('scroll', updateActive, { passive: true });
updateActive();

})();
