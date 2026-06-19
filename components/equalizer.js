const Equalizer = (() => {
  const bands = [
    { freq: 60, label: '60Hz' },
    { freq: 170, label: '170Hz' },
    { freq: 310, label: '310Hz' },
    { freq: 600, label: '600Hz' },
    { freq: 1000, label: '1kHz' },
    { freq: 3000, label: '3kHz' },
    { freq: 6000, label: '6kHz' },
    { freq: 12000, label: '12kHz' },
  ];

  const presets = {
    flat:      [0, 0, 0, 0, 0, 0, 0, 0],
    bass:      [8, 6, 4, 1, 0, 0, 0, 0],
    treble:    [0, 0, 0, 0, 1, 4, 6, 8],
    vocal:     [-2, -1, 0, 3, 5, 4, 2, 0],
    rock:      [5, 4, 2, 0, -1, 2, 4, 5],
    pop:       [-1, 2, 4, 5, 4, 2, -1, -2],
    classical: [4, 3, 0, 0, 0, 0, 2, 4],
    jazz:      [3, 2, 0, 1, -1, 0, 2, 4],
  };

  let currentPreset = 'flat';

  function init(container) {
    container.innerHTML = '';
    bands.forEach((band, i) => {
      const div = document.createElement('div');
      div.className = 'eq-band';
      div.innerHTML = `
        <span class="eq-value">0dB</span>
        <input type="range" min="-12" max="12" value="0" data-index="${i}">
        <label>${band.label}</label>
      `;
      container.appendChild(div);

      const slider = div.querySelector('input');
      slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        div.querySelector('.eq-value').textContent = val + 'dB';
        applyGain(i, val);
        currentPreset = 'custom';
        document.querySelectorAll('.eq-preset').forEach(el => el.classList.remove('active'));
      });
    });

    document.querySelectorAll('.eq-preset').forEach(el => {
      el.addEventListener('click', () => {
        applyPreset(el.dataset.preset);
      });
    });
  }

  function applyGain(index, value) {
    const filters = Player.getEqFilters();
    if (filters[index]) {
      filters[index].gain.value = value;
    }
  }

  function applyPreset(name) {
    const values = presets[name];
    if (!values) return;
    currentPreset = name;

    document.querySelectorAll('.eq-preset').forEach(el => {
      el.classList.toggle('active', el.dataset.preset === name);
    });

    const sliders = document.querySelectorAll('.eq-band input');
    values.forEach((val, i) => {
      if (sliders[i]) {
        sliders[i].value = val;
        sliders[i].parentElement.querySelector('.eq-value').textContent = val + 'dB';
        applyGain(i, val);
      }
    });
  }

  function getCurrentPreset() { return currentPreset; }

  return { init, applyPreset, getCurrentPreset, bands, presets };
})();
