import { get, put, remove, getAll, getSessoesDoCiclo } from '../db.js';
import { el, mostrarToast, limpar } from '../utils/ui.js';
import { criarBuscaExercicio } from '../utils/buscaExercicio.js';
import { setTitulo, setAcoesTopo, navegar } from '../app.js';

export async function render(container, params) {
  const id = Number(params[0]);
  const modelo = await get('modelosTreino', id);
  if (!modelo) {
    setTitulo('Modelo não encontrado');
    container.appendChild(el('div', { class: 'vazio' }, 'Este modelo de treino não existe mais.'));
    return;
  }
  if (!Array.isArray(modelo.exercicios)) modelo.exercicios = [];

  const ciclo = await get('ciclos', modelo.ciclo_id);

  setTitulo(modelo.nome);
  setAcoesTopo(
    el('button', { class: 'icone-somente', onClick: () => navegar(`#/ciclos/${modelo.ciclo_id}`) }, '↩️')
  );

  const exerciciosPorId = new Map((await getAll('exercicios')).map((e) => [e.id, e]));

  container.appendChild(
    el('div', { class: 'referencia' }, [
      'Ciclo: ',
      el('b', {}, ciclo ? ciclo.nome : '—'),
    ])
  );

  const areaNome = el('div');
  container.appendChild(areaNome);

  function renderNome() {
    limpar(areaNome);
    const campoNome = el('input', { type: 'text', value: modelo.nome });
    areaNome.appendChild(
      el('div', { class: 'cartao' }, [
        el('label', {}, 'Nome do modelo'),
        campoNome,
        el('div', { class: 'topo-acoes' }, [
          el(
            'button',
            {
              class: 'primario bloco',
              onClick: async () => {
                const nome = campoNome.value.trim();
                if (!nome) {
                  mostrarToast('Dê um nome ao modelo');
                  return;
                }
                modelo.nome = nome;
                await put('modelosTreino', modelo);
                setTitulo(nome);
                mostrarToast('Salvo');
              },
            },
            'Salvar nome'
          ),
          el('button', { class: 'perigo bloco', onClick: excluirModelo }, 'Excluir modelo'),
        ]),
      ])
    );
  }

  async function excluirModelo() {
    if (!confirm('Excluir este modelo de treino? As sessões já registradas com ele continuam no histórico.')) return;
    await remove('modelosTreino', id);
    mostrarToast('Modelo excluído');
    navegar(`#/ciclos/${modelo.ciclo_id}`);
  }

  renderNome();

  container.appendChild(el('h3', {}, 'Exercícios'));
  container.appendChild(el('p', { class: 'dica' }, 'Defina a ordem e, se quiser, uma meta de séries/repetições.'));

  const listaEl = el('div');
  container.appendChild(listaEl);

  const buscaEl = criarBuscaExercicio({
    placeholder: 'Adicionar exercício ao modelo…',
    excluirIds: () => modelo.exercicios.map((ex) => ex.exercicio_id),
    aoSelecionar: async (exercicio) => {
      exerciciosPorId.set(exercicio.id, exercicio);
      modelo.exercicios.push({
        exercicio_id: exercicio.id,
        ordem: modelo.exercicios.length,
        meta_series: null,
        meta_reps: null,
      });
      await put('modelosTreino', modelo);
      renderLista();
    },
  });
  container.appendChild(buscaEl);

  function renderLista() {
    limpar(listaEl);
    const ordenados = modelo.exercicios.slice().sort((a, b) => a.ordem - b.ordem);

    if (ordenados.length === 0) {
      listaEl.appendChild(el('div', { class: 'vazio' }, 'Nenhum exercício adicionado ainda.'));
      return;
    }

    ordenados.forEach((item, indice) => {
      const exercicio = exerciciosPorId.get(item.exercicio_id);
      const campoSeries = el('input', {
        type: 'number',
        min: '0',
        placeholder: 'séries',
        value: item.meta_series ?? '',
      });
      const campoReps = el('input', {
        type: 'text',
        placeholder: 'reps (ex: 8-12)',
        value: item.meta_reps ?? '',
      });

      async function salvarMetas() {
        item.meta_series = campoSeries.value ? Number(campoSeries.value) : null;
        item.meta_reps = campoReps.value.trim() || null;
        await put('modelosTreino', modelo);
      }
      campoSeries.addEventListener('change', salvarMetas);
      campoReps.addEventListener('change', salvarMetas);

      listaEl.appendChild(
        el('div', { class: 'cartao' }, [
          el('div', { class: 'linha' }, [
            el('div', { class: 'linha-titulo' }, exercicio ? exercicio.nome : '(exercício removido)'),
            el('div', {}, [
              el(
                'button',
                {
                  class: 'icone-somente',
                  disabled: indice === 0,
                  onClick: async () => {
                    const anterior = ordenados[indice - 1];
                    [item.ordem, anterior.ordem] = [anterior.ordem, item.ordem];
                    await put('modelosTreino', modelo);
                    renderLista();
                  },
                },
                '⬆️'
              ),
              el(
                'button',
                {
                  class: 'icone-somente',
                  disabled: indice === ordenados.length - 1,
                  onClick: async () => {
                    const proximo = ordenados[indice + 1];
                    [item.ordem, proximo.ordem] = [proximo.ordem, item.ordem];
                    await put('modelosTreino', modelo);
                    renderLista();
                  },
                },
                '⬇️'
              ),
              el(
                'button',
                {
                  class: 'icone-somente',
                  onClick: async () => {
                    modelo.exercicios = modelo.exercicios.filter((e) => e !== item);
                    await put('modelosTreino', modelo);
                    renderLista();
                  },
                },
                '🗑️'
              ),
            ]),
          ]),
          el('div', { class: 'campo-linha' }, [
            el('div', {}, [el('label', {}, 'Meta de séries'), campoSeries]),
            el('div', {}, [el('label', {}, 'Meta de reps'), campoReps]),
          ]),
        ])
      );
    });
  }

  renderLista();
}
