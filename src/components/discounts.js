export function initDiscounts() {
  const headers = document.querySelectorAll('.discounts__header');

  if (headers.length === 0) return;

  headers.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.discounts__item');
      if (!item) return;

      const isOpened = item.classList.contains('discounts__item_opened');
      
      if (isOpened) {
        item.classList.remove('discounts__item_opened');
        header.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('discounts__item_opened');
        header.setAttribute('aria-expanded', 'true');
      }
    });
  });
}