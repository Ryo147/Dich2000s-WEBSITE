/**
 * GradualBlur — vanilla JS port of the React Bits GradualBlur-JS-CSS component.
 * No external dependencies (the upstream doc claimed a `mathjs` dependency,
 * but the component doesn't reference mathjs anywhere — that line was dropped).
 *
 * Requires gradual-blur.css loaded on the page.
 *
 * Usage:
 *   <div id="blur-root"></div>
 *
 *   <script type="module">
 *     import { initGradualBlur } from './gradual-blur.js';
 *     initGradualBlur('#blur-root', {
 *       position: 'top',
 *       height: '6rem',
 *       target: 'page',
 *       strength: 2,
 *       divCount: 5,
 *       curve: 'bezier',
 *       exponential: true,
 *       opacity: 1,
 *     });
 *   </script>
 */

const DEFAULT_CONFIG = {
  position: 'bottom',
  strength: 2,
  height: '6rem',
  width: undefined,
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  animated: false,
  duration: '0.3s',
  easing: 'ease-out',
  opacity: 1,
  curve: 'linear',
  responsive: false,
  target: 'parent',
  hoverIntensity: undefined,
  className: '',
  style: {},
  preset: undefined,
  onAnimationComplete: undefined,
};

const PRESETS = {
  top: { position: 'top', height: '6rem' },
  bottom: { position: 'bottom', height: '6rem' },
  left: { position: 'left', height: '6rem' },
  right: { position: 'right', height: '6rem' },
  subtle: { height: '4rem', strength: 1, opacity: 0.8, divCount: 3 },
  intense: { height: '10rem', strength: 4, divCount: 8, exponential: true },
  smooth: { height: '8rem', curve: 'bezier', divCount: 10 },
  sharp: { height: '5rem', curve: 'linear', divCount: 4 },
  header: { position: 'top', height: '8rem', curve: 'ease-out' },
  footer: { position: 'bottom', height: '8rem', curve: 'ease-out' },
  sidebar: { position: 'left', height: '6rem', strength: 2.5 },
  'page-header': { position: 'top', height: '10rem', target: 'page', strength: 3 },
  'page-footer': { position: 'bottom', height: '10rem', target: 'page', strength: 3 },
};

const CURVE_FUNCTIONS = {
  linear: (p) => p,
  bezier: (p) => p * p * (3 - 2 * p),
  'ease-in': (p) => p * p,
  'ease-out': (p) => 1 - Math.pow(1 - p, 2),
  'ease-in-out': (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
};

const mergeConfigs = (...configs) => configs.reduce((acc, c) => ({ ...acc, ...c }), {});

const getGradientDirection = (position) =>
  ({ top: 'to top', bottom: 'to bottom', left: 'to left', right: 'to right' })[position] || 'to bottom';

const debounce = (fn, wait) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), wait);
  };
};

function el(tag, attrs = {}) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  return node;
}

/**
 * @param {string|HTMLElement} target - selector or element to mount into
 * @param {object} options - see DEFAULT_CONFIG / PRESETS above
 * @returns {{ destroy: () => void, update: (opts: object) => void, setHovered: (v: boolean) => void }}
 */
export function initGradualBlur(target, options = {}) {
  const root = typeof target === 'string' ? document.querySelector(target) : target;
  if (!root) throw new Error(`GradualBlur: target "${target}" not found`);

  let isHovered = false;
  let isVisible = options.animated !== 'scroll';
  let resizeHandler = null;
  let intersectionObserver = null;
  let completeTimer = null;

  const container = el('div');
  const inner = el('div', { class: 'gradual-blur-inner' });
  inner.style.position = 'relative';
  inner.style.width = '100%';
  inner.style.height = '100%';
  container.appendChild(inner);
  root.appendChild(container);

  function getConfig(opts) {
    const presetConfig = opts.preset && PRESETS[opts.preset] ? PRESETS[opts.preset] : {};
    return mergeConfigs(DEFAULT_CONFIG, presetConfig, opts);
  }

  let config = getConfig(options);

  function renderBlurDivs() {
    inner.innerHTML = '';
    const increment = 100 / config.divCount;
    const currentStrength =
      isHovered && config.hoverIntensity ? config.strength * config.hoverIntensity : config.strength;
    const curveFunc = CURVE_FUNCTIONS[config.curve] || CURVE_FUNCTIONS.linear;

    for (let i = 1; i <= config.divCount; i++) {
      let progress = i / config.divCount;
      progress = curveFunc(progress);

      let blurValue;
      if (config.exponential) {
        blurValue = Math.pow(2, progress * 4) * 0.0625 * currentStrength;
      } else {
        blurValue = 0.0625 * (progress * config.divCount + 1) * currentStrength;
      }

      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;

      const direction = getGradientDirection(config.position);
      const div = el('div');
      div.style.position = 'absolute';
      div.style.inset = '0';
      div.style.maskImage = `linear-gradient(${direction}, ${gradient})`;
      div.style.webkitMaskImage = `linear-gradient(${direction}, ${gradient})`;
      div.style.backdropFilter = `blur(${blurValue.toFixed(3)}rem)`;
      div.style.webkitBackdropFilter = `blur(${blurValue.toFixed(3)}rem)`;
      div.style.opacity = String(config.opacity);
      if (config.animated && config.animated !== 'scroll') {
        div.style.transition = `backdrop-filter ${config.duration} ${config.easing}`;
      }
      inner.appendChild(div);
    }
  }

  function applyResponsiveDimension(key) {
    if (!config.responsive) return config[key];
    const w = window.innerWidth;
    const cap = key[0].toUpperCase() + key.slice(1);
    let v = config[key];
    if (w <= 480 && config[`mobile${cap}`]) v = config[`mobile${cap}`];
    else if (w <= 768 && config[`tablet${cap}`]) v = config[`tablet${cap}`];
    else if (w <= 1024 && config[`desktop${cap}`]) v = config[`desktop${cap}`];
    return v;
  }

  function applyContainerStyle() {
    const isVertical = ['top', 'bottom'].includes(config.position);
    const isHorizontal = ['left', 'right'].includes(config.position);
    const isPageTarget = config.target === 'page';

    container.className = `gradual-blur ${isPageTarget ? 'gradual-blur-page' : 'gradual-blur-parent'} ${config.className || ''}`.trim();

    Object.assign(container.style, config.style || {});
    container.style.position = isPageTarget ? 'fixed' : 'absolute';
    container.style.pointerEvents = config.hoverIntensity ? 'auto' : 'none';
    container.style.opacity = isVisible ? '1' : '0';
    container.style.transition = config.animated ? `opacity ${config.duration} ${config.easing}` : '';
    container.style.zIndex = String(isPageTarget ? config.zIndex + 100 : config.zIndex);

    const responsiveHeight = applyResponsiveDimension('height');
    const responsiveWidth = applyResponsiveDimension('width');

    // reset positional props
    container.style.top = '';
    container.style.bottom = '';
    container.style.left = '';
    container.style.right = '';
    container.style.width = '';
    container.style.height = '';

    if (isVertical) {
      container.style.height = responsiveHeight;
      container.style.width = responsiveWidth || '100%';
      container.style[config.position] = '0';
      container.style.left = '0';
      container.style.right = '0';
    } else if (isHorizontal) {
      container.style.width = responsiveWidth || responsiveHeight;
      container.style.height = '100%';
      container.style[config.position] = '0';
      container.style.top = '0';
      container.style.bottom = '0';
    }
  }

  function render() {
    renderBlurDivs();
    applyContainerStyle();
  }

  function setupResponsive() {
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    if (!config.responsive) return;
    resizeHandler = debounce(() => applyContainerStyle(), 100);
    window.addEventListener('resize', resizeHandler);
  }

  function setupScrollReveal() {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
      intersectionObserver = null;
    }
    if (config.animated !== 'scroll') {
      isVisible = true;
      return;
    }
    isVisible = false;
    intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        applyContainerStyle();
        if (isVisible && config.onAnimationComplete) {
          clearTimeout(completeTimer);
          const ms = parseFloat(config.duration) * 1000;
          completeTimer = setTimeout(() => config.onAnimationComplete(), ms);
        }
      },
      { threshold: 0.1 }
    );
    intersectionObserver.observe(root);
  }

  if (config.hoverIntensity) {
    container.addEventListener('mouseenter', () => {
      isHovered = true;
      render();
    });
    container.addEventListener('mouseleave', () => {
      isHovered = false;
      render();
    });
  }

  render();
  setupResponsive();
  setupScrollReveal();

  return {
    update(newOptions) {
      config = getConfig({ ...options, ...newOptions });
      render();
      setupResponsive();
      setupScrollReveal();
    },
    setHovered(v) {
      isHovered = v;
      render();
    },
    destroy() {
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      if (intersectionObserver) intersectionObserver.disconnect();
      clearTimeout(completeTimer);
      container.remove();
    },
  };
}
