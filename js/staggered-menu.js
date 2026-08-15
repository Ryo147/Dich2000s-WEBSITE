/**
 * StaggeredMenu — vanilla JS port of the React Bits StaggeredMenu-JS-CSS component.
 *
 * Requires:
 *  1. staggered-menu.css loaded on the page
 *  2. GSAP loaded globally BEFORE this script (e.g. via CDN):
 *     <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js"></script>
 *
 * Usage:
 *   <div id="menu-root"></div>
 *
 *   <script type="module">
 *     import { initStaggeredMenu } from './staggered-menu.js';
 *
 *     initStaggeredMenu('#menu-root', {
 *       position: 'right',
 *       items: [
 *         { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
 *         { label: 'About', ariaLabel: 'Learn about us', link: '/about' },
 *       ],
 *       socialItems: [
 *         { label: 'Twitter', link: 'https://twitter.com' },
 *       ],
 *       displaySocials: true,
 *       displayItemNumbering: true,
 *       menuButtonColor: '#fff',
 *       openMenuButtonColor: '#fff',
 *       changeMenuColorOnOpen: true,
 *       colors: ['#B497CF', '#5227FF'],
 *       logoUrl: '/path-to-your-logo.svg',
 *       accentColor: '#ff6b6b',
 *       isFixed: true,
 *       closeOnClickAway: true,
 *       onMenuOpen: () => console.log('Menu opened'),
 *       onMenuClose: () => console.log('Menu closed'),
 *     });
 *   </script>
 */

const DEFAULTS = {
  position: 'right',
  colors: ['#B497CF', '#5227FF'],
  items: [],
  socialItems: [],
  displaySocials: true,
  displayItemNumbering: true,
  logoUrl: '/src/assets/logos/reactbits-gh-white.svg',
  menuButtonColor: '#fff',
  openMenuButtonColor: '#fff',
  accentColor: '#5227FF',
  changeMenuColorOnOpen: true,
  isFixed: false,
  closeOnClickAway: true,
  onMenuOpen: null,
  onMenuClose: null,
};

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  children.forEach((c) => node.appendChild(c));
  return node;
}

/**
 * @param {string|HTMLElement} target - selector or element to mount into
 * @param {object} options - see DEFAULTS above
 * @returns {{ open: () => void, close: () => void, toggle: () => void, destroy: () => void }}
 */
export function initStaggeredMenu(target, options = {}) {
  if (typeof window.gsap === 'undefined') {
    throw new Error('StaggeredMenu: gsap not found on window. Load GSAP via CDN before this script.');
  }
  const gsap = window.gsap;

  const root = typeof target === 'string' ? document.querySelector(target) : target;
  if (!root) throw new Error(`StaggeredMenu: target "${target}" not found`);

  const opts = { ...DEFAULTS, ...options };

  let open = false;
  let busy = false;
  let textLines = ['Menu', 'Close'];

  // ---- build DOM ----
  const wrapper = el('div', {
    class: 'staggered-menu-wrapper' + (opts.isFixed ? ' fixed-wrapper' : ''),
    'data-position': opts.position,
  });
  if (opts.accentColor) wrapper.style.setProperty('--sm-accent', opts.accentColor);

  const preLayers = el('div', { class: 'sm-prelayers', 'aria-hidden': 'true' });
  const rawColors = opts.colors && opts.colors.length ? opts.colors.slice(0, 4) : ['#1e1e22', '#35353c'];
  let layerColors = [...rawColors];
  if (layerColors.length >= 3) {
    const mid = Math.floor(layerColors.length / 2);
    layerColors.splice(mid, 1);
  }
  const preLayerEls = layerColors.map((c) => {
    const layer = el('div', { class: 'sm-prelayer' });
    layer.style.background = c;
    return layer;
  });
  preLayerEls.forEach((l) => preLayers.appendChild(l));

  const header = el('header', { class: 'staggered-menu-header', 'aria-label': 'Main navigation header' });
  const logoWrap = el('div', { class: 'sm-logo', 'aria-label': 'Logo' });
  const logoImg = el('img', {
    src: opts.logoUrl || '/src/assets/logos/reactbits-gh-white.svg',
    alt: 'Logo',
    class: 'sm-logo-img',
    draggable: 'false',
    width: '110',
    height: '24',
  });
  logoWrap.appendChild(logoImg);

  const toggleBtn = el('button', {
    class: 'sm-toggle',
    'aria-label': 'Open menu',
    'aria-expanded': 'false',
    'aria-controls': 'staggered-menu-panel',
    type: 'button',
  });
  const textWrap = el('span', { class: 'sm-toggle-textWrap', 'aria-hidden': 'true' });
  const textInner = el('span', { class: 'sm-toggle-textInner' });
  function renderTextLines() {
    textInner.innerHTML = '';
    textLines.forEach((l) => {
      textInner.appendChild(el('span', { class: 'sm-toggle-line' }, [document.createTextNode(l)]));
    });
  }
  renderTextLines();
  textWrap.appendChild(textInner);

  const icon = el('span', { class: 'sm-icon', 'aria-hidden': 'true' });
  const plusH = el('span', { class: 'sm-icon-line' });
  const plusV = el('span', { class: 'sm-icon-line sm-icon-line-v' });
  icon.appendChild(plusH);
  icon.appendChild(plusV);

  toggleBtn.appendChild(textWrap);
  toggleBtn.appendChild(icon);

  header.appendChild(logoWrap);
  header.appendChild(toggleBtn);

  const panel = el('aside', {
    id: 'staggered-menu-panel',
    class: 'staggered-menu-panel',
    'aria-hidden': 'true',
  });
  const panelInner = el('div', { class: 'sm-panel-inner' });
  const panelList = el('ul', { class: 'sm-panel-list', role: 'list' });
  if (opts.displayItemNumbering) panelList.setAttribute('data-numbering', '');

  if (opts.items && opts.items.length) {
    opts.items.forEach((it, idx) => {
      const li = el('li', { class: 'sm-panel-itemWrap' });
      const a = el('a', {
        class: 'sm-panel-item',
        href: it.link,
        'aria-label': it.ariaLabel,
        'data-index': String(idx + 1),
      });
      const label = el('span', { class: 'sm-panel-itemLabel' }, [document.createTextNode(it.label)]);
      a.appendChild(label);
      li.appendChild(a);
      panelList.appendChild(li);
    });
  } else {
    const li = el('li', { class: 'sm-panel-itemWrap', 'aria-hidden': 'true' });
    const span = el('span', { class: 'sm-panel-item' }, [
      el('span', { class: 'sm-panel-itemLabel' }, [document.createTextNode('No items')]),
    ]);
    li.appendChild(span);
    panelList.appendChild(li);
  }
  panelInner.appendChild(panelList);

  if (opts.displaySocials && opts.socialItems && opts.socialItems.length > 0) {
    const socials = el('div', { class: 'sm-socials', 'aria-label': 'Social links' });
    socials.appendChild(el('h3', { class: 'sm-socials-title' }, [document.createTextNode('Socials')]));
    const list = el('ul', { class: 'sm-socials-list', role: 'list' });
    opts.socialItems.forEach((s) => {
      const li = el('li', { class: 'sm-socials-item' });
      const a = el('a', {
        href: s.link,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: 'sm-socials-link',
      }, [document.createTextNode(s.label)]);
      li.appendChild(a);
      list.appendChild(li);
    });
    socials.appendChild(list);
    panelInner.appendChild(socials);
  }
  panel.appendChild(panelInner);

  wrapper.appendChild(preLayers);
  wrapper.appendChild(header);
  wrapper.appendChild(panel);
  root.appendChild(wrapper);

  // ---- initial GSAP state ----
  const offscreen = opts.position === 'left' ? -100 : 100;
  gsap.set([panel, ...preLayerEls], { xPercent: offscreen, opacity: 1 });
  gsap.set(preLayers, { xPercent: 0, opacity: 1 });
  gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
  gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
  gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
  gsap.set(textInner, { yPercent: 0 });
  gsap.set(toggleBtn, { color: opts.menuButtonColor });

  // ---- timelines / tweens ----
  let openTl = null;
  let closeTween = null;
  let spinTween = null;
  let textCycleAnim = null;
  let colorTween = null;

  function buildOpenTimeline() {
    openTl?.kill();
    closeTween?.kill();
    closeTween = null;

    const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
    const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
    const socialTitle = panel.querySelector('.sm-socials-title');
    const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));

    const off = opts.position === 'left' ? -100 : 100;

    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
    if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
    if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    preLayerEls.forEach((layer, i) => {
      tl.fromTo(layer, { xPercent: off }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });
    const lastTime = preLayerEls.length ? (preLayerEls.length - 1) * 0.07 : 0;
    const panelInsertTime = lastTime + (preLayerEls.length ? 0.08 : 0);
    const panelDuration = 0.65;
    tl.fromTo(panel, { xPercent: off }, { xPercent: 0, duration: panelDuration, ease: 'power4.out' }, panelInsertTime);

    if (itemEls.length) {
      const itemsStart = panelInsertTime + panelDuration * 0.15;
      tl.to(itemEls, {
        yPercent: 0,
        rotate: 0,
        duration: 1,
        ease: 'power4.out',
        stagger: { each: 0.1, from: 'start' },
      }, itemsStart);
      if (numberEls.length) {
        tl.to(numberEls, {
          duration: 0.6,
          ease: 'power2.out',
          '--sm-num-opacity': 1,
          stagger: { each: 0.08, from: 'start' },
        }, itemsStart + 0.1);
      }
    }

    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.4;
      if (socialTitle) {
        tl.to(socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart);
      }
      if (socialLinks.length) {
        tl.to(socialLinks, {
          y: 0,
          opacity: 1,
          duration: 0.55,
          ease: 'power3.out',
          stagger: { each: 0.08, from: 'start' },
          onComplete: () => gsap.set(socialLinks, { clearProps: 'opacity' }),
        }, socialsStart + 0.04);
      }
    }

    openTl = tl;
    return tl;
  }

  function playOpen() {
    if (busy) return;
    busy = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => { busy = false; });
      tl.play(0);
    } else {
      busy = false;
    }
  }

  function playClose() {
    openTl?.kill();
    openTl = null;

    const all = [...preLayerEls, panel];
    closeTween?.kill();
    const off = opts.position === 'left' ? -100 : 100;
    closeTween = gsap.to(all, {
      xPercent: off,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
        if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
        const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
        if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
        const socialTitle = panel.querySelector('.sm-socials-title');
        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });
        busy = false;
      },
    });
  }

  function animateIcon(opening) {
    spinTween?.kill();
    spinTween = opening
      ? gsap.to(icon, { rotate: 225, duration: 0.8, ease: 'power4.out', overwrite: 'auto' })
      : gsap.to(icon, { rotate: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
  }

  function animateColor(opening) {
    colorTween?.kill();
    if (opts.changeMenuColorOnOpen) {
      const targetColor = opening ? opts.openMenuButtonColor : opts.menuButtonColor;
      colorTween = gsap.to(toggleBtn, { color: targetColor, delay: 0.18, duration: 0.3, ease: 'power2.out' });
    } else {
      gsap.set(toggleBtn, { color: opts.menuButtonColor });
    }
  }

  function animateText(opening) {
    textCycleAnim?.kill();
    const currentLabel = opening ? 'Menu' : 'Close';
    const targetLabel = opening ? 'Close' : 'Menu';
    const cycles = 3;
    const seq = [currentLabel];
    let last = currentLabel;
    for (let i = 0; i < cycles; i++) {
      last = last === 'Menu' ? 'Close' : 'Menu';
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);
    textLines = seq;
    renderTextLines();

    gsap.set(textInner, { yPercent: 0 });
    const lineCount = seq.length;
    const finalShift = ((lineCount - 1) / lineCount) * 100;
    textCycleAnim = gsap.to(textInner, {
      yPercent: -finalShift,
      duration: 0.5 + lineCount * 0.07,
      ease: 'power4.out',
    });
  }

  function setOpenState(next) {
    open = next;
    wrapper.toggleAttribute('data-open', open);
    toggleBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggleBtn.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
  }

  function doOpen() {
    if (open) return;
    setOpenState(true);
    opts.onMenuOpen?.();
    playOpen();
    animateIcon(true);
    animateColor(true);
    animateText(true);
  }

  function doClose() {
    if (!open) return;
    setOpenState(false);
    opts.onMenuClose?.();
    playClose();
    animateIcon(false);
    animateColor(false);
    animateText(false);
  }

  function toggleMenu() {
    open ? doClose() : doOpen();
  }

  toggleBtn.addEventListener('click', toggleMenu);

  function handleClickOutside(e) {
    if (!opts.closeOnClickAway || !open) return;
    if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
      doClose();
    }
  }
  document.addEventListener('mousedown', handleClickOutside);

  return {
    open: doOpen,
    close: doClose,
    toggle: toggleMenu,
    destroy() {
      toggleBtn.removeEventListener('click', toggleMenu);
      document.removeEventListener('mousedown', handleClickOutside);
      openTl?.kill();
      closeTween?.kill();
      spinTween?.kill();
      textCycleAnim?.kill();
      colorTween?.kill();
      wrapper.remove();
    },
  };
}
