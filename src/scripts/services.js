import "../styles/services.css"
import { servicesData } from '../components/news_data.js';

const categoryList = document.querySelector('.services-prices__category-list');
const detailsContainer = document.getElementById('service-details');
const mobileBtn = document.querySelector('.services-prices__mobile-selector');
const selectedNameSpan = document.querySelector('.services-prices__selected-name');

let currentCategoryId = servicesData[0].id;

function renderCategories() {
  categoryList.innerHTML = servicesData.map(cat => `
    <li>
      <button class="services-prices__category-item ${cat.id === currentCategoryId ? 'services-prices__category-item_active' : ''}" 
              data-id="${cat.id}">
        ${cat.name}
      </button>
    </li>
  `).join('');

  document.querySelectorAll('.services-prices__category-item').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategoryId = btn.dataset.id;
      const category = servicesData.find(c => c.id === currentCategoryId);
      selectedNameSpan.textContent = category.name;
      categoryList.classList.remove('services-prices__category-list_opened');
      updateDetails();
      renderCategories();
    });
  });
}

function updateDetails() {
  const data = servicesData.find(item => item.id === currentCategoryId);
  
  detailsContainer.innerHTML = `
    <h2 class="service-detail__title">${data.name}</h2>
    <div class="service-detail__image-box">
      <img class="service-detail__image" src="${data.image}" alt="${data.name}">
    </div>
    <p class="service-detail__desc">${data.description}</p>
    <div class="price-table">
      <div class="price-table__header">
        <span>Наименование услуги</span>
        <span>Стоимость*</span>
      </div>
      ${data.prices.map(p => `
        <div class="price-table__row">
          <span class="price-table__name">${p.label}</span>
          <span class="price-table__cost" title="${p.cost}">${p.cost}</span>
        </div>
      `).join('')}
    </div>
    <p class="service-detail__note">* Стоимость, указанная на сайте, носит информационный характер и не является публичной офертой.</p>
  `;
}

mobileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  categoryList.classList.toggle('services-prices__category-list_opened');
});

window.addEventListener('click', () => {
  categoryList.classList.remove('services-prices__category-list_opened');
});

renderCategories();
updateDetails();

const burger = document.querySelector('.header__burger');
const sidebar = document.querySelector('.header__sidebar');
const sidebarOverlay = document.querySelector('.header__overlay');
const sidebarClose = document.querySelector('.header__sidebar-close');
const page = document.querySelector('.page');

function openMenu() {
  sidebar.classList.add('header__sidebar_opened');
  sidebarOverlay.classList.add('header__overlay_active');
  page.style.overflow = 'hidden';
}

function closeMenu() {
  sidebar.classList.remove('header__sidebar_opened');
  sidebarOverlay.classList.remove('header__overlay_active');
  page.style.overflow = '';
}

burger.addEventListener('click', openMenu);
sidebarClose.addEventListener('click', closeMenu);
sidebarOverlay.addEventListener('click', closeMenu);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMenu();
  }
});