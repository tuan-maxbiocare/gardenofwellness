(function () {
  const SELECTORS = [
    '.shopify-section',
    'product-card',
    '.product-grid .grid__item',
    '.card',
    '.multicolumn-list__item',
    '.image-with-text',
    '.rich-text'
  ];

  function init() {
    const elements = document.querySelectorAll(SELECTORS.join(','));

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );

    elements.forEach(el => {
      /* 🚫 SKIP section chứa sticky-add-to-cart */
      if (
        el.classList.contains('shopify-section') &&
        el.querySelector('sticky-add-to-cart')
      ) {
        return;
      }

      el.classList.add('reveal');
      observer.observe(el);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('shopify:section:load', init);
})();
