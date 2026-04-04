import "../styles/index.css"

document.addEventListener('DOMContentLoaded', () => {
    const burgerBtn = document.getElementById('burger-btn');
    const mobileDrawer = document.getElementById('mobile-drawer');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const body = document.body;

    const toggleMenu = () => {
        burgerBtn.classList.toggle('header__burger_active');
        mobileDrawer.classList.toggle('header__drawer_active');
        mobileOverlay.classList.toggle('header__overlay_active');
        
        if (mobileDrawer.classList.contains('header__drawer_active')) {
            body.style.overflow = 'hidden';
        } else {
            body.style.overflow = '';
        }
    };

    burgerBtn.addEventListener('click', toggleMenu);
    mobileOverlay.addEventListener('click', toggleMenu);

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1440 && mobileDrawer.classList.contains('header__drawer_active')) {
            burgerBtn.classList.remove('header__burger_active');
            mobileDrawer.classList.remove('header__drawer_active');
            mobileOverlay.classList.remove('header__overlay_active');
            body.style.overflow = '';
        }
    });
});