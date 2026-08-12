import { limpar } from './utils/ui.js';

const appEl = document.getElementById('app');
const tituloEl = document.getElementById('titulo-pagina');
const acoesTopoEl = document.getElementById('acoes-topo');

export function setTitulo(texto) {
  tituloEl.textContent = texto;
}

export function setAcoesTopo(node) {
  acoesTopoEl.innerHTML = '';
  if (node) acoesTopoEl.appendChild(node);
}

export function navegar(hash) {
  if (location.hash === hash) {
    roteirizar();
  } else {
    location.hash = hash;
  }
}

const rotas = [
  { padrao: /^\/$/, modulo: () => import('./views/inicio.js'), rota: '/' },
  { padrao: /^\/sessao$/, modulo: () => import('./views/sessao.js'), rota: '/sessao' },
  { padrao: /^\/sessao\/(\d+)$/, modulo: () => import('./views/sessao.js'), rota: '/sessao' },
  { padrao: /^\/ciclos$/, modulo: () => import('./views/ciclos.js'), rota: '/ciclos' },
  { padrao: /^\/ciclos\/(\d+)$/, modulo: () => import('./views/ciclos.js'), rota: '/ciclos' },
  { padrao: /^\/modelos\/(\d+)$/, modulo: () => import('./views/modelos.js'), rota: '/ciclos' },
  { padrao: /^\/exercicios$/, modulo: () => import('./views/exercicios.js'), rota: '/exercicios' },
  { padrao: /^\/historico$/, modulo: () => import('./views/historico.js'), rota: '/historico' },
  { padrao: /^\/historico\/(\d+)$/, modulo: () => import('./views/historico.js'), rota: '/historico' },
  { padrao: /^\/backup$/, modulo: () => import('./views/backup.js'), rota: '/backup' },
];

async function roteirizar() {
  const caminho = (location.hash || '#/').slice(1) || '/';
  const encontrada = rotas.find((r) => r.padrao.test(caminho));

  document.querySelectorAll('nav.rodape a').forEach((a) => {
    a.classList.toggle('ativo', a.dataset.rota === (encontrada ? encontrada.rota : ''));
  });

  if (!encontrada) {
    limpar(appEl);
    setTitulo('Não encontrado');
    appEl.appendChild(document.createTextNode('Página não encontrada.'));
    return;
  }

  const match = caminho.match(encontrada.padrao);
  const params = match.slice(1);

  try {
    const mod = await encontrada.modulo();
    limpar(appEl);
    setAcoesTopo(null);
    await mod.render(appEl, params);
  } catch (err) {
    console.error(err);
    limpar(appEl);
    appEl.textContent = 'Erro ao carregar a página: ' + err.message;
  }
}

window.addEventListener('hashchange', roteirizar);
window.addEventListener('DOMContentLoaded', roteirizar);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = location.pathname.replace(/[^/]*$/, '');
    navigator.serviceWorker.register(base + 'service-worker.js').catch((err) => {
      console.warn('Falha ao registrar service worker', err);
    });
  });
}
