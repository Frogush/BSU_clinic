export function initScrollTop() {
    const scrollBtn = document.getElementById('scroll-to-top');

    if (!scrollBtn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            scrollBtn.classList.add('scroll-top_visible');
        } else {
            scrollBtn.classList.remove('scroll-top_visible');
        }
    });

    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}