import {
  get,
  add,
  put,
  remove,
  getAll,
  getModelosDoCiclo,
  getRegistrosDaSessao,
  getCicloAtivo,
  getHistoricoExercicio,
} from '../db.js';
import { el, formatarDataBR, mostrarToast, limpar, hojeISO } from '../utils/ui.js';
import { criarBuscaExercicio } from '../utils/buscaExercicio.js';
import { baixarBackup } from '../utils/backup.js';
import { setTitulo, setAcoesTopo, navegar } from '../app.js';

export async function render(container, params) {
  const id = params && params[0] ? Number(params[0]) : null;
  if (id) {
    await renderSessao(container, id);
  } else {
    await renderEscolha(container);
  }
}

async function renderEscolha(container) {
  setTitulo('Nova sessão');
  const cicloAtivo = await getCicloAtivo();

  if (!cicloAtivo) {
    container.appendChild(
      el('div', { class: 'cartao' }, [
        el('div', { class: 'linha-titulo' }, 'Nenhum ciclo ativo'),
        el('p', { class: 'dica' }, 'Crie um ciclo antes de iniciar uma sessão de treino.'),
        el('button', { class: 'primario bloco', onClick: () => navegar('#/ciclos') }, 'Ir para Ciclos'),
      ])
    );
    return;
  }

  container.appendChild(el('p', { class: 'dica' }, `Ciclo ativo: ${cicloAtivo.nome}. Escolha o treino de hoje.`));

  const modelos = (await getModelosDoCiclo(cicloAtivo.id)).sort((a, b) => a.nome.localeCompare(b.nome));

  for (const modelo of modelos) {
    container.appendChild(
      el(
        'button',
        {
          class: 'bloco',
          onClick: async () => {
            const novoId = await add('sessoes', {
              data: hojeISO(),
              modelo_treino_id: modelo.id,
              ciclo_id: cicloAtivo.id,
            });
            navegar(`#/sessao/${novoId}`);
          },
        },
        modelo.nome
      )
    );
    container.appendChild(el('div', { style: 'height:8px' }));
  }

  container.appendChild(el('hr', { class: 'sep' }));

  container.appendChild(
    el(
      'button',
      {
        class: 'bloco',
        onClick: async () => {
          const novoId = await add('sessoes', {
            data: hojeISO(),
            modelo_treino_id: null,
            ciclo_id: cicloAtivo.id,
          });
          navegar(`#/sessao/${novoId}`);
        },
      },
      '🧩 Treino avulso (sem modelo)'
    )
  );
}

async function referenciaTexto(exercicioId, sessaoIdAtual) {
  const historico = await getHistoricoExercicio(exercicioId);
  const filtrado = historico.filter((h) => h.sessao.id !== sessaoIdAtual);
  if (filtrado.length === 0) return null;
  const ultimo = filtrado[filtrado.length - 1];
  const { registro, sessao } = ultimo;
  const partes = [`${registro.carga}kg × ${registro.repeticoes}`];
  return `Último: ${partes.join(' ')} (${formatarDataBR(sessao.data)})`;
}

async function renderSessao(container, id) {
  const sessao = await get('sessoes', id);
  if (!sessao) {
    setTitulo('Sessão não encontrada');
    container.appendChild(el('div', { class: 'vazio' }, 'Esta sessão não existe mais.'));
    return;
  }

  const modelo = sessao.modelo_treino_id ? await get('modelosTreino', sessao.modelo_treino_id) : null;
  const ciclo = sessao.ciclo_id ? await get('ciclos', sessao.ciclo_id) : null;
  const exerciciosPorId = new Map((await getAll('exercicios')).map((e) => [e.id, e]));

  setTitulo(modelo ? modelo.nome : 'Treino avulso');
  setAcoesTopo(
    el(
      'button',
      {
        class: 'icone-somente',
        onClick: async () => {
          if (!confirm('Excluir esta sessão e todas as séries registradas nela?')) return;
          const registros = await getRegistrosDaSessao(id);
          for (const r of registros) await remove('registrosSeries', r.id);
          await remove('sessoes', id);
          mostrarToast('Sessão excluída');
          navegar('#/');
        },
      },
      '🗑️'
    )
  );

  container.appendChild(
    el('div', { class: 'referencia' }, [
      formatarDataBR(sessao.data),
      ciclo ? ` · ${ciclo.nome}` : '',
    ])
  );

  const areaExercicios = el('div');
  container.appendChild(areaExercicios);

  const areaBusca = el('div');
  container.appendChild(el('h3', {}, 'Adicionar exercício avulso'));
  container.appendChild(areaBusca);

  const areaFinalizar = el('div', { style: 'margin-top: 20px' });
  container.appendChild(areaFinalizar);

  // ids planejados (do modelo) na ordem certa
  const idsPlanejados = modelo ? modelo.exercicios.slice().sort((a, b) => a.ordem - b.ordem).map((e) => e.exercicio_id) : [];

  const extrasManuais = new Set();

  async function idsExtras() {
    const registros = await getRegistrosDaSessao(id);
    const idsRegistrados = registros.map((r) => r.exercicio_id);
    const todos = new Set([...idsRegistrados, ...extrasManuais]);
    idsPlanejados.forEach((pid) => todos.delete(pid));
    return [...todos];
  }

  async function renderExercicios() {
    limpar(areaExercicios);
    const extras = await idsExtras();
    const todosIds = [...idsPlanejados, ...extras];

    if (todosIds.length === 0) {
      areaExercicios.appendChild(el('div', { class: 'vazio' }, 'Nenhum exercício ainda. Adicione um abaixo.'));
    }

    for (const exercicioId of todosIds) {
      const exercicio = exerciciosPorId.get(exercicioId);
      areaExercicios.appendChild(await renderCartaoExercicio(exercicio || { id: exercicioId, nome: '(exercício removido)' }));
    }
  }

  async function renderCartaoExercicio(exercicio) {
    const registros = (await getRegistrosDaSessao(id))
      .filter((r) => r.exercicio_id === exercicio.id)
      .sort((a, b) => a.ordem_serie - b.ordem_serie);

    const cartao = el('div', { class: 'cartao' });
    cartao.appendChild(el('div', { class: 'linha-titulo' }, exercicio.nome));

    const refTexto = await referenciaTexto(exercicio.id, id);
    if (refTexto) cartao.appendChild(el('div', { class: 'referencia' }, refTexto));
    if (exercicio.nota_padrao) cartao.appendChild(el('p', { class: 'dica' }, exercicio.nota_padrao));

    const listaSeries = el('div');
    registros.forEach((reg, i) => {
      listaSeries.appendChild(
        el('div', { class: 'serie-item' }, [
          el('div', { class: 'num' }, `${i + 1}`),
          el('div', { class: 'valores' }, [
            `${reg.carga}kg × ${reg.repeticoes}`,
            reg.observacao ? el('div', { class: 'obs' }, reg.observacao) : null,
          ]),
          el(
            'button',
            {
              class: 'icone-somente',
              onClick: async () => {
                await remove('registrosSeries', reg.id);
                await renderExercicios();
              },
            },
            '✖️'
          ),
        ])
      );
    });
    cartao.appendChild(listaSeries);

    const campoCarga = el('input', { type: 'number', inputmode: 'decimal', step: '0.5', placeholder: 'carga (kg)' });
    const campoReps = el('input', { type: 'number', inputmode: 'numeric', placeholder: 'reps' });
    const campoObs = el('input', { type: 'text', placeholder: 'observação (opcional)' });

    cartao.appendChild(
      el('div', { class: 'campo-linha' }, [
        el('div', {}, [el('label', {}, 'Carga'), campoCarga]),
        el('div', {}, [el('label', {}, 'Reps'), campoReps]),
      ])
    );
    cartao.appendChild(el('label', {}, 'Observação'));
    cartao.appendChild(campoObs);

    cartao.appendChild(
      el(
        'button',
        {
          class: 'primario bloco',
          onClick: async () => {
            const carga = campoCarga.value;
            const repeticoes = campoReps.value;
            if (carga === '' || repeticoes === '') {
              mostrarToast('Preencha carga e repetições');
              return;
            }
            await add('registrosSeries', {
              sessao_id: id,
              exercicio_id: exercicio.id,
              carga: Number(carga),
              repeticoes: Number(repeticoes),
              observacao: campoObs.value.trim() || null,
              ordem_serie: registros.length,
            });
            await renderExercicios();
          },
        },
        '➕ Registrar série'
      )
    );

    return cartao;
  }

  limpar(areaBusca);
  areaBusca.appendChild(
    criarBuscaExercicio({
      placeholder: 'Buscar exercício para adicionar…',
      excluirIds: () => [],
      aoSelecionar: async (exercicio) => {
        exerciciosPorId.set(exercicio.id, exercicio);
        extrasManuais.add(exercicio.id);
        await renderExercicios();
      },
    })
  );

  limpar(areaFinalizar);
  areaFinalizar.appendChild(
    el(
      'button',
      {
        class: 'sucesso bloco',
        onClick: async () => {
          const backupEntregue = await baixarBackup();
          mostrarToast(backupEntregue ? 'Treino salvo e backup entregue' : 'Treino salvo (backup não concluído)');
          navegar('#/');
        },
      },
      '✅ Finalizar treino'
    )
  );

  await renderExercicios();
}
