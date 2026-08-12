import { getAll, getCicloAtivo, getRegistrosDaSessao } from '../db.js';
import { el, formatarDataBR } from '../utils/ui.js';
import { setTitulo, setAcoesTopo, navegar } from '../app.js';

export async function render(container) {
  setTitulo('Treino');
  setAcoesTopo(el('button', { class: 'icone-somente', onClick: () => navegar('#/backup') }, '🗄️'));

  const [cicloAtivo, sessoes, modelos, ciclos] = await Promise.all([
    getCicloAtivo(),
    getAll('sessoes'),
    getAll('modelosTreino'),
    getAll('ciclos'),
  ]);

  const modelosPorId = new Map(modelos.map((m) => [m.id, m]));
  const ciclosPorId = new Map(ciclos.map((c) => [c.id, c]));

  if (cicloAtivo) {
    container.appendChild(
      el('div', { class: 'cartao' }, [
        el('div', { class: 'linha-sub' }, 'Ciclo ativo'),
        el('div', { class: 'linha-titulo' }, cicloAtivo.nome),
        el('p', { class: 'dica' }, `Iniciado em ${formatarDataBR(cicloAtivo.data_inicio)}`),
        el('button', { class: 'primario bloco', onClick: () => navegar('#/sessao') }, '🏋️ Iniciar sessão de treino'),
      ])
    );
  } else {
    container.appendChild(
      el('div', { class: 'cartao' }, [
        el('div', { class: 'linha-titulo' }, 'Nenhum ciclo ativo'),
        el('p', { class: 'dica' }, 'Crie um ciclo para organizar seus treinos por período.'),
        el('button', { class: 'primario bloco', onClick: () => navegar('#/ciclos') }, 'Criar ciclo'),
      ])
    );
  }

  const recentes = sessoes
    .slice()
    .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id)
    .slice(0, 8);

  container.appendChild(el('h3', {}, 'Sessões recentes'));

  if (recentes.length === 0) {
    container.appendChild(el('div', { class: 'vazio' }, 'Nenhuma sessão registrada ainda.'));
    return;
  }

  for (const sessao of recentes) {
    const registros = await getRegistrosDaSessao(sessao.id);
    const modelo = sessao.modelo_treino_id ? modelosPorId.get(sessao.modelo_treino_id) : null;
    const ciclo = ciclosPorId.get(sessao.ciclo_id);

    container.appendChild(
      el(
        'div',
        {
          class: 'cartao clicavel',
          onClick: () => navegar(`#/sessao/${sessao.id}`),
        },
        [
          el('div', { class: 'linha' }, [
            el('div', { class: 'linha-titulo' }, modelo ? modelo.nome : 'Treino avulso'),
            el('span', { class: 'pill' }, formatarDataBR(sessao.data)),
          ]),
          el('div', { class: 'linha-sub' }, [
            ciclo ? ciclo.nome : '',
            ` · ${registros.length} série${registros.length === 1 ? '' : 's'}`,
          ]),
        ]
      )
    );
  }
}
