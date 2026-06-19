const ThemeManager = (() => {
  const themes = ['dark', 'light', 'spotify', 'neon', 'cyberpunk', 'ocean'];
  let current = localStorage.getItem('auralis-theme') || 'dark';

  function apply(theme) {
    if (!themes.includes(theme)) return;
    current = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('auralis-theme', theme);
    document.querySelectorAll('.theme-option').forEach(el => {
      el.classList.toggle('active', el.dataset.theme === theme);
    });
  }

  function init() {
    apply(current);
    document.querySelectorAll('.theme-option').forEach(el => {
      el.addEventListener('click', () => apply(el.dataset.theme));
    });
  }

  function getCurrent() { return current; }

  return { init, apply, getCurrent, themes };
})();
