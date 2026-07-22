export const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function formatPrice(priceCents) {
  return (priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${rest}min`;
}

export function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Pequeno helper tipo "hyperscript" pra montar DOM sem inflar cada tela com
 * document.createElement encadeado — e sem cair na armadilha de innerHTML
 * com dado do usuário (strings viram text nodes, nunca são interpretadas
 * como HTML).
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value; // só para markup estático confiável
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'value' && 'value' in node) {
      node.value = value;
    } else if (key === 'checked') {
      node.checked = Boolean(value);
    } else if (key === 'disabled') {
      node.disabled = Boolean(value);
    } else {
      node.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(
      typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child,
    );
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function showError(container, message) {
  clear(container);
  container.classList.remove('hidden');
  container.appendChild(el('div', { class: 'error-box' }, message));
}

export function hideError(container) {
  container.classList.add('hidden');
  clear(container);
}

export function qs(params) {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') usp.set(key, value);
  }
  const str = usp.toString();
  return str ? `?${str}` : '';
}

export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
