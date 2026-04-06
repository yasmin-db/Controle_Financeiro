const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

const currentTheme = localStorage.getItem('theme') || 'dark';
if (currentTheme === 'light') {
    body.classList.add('light-mode');
    themeToggle.textContent = '☀️';
} else {
    themeToggle.textContent = '🌙';
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('light-mode');
    const isLight = body.classList.contains('light-mode');
    themeToggle.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

const diaSelect = document.getElementById('dia');
for (let i = 1; i <= 31; i += 1) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    diaSelect.appendChild(option);
}

const anoSelect = document.getElementById('ano');
const currentYear = new Date().getFullYear();
for (let i = currentYear; i >= 1950; i -= 1) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    anoSelect.appendChild(option);
}

const paisSelect = document.getElementById('pais');
const celularInput = document.getElementById('celular');

const phoneFormats = {
    BR: { mask: '(xx) xxxxx-xxxx', placeholder: '(11) 99999-9999' },
    US: { mask: '(xxx) xxx-xxxx', placeholder: '(123) 456-7890' },
    PT: { mask: 'xxx xxx xxx', placeholder: '912 345 678' },
    AR: { mask: 'xx xxxx-xxxx', placeholder: '11 1234-5678' },
    MX: { mask: 'xx xxxx xxxx', placeholder: '55 1234 5678' }
};

function formatPhone(value, mask) {
    let result = '';
    let valueIndex = 0;
    for (let i = 0; i < mask.length; i += 1) {
        if (mask[i] === 'x') {
            if (valueIndex < value.length) {
                result += value[valueIndex];
                valueIndex += 1;
            }
        } else {
            result += mask[i];
        }
    }
    return result;
}

paisSelect.addEventListener('change', () => {
    const country = paisSelect.value;
    if (phoneFormats[country]) {
        celularInput.placeholder = phoneFormats[country].placeholder;
        celularInput.value = '';
    }
});

celularInput.addEventListener('input', (e) => {
    const country = paisSelect.value;
    if (phoneFormats[country]) {
        const mask = phoneFormats[country].mask;
        const rawValue = e.target.value.replace(/\D/g, '');
        e.target.value = formatPhone(rawValue, mask);
    }
});

document.querySelector('.signup-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const sharedFinance = document.getElementById('shared-finance').value;
    localStorage.setItem('sharedFinance', sharedFinance);

    window.location.href = 'login.html';
});