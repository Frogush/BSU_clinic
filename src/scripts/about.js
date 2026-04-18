import "../styles/about.css"
import { initSidebar } from "../components/sidebar.js";
import { initScrollTop } from "../components/scroll-top.js";

initSidebar();

// Переменная для хранения полученных данных
let clinicContacts = {
    phones: [],
    weekSchedule: []
};

// Аккордеоны (скидки) — оставляем без изменений
document.querySelectorAll('.discounts__header').forEach(header => {
    header.addEventListener('click', () => {
        const item = header.closest('.discounts__item');
        item.classList.toggle('discounts__item_opened');
        const isOpened = item.classList.contains('discounts__item_opened');
        header.setAttribute('aria-expanded', isOpened ? 'true' : 'false');
    });
});

// ГЛАВНАЯ ФУНКЦИЯ ЗАГРУЗКИ
async function initAboutPage() {
    try {
        const response = await fetch('/api/contacts');
        const data = await response.json();
        
        // В базе расписание называется schedule, переложим в нашу переменную
        clinicContacts.phones = data.phones;
        clinicContacts.weekSchedule = data.schedule;

        renderClinicInfo();
    } catch (error) {
        console.error("Ошибка при получении контактов:", error);
    }
}

// Улучшенная функция группировки (адаптирована под БД)
function getGroupedSchedule(schedule) {
    if (!schedule || schedule.length === 0) return [];

    const groups = [];
    let currentGroup = null;

    schedule.forEach((item) => {
        // Формируем строку времени для сравнения (например "08:00-18:00" или "-")
        const timeString = item.is_off ? "-" : `${item.start_time}-${item.end_time}`;
        
        // Если это первый день или время работы изменилось — создаем новую группу
        if (!currentGroup || currentGroup.timeString !== timeString) {
            currentGroup = {
                startDay: item.day_name,
                endDay: item.day_name,
                timeString: timeString,
                isOff: Boolean(item.is_off)
            };
            groups.push(currentGroup);
        } else {
            // Если время такое же — просто продлеваем текущую группу (например, ПН-ПТ)
            currentGroup.endDay = item.day_name;
        }
    });

    return groups.map(group => {
        const dayRange = group.startDay === group.endDay 
            ? group.startDay 
            : `${group.startDay}-${group.endDay}`;
        
        return {
            label: group.isOff ? "Выходные дни" : "Рабочие дни",
            days: dayRange,
            time: group.timeString
        };
    });
}

function renderClinicInfo() {
    const infoSection = document.querySelector('.contacts-info');
    if (!infoSection) return;

    // Отрисовка телефонов
    const phoneList = infoSection.querySelector('.contacts-info__list');
    if (phoneList) {
        phoneList.innerHTML = clinicContacts.phones.map(phone => `
            <li class="contacts-info__list-item">т. ${phone.value} — ${phone.label}</li>
        `).join('');
    }

    // Отрисовка расписания
    const scheduleCard = infoSection.querySelectorAll('.contacts-info__card')[1];
    const scheduleContent = scheduleCard?.querySelector('.contacts-info__content');

    if (scheduleContent) {
        const groupedData = getGroupedSchedule(clinicContacts.weekSchedule);
        
        scheduleContent.innerHTML = groupedData.map(group => `
            <p class="contacts-info__text">
                <strong>${group.label}:</strong> ${group.days} 
                ${group.time !== '-' ? `<br> ${group.time}` : ''}
            </p>
        `).join('');
    }
}

// Запускаем загрузку
initAboutPage();
initScrollTop();