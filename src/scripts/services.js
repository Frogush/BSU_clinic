import "../styles/services.css"
import { initSidebar } from "../components/sidebar.js";
import { initScrollTop } from "../components/scroll-top.js";

initSidebar();

const categoryList = document.querySelector('.services-prices__category-list');
const detailsContainer = document.getElementById('service-details');
const mobileBtn = document.querySelector('.services-prices__mobile-selector');
const selectedNameSpan = document.querySelector('.services-prices__selected-name');

// Переменные для данных
let servicesData = [];
const urlParams = new URLSearchParams(window.location.search);
// Извлекаем ID из ссылки. Если его нет, поставим null (выберем первый позже)
let currentCategoryId = urlParams.get('id');

// ГЛАВНАЯ ФУНКЦИЯ ЗАГРУЗКИ
async function initServicesPage() {
    try {
        const response = await fetch('/api/services');
        servicesData = await response.json();

        if (servicesData.length > 0) {
            // Если в URL был ID, превращаем его в число. Если нет — берем ID первого элемента
            currentCategoryId = currentCategoryId ? Number(currentCategoryId) : servicesData[0].id;

            renderCategories();
            updateDetails();
        }
    } catch (error) {
        console.error("Ошибка загрузки услуг:", error);
        if (detailsContainer) detailsContainer.innerHTML = '<p>Ошибка связи с сервером</p>';
    }
}

function renderCategories() {
    if (!categoryList) return;

    categoryList.innerHTML = servicesData.map(cat => `
        <li>
            <button class="services-prices__category-item ${cat.id === currentCategoryId ? 'services-prices__category-item_active' : ''}" 
                    data-id="${cat.id}" type="button">
                ${cat.name}
            </button>
        </li>
    `).join('');

    document.querySelectorAll('.services-prices__category-item').forEach(btn => {
        btn.addEventListener('click', () => {
            // При клике записываем ID как число
            currentCategoryId = Number(btn.dataset.id);

            history.pushState(null, "", `?id=${currentCategoryId}`);
            
            updateDetails();
            renderCategories();
            
            categoryList.classList.remove('services-prices__category-list_opened');
        });
    });
}

function updateDetails() {
    if (!detailsContainer) return;

    // Ищем нужную категорию в массиве
    const data = servicesData.find(item => item.id === currentCategoryId) || servicesData[0];
    
    if (selectedNameSpan) selectedNameSpan.textContent = data.name;

    detailsContainer.innerHTML = `
        <h2 class="service-detail__title">${data.name}</h2>
        <div class="service-detail__image-box">
            <img class="service-detail__image" src="${data.image_url}" alt="${data.name}">
        </div>
        <p class="service-detail__desc">${data.description}</p>
        <div class="price-table">
            <div class="price-table__header">
                <span>Наименование услуги</span>
                <span>Стоимость*</span>
            </div>
            ${data.prices.map(p => {
                // Если цена 0 или null (мы так помечали "Уточняйте"), выводим текст
                const priceDisplay = (p.cost === 0 || p.cost === null) ? "Уточняйте" : `${p.cost} р.`;
                
                return `
                    <div class="price-table__row">
                        <span class="price-table__name">${p.label}</span>
                        <span class="price-table__cost" title="${priceDisplay}">${priceDisplay}</span>
                    </div>
                `;
            }).join('')}
        </div>
        <p class="service-detail__note">* Стоимость, указанная на сайте, носит информационный характер и не является публичной офертой.</p>
    `;
}

// Мобильное меню
if (mobileBtn) {
    mobileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        categoryList.classList.toggle('services-prices__category-list_opened');
    });
}

window.addEventListener('click', () => {
    categoryList?.classList.remove('services-prices__category-list_opened');
});

// Запуск
initServicesPage();
initScrollTop();