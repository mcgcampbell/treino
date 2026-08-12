import { get, getHistoricoExercicio } from '../db.js';
import { el, formatarDataBR, limpar } from '../utils/ui.js';
import { criarBuscaExercicio } from '../utils/buscaExercicio.js';
import { desenharGraficoLinha } from '../utils/chart.js';
import { setTitulo, setAcoesTopo, navegar } from '../app.js';

let handlerResizeAtual = null;

export async function render(container, params) {
  const id = params && params[0] ? Number(params[0]) : null;
  if (id) {
    await renderExercicio(container, id);
  } else {
    await renderBusca(container);
  }
}

async function renderBusca(container) {
  setTitulo('Histórico');
  container.appendChild(el('p', { class: 'dica' }, 'Busque um exercício para ver a evolução de carga ao longo do tempo.'));
  container.appendChild(
    criarBuscaExercicio({
      placeholder: 'Buscar exercício…',
      excluirIds: () => [],
      aoSelecionar: (exercicio) => navegar(`#/historico/${exercicio.id}`),
    })
  );
}

async function renderExercicio(container, id) {
  const exercicio = await get('exercicios', id);
  if (!exercicio) {
    setTitulo('Exercício não encontrado');
    container.appendChild(el('div', { class: 'vazio' }, 'Este exercício não existe mais na biblioteca.'));
    return;
  }

  setTitulo(exercicio.nome);
  setAcoesTopo(el('button', { class: 'icone-somente', onClick: () => navegar('#/historico') }, '🔍'));

  const linhas = await getHistoricoExercicio(id);

  if (linhas.length === 0) {
    container.appendChild(el('div', { class: 'vazio' }, 'Nenhum registro ainda para este exercício.'));
    return;
  }

  const pontos = linhas.map((l) => ({
    x: formatarDataBR(l.sessao.data).slice(0, 5),
    y: l.registro.carga,
  }));

  const canvas = el('canvas', { class: 'grafico' });
  container.appendChild(el('div', { class: 'grafico-wrap' }, canvas));
  desenharGraficoLinha(canvas, pontos);

  if (handlerResizeAtual) window.removeEventListener('resize', handlerResizeAtual);
  handlerResizeAtual = () => desenharGraficoLinha(canvas, pontos);
  window.addEventListener('resize', handlerResizeAtual);

  const tabelaWrap = el('div', { class: 'tabela-wrap' });
  const tbody = el('tbody');
  const linhasOrdenadas = linhas.slice().reverse();
  for (const l of linhasOrdenadas) {
    tbody.appendChild(
      el('tr', {}, [
        el('td', {}, formatarDataBR(l.sessao.data)),
        el('td', {}, `${l.registro.carga}kg`),
        el('td', {}, `${l.registro.repeticoes}`),
        el('td', {}, l.cicloNome || '—'),
        el('td', {}, l.registro.observacao || ''),
      ])
    );
  }
  tabelaWrap.appendChild(
    el('table', {}, [
      el('thead', {}, el('tr', {}, [
        el('th', {}, 'Data'),
        el('th', {}, 'Carga'),
        el('th', {}, 'Reps'),
        el('th', {}, 'Ciclo'),
        el('th', {}, 'Obs.'),
      ])),
      tbody,
    ])
  );
  container.appendChild(tabelaWrap);
}
