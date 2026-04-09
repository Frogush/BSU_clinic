import "../styles/index.css";
import { initSidebar } from "../components/sidebar.js";
import { initModal } from "../components/modal.js";
import { servicesData } from '../components/data.js';
import { initScrollTop } from "../components/scroll-top.js";

export function initHomeServices() {
    const grid = document.getElementById('services-grid');
    const template = document.getElementById('service-card-template');

    if (!grid || !template) return;

    grid.innerHTML = '';

    servicesData.forEach(service => {
        const cardClone = template.content.cloneNode(true);

        cardClone.querySelector('.service-card__image').src = service.image;
        cardClone.querySelector('.service-card__image').alt = service.name;
        cardClone.querySelector('.service-card__category').textContent = service.category || "Услуга";
        cardClone.querySelector('.service-card__name').textContent = service.name;
        cardClone.querySelector('.service-card__description').textContent = service.description;

        cardClone.querySelector('.service-card__link').href = `./pages/services.html?id=${service.id}`;

        grid.appendChild(cardClone);
    });
}

initSidebar();
initModal();
initHomeServices();
initScrollTop();