(function () {
    const storageKey = 'theme';
    const lightClass = 'light-mode';

    function getStoredTheme() {
        return localStorage.getItem(storageKey) === 'light' ? 'light' : 'dark';
    }

    function applyTheme(theme) {
        document.body.classList.toggle(lightClass, theme === 'light');

        document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
            button.textContent = theme === 'light' ? '☀️' : '🌙';
            button.setAttribute('aria-label', theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro');
        });

        localStorage.setItem(storageKey, theme);
    }

    function initThemeControls() {
        applyTheme(getStoredTheme());

        document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
            button.addEventListener('click', () => {
                const nextTheme = document.body.classList.contains(lightClass) ? 'dark' : 'light';
                applyTheme(nextTheme);
            });
        });

        document.querySelectorAll('[data-logout]').forEach((button) => {
            button.addEventListener('click', () => {
                window.location.href = 'login.html';
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initThemeControls);
    } else {
        initThemeControls();
    }
}());