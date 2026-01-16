(() => {
  const HIDDEN = "is-reveal-hidden";

  // Chỉ đếm product thật: item có data-product-id
  const getProductItems = (rootDoc = document) =>
    Array.from(rootDoc.querySelectorAll(".product-grid__item[data-product-id]"));

  const getGrid = (rootDoc = document) => rootDoc.querySelector(".product-grid");

  // Lấy số cột hiện tại của grid (để tính "2 hàng đầu")
  const getCols = () => {
    const grid = getGrid();
    if (!grid) return 0;
    const tpl = getComputedStyle(grid).gridTemplateColumns || "";
    return tpl.split(" ").filter(Boolean).length || 0;
  };

  const setCount = (wrap, shown, total) => {
    const el = wrap.querySelector("[data-reveal-count]");
    if (el) el.textContent = `Showing ${shown}/${total}`;
  };

  // Ẩn sau "initial" khi load trang
  const hideAfterInitial = (initial) => {
    const items = getProductItems();
    items.forEach((li, idx) => {
      if (idx >= initial) li.classList.add(HIDDEN);
      else li.classList.remove(HIDDEN);
    });
  };

  // Hiện đúng N sản phẩm đầu (dùng cho Show less)
  const showOnlyFirstN = (n) => {
    const items = getProductItems();
    items.forEach((li, idx) => {
      if (idx < n) li.classList.remove(HIDDEN);
      else li.classList.add(HIDDEN);
    });
  };

  const revealBatch = (batch) => {
    const items = getProductItems();
    const hidden = items.filter((li) => li.classList.contains(HIDDEN));
    const toShow = hidden.slice(0, batch);

    // hiện lần lượt từng card
    toShow.forEach((li, i) => {
      setTimeout(() => li.classList.remove(HIDDEN), i * 80);
    });

    return toShow.length;
  };

  async function fetchNextPage(wrap) {
    const nextUrl = wrap.dataset.nextUrl;
    const sectionId = wrap.dataset.sectionId;
    if (!nextUrl || !sectionId) return false;

    const url = new URL(nextUrl, window.location.origin);
    url.searchParams.set("section_id", sectionId);

    const res = await fetch(url.toString(), {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    const newLis = getProductItems(doc);
    if (!newLis.length) {
      wrap.dataset.nextUrl = "";
      return false;
    }

    const grid = getGrid();
    if (!grid) return false;

    // append nhưng ẩn hết để reveal theo batch (banner không có data-product-id nên không dính)
    newLis.forEach((li) => {
      li.classList.add(HIDDEN);
      grid.appendChild(li);
    });

    // cập nhật next url từ response mới
    const newWrap = doc.querySelector("[data-collection-reveal]");
    wrap.dataset.nextUrl = newWrap?.dataset?.nextUrl || "";

    // báo cho theme (nếu cần re-init quick add, hover...)
    document.dispatchEvent(new CustomEvent("collection:products-appended"));

    return true;
  }

  function updateButtonState(wrap, btn) {
    const total = Number(wrap.dataset.total || 0);
    const moreLabel = wrap.dataset.moreLabel || "Load more";
    const lessLabel = wrap.dataset.lessLabel || "Show less";

    const shown = getProductItems().filter((li) => !li.classList.contains(HIDDEN)).length;

    // Chỉ khi FULL mới hiện trạng thái Show less
    if (shown >= total && total > 0) {
      btn.textContent = lessLabel;
      btn.dataset.mode = "less";
    } else {
      btn.textContent = moreLabel;
      btn.dataset.mode = "more";
    }
  }

  async function onClick(wrap, btn) {
    const total = Number(wrap.dataset.total || 0);
    const batch = Number(wrap.dataset.batch || 5);

    const moreLabel = wrap.dataset.moreLabel || "Load more";

    const shownNow = getProductItems().filter((li) => !li.classList.contains(HIDDEN)).length;

    // ✅ Nếu đang FULL => click là SHOW LESS (thu về đúng 2 hàng đầu)
    if (shownNow >= total && total > 0) {
      const cols = getCols();
      // Thu về: row1 = cols product, row2 = (cols - 2) product + banner span 2
      const collapseCount = Math.max(2 * cols - 2, 1);

      showOnlyFirstN(collapseCount);

      const shownAfter = getProductItems().filter((li) => !li.classList.contains(HIDDEN)).length;
      setCount(wrap, Math.min(shownAfter, total), total);

      // Sau khi thu xong thì nút quay lại "Load more"
      btn.textContent = moreLabel;
      btn.dataset.mode = "more";
      btn.disabled = false;
      return;
    }

    // ✅ Nếu chưa FULL => click là LOAD MORE
    btn.disabled = true;

    let added = revealBatch(batch);

    // nếu không còn hidden trong DOM mà chưa đủ total => fetch thêm rồi reveal tiếp
    if (added === 0) {
      const ok = await fetchNextPage(wrap);
      if (ok) added = revealBatch(batch);
    }

    // update count sau khi reveal xong (vì reveal chạy bằng setTimeout)
    const delay = batch * 90; // 80ms/card + buffer
    setTimeout(() => {
      const shownLater = getProductItems().filter((li) => !li.classList.contains(HIDDEN)).length;
      setCount(wrap, Math.min(shownLater, total), total);

      updateButtonState(wrap, btn);

      const stillHidden = getProductItems().some((li) => li.classList.contains(HIDDEN));
      const hasNext = !!wrap.dataset.nextUrl;

      btn.disabled = false;

      // nếu chưa full mà không còn gì để load/reveal => disable
      if (shownLater < total && !stillHidden && !hasNext) btn.disabled = true;
    }, delay);
  }

  function init() {
    const wrap = document.querySelector("[data-collection-reveal]");
    if (!wrap) return;

    const total = Number(wrap.dataset.total || 0);
    const initial = Number(wrap.dataset.initial || 12);

    // Ẩn bớt theo initial
    hideAfterInitial(initial);

    // Cập nhật count theo số đang hiện
    const shown = getProductItems().filter((li) => !li.classList.contains(HIDDEN)).length;
    setCount(wrap, Math.min(shown, total), total);

    const btn = wrap.querySelector("[data-reveal-btn]");
    if (!btn) return;

    // luôn hiện nút, trạng thái phụ thuộc full hay chưa
    btn.style.display = "";
    btn.disabled = false;

    updateButtonState(wrap, btn);

    btn.addEventListener("click", () => onClick(wrap, btn));
  }

  document.addEventListener("DOMContentLoaded", init);
})();
