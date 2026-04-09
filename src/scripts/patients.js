import "../styles/patients.css"
import { initSidebar } from "../components/sidebar.js";
import { patientsDocs } from "../components/data.js";
import { initScrollTop } from "../components/scroll-top.js";

initSidebar();

function renderPatientsDocs() {
    patientsDocs.forEach(section => {
        const sectionElement = document.getElementById(section.sectionId);
        if (!sectionElement) return;

        const listContainer = sectionElement.querySelector('.docs-section__list');
        if (!listContainer) return;

        listContainer.innerHTML = section.items.map((item, index) => `
            <article class="docs-item">
                <span class="docs-item__number">${index + 1}.</span>
                <p class="docs-item__title">${item.title}</p>
                <a href="${item.link}" class="docs-item__button">
                    <span class="docs-item__button-text">Перейти</span>
                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 10.2857L4.375 6L0 1.71429L0.875 0L7 6L0.875 12L0 10.2857Z" fill="#0061FF"/>
                    </svg>
                </a>
            </article>
        `).join('');
    });
}

renderPatientsDocs();
initScrollTop();