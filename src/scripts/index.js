import "../styles/index.css";
import { initSidebar } from "../components/sidebar.js";
import { initModal } from "../components/modal.js";
import { initScrollTop } from "../components/scroll-top.js";

// Удаляем импорт статичного объекта servicesData, теперь берем с сервера
export async function initHomeServices() {
    const grid = document.getElementById('services-grid');
    const template = document.getElementById('service-card-template');

    if (!grid || !template) return;

    try {
        // Делаем запрос к нашему API
        const response = await fetch('/api/services'); 
        const servicesData = await response.json();

        grid.innerHTML = '';

        servicesData.forEach(service => {
            const cardClone = template.content.cloneNode(true);

            // Обрати внимание: в базе поле называется image_url, а не image
            cardClone.querySelector('.service-card__image').src = service.image_url;
            cardClone.querySelector('.service-card__image').alt = service.name;
            cardClone.querySelector('.service-card__category').textContent = service.category || "Услуга";
            cardClone.querySelector('.service-card__name').textContent = service.name;
            cardClone.querySelector('.service-card__description').textContent = service.description;

            cardClone.querySelector('.service-card__link').href = `./pages/services.html?id=${service.id}`;

            grid.appendChild(cardClone);
        });
    } catch (error) {
        console.error("Ошибка при получении услуг с сервера:", error);
        grid.innerHTML = '<p>Не удалось загрузить данные. Пожалуйста, попробуйте позже.</p>';
    }
}

initSidebar();
initModal();
initHomeServices(); // Теперь это асинхронная функция
initScrollTop();