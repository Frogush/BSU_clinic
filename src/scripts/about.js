import "../styles/about.css"
import { initSidebar } from "../components/sidebar.js";
import { clinicContacts } from "../components/data.js";
import { initScrollTop } from "../components/scroll-top.js";

initSidebar();

document.querySelectorAll('.discounts__header').forEach(header => {
    header.addEventListener('click', () => {
        const item = header.closest('.discounts__item');
        item.classList.toggle('discounts__item_opened');
        const isOpened = item.classList.contains('discounts__item_opened');
        header.setAttribute('aria-expanded', isOpened ? 'true' : 'false');
    });
});

function getGroupedSchedule(schedule) {
    if (!schedule || schedule.length === 0) return [];

    const groups = [];
    let currentGroup = null;

    schedule.forEach((item, index) => {
        if (!currentGroup || currentGroup.hours !== item.hours || currentGroup.isOff !== item.isOff) {
            currentGroup = {
                startDay: item.day,
                endDay: item.day,
                hours: item.hours,
                isOff: item.isOff
            };
            groups.push(currentGroup);
        } else {
            currentGroup.endDay = item.day;
        }
    });

    return groups.map(group => {
        const dayRange = group.startDay === group.endDay 
            ? group.startDay 
            : `${group.startDay}-${group.endDay}`;
        
        return {
            label: group.isOff ? "Выходные дни" : "Рабочие дни",
            days: dayRange,
            time: group.hours
        };
    });
}

function renderClinicInfo() {
    const infoSection = document.querySelector('.contacts-info');
    if (!infoSection) return;

    const phoneList = infoSection.querySelector('.contacts-info__list');
    if (phoneList) {
        phoneList.innerHTML = clinicContacts.phones.map(phone => `
            <li class="contacts-info__list-item">т. ${phone.value} — ${phone.label}</li>
        `).join('');
    }

    const scheduleCard = infoSection.querySelectorAll('.contacts-info__card')[1];
    const scheduleContent = scheduleCard?.querySelector('.contacts-info__content');

    if (scheduleContent) {
        const groupedData = getGroupedSchedule(clinicContacts.weekSchedule);
        
        scheduleContent.innerHTML = groupedData.map(group => `
            <p class="contacts-info__text">
                ${group.label}: ${group.days} 
                ${group.time !== '-' ? `<br> ${group.time}` : ''}
            </p>
        `).join('');
    }
}

renderClinicInfo();
initScrollTop();