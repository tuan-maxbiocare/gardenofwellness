(() => {
  function placeBanner() {
    const banner = document.querySelector('[data-collection-banner]');
    if (!banner) return;

    const firstItem = document.querySelector('li.product-grid__item');
    if (!firstItem || !firstItem.parentElement) return;

    const grid = firstItem.parentElement;

    // số cột hiện tại của grid
    const style = window.getComputedStyle(grid);
    const cols = (style.gridTemplateColumns || '').split(' ').filter(Boolean).length;
    if (!cols || cols < 1) return;

    // CHỈ lấy product item (loại banner ra), và nên ưu tiên item có data-product-id để không tính banner/khác
    const items = Array.from(grid.children).filter(
      (el) =>
        el.matches('li.product-grid__item') &&
        el !== banner &&
        el.hasAttribute('data-product-id')
    );

    // left/right từ Liquid: data-banner-position="left|right"
    const position = (banner.dataset.bannerPosition || 'left').toLowerCase();

    // Banner span 2 cột => muốn nằm bên phải row 2 thì trước nó cần (cols - 2) sản phẩm trong row 2
    const offsetRow2 = position === 'right' ? Math.max(cols - 2, 0) : 0;

    // Row 2 start sau cols sản phẩm (row 1)
    const targetIndex = cols + offsetRow2;

    const insertBefore = items[targetIndex] || null; // thiếu thì append cuối
    grid.insertBefore(banner, insertBefore);
  }

  const schedule = () => {
    window.clearTimeout(window.__bannerResizeTimer);
    window.__bannerResizeTimer = window.setTimeout(placeBanner, 120);
  };

  document.addEventListener('DOMContentLoaded', placeBanner);
  window.addEventListener('resize', schedule);
  document.addEventListener('collection:products-appended', schedule);
})();
