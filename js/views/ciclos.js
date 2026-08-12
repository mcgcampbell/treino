import { add, put, get, getAll, remove, getModelosDoCiclo, getSessoesDoCiclo } from '../db.js';
import { el, formatarDataBR, hojeISO, mostrarToast, limpar } from '../utils/ui.js';
import { setTitulo, setAcoesTopo, navegar } from '../app.js';

export async function render(container, params) {
  const id = params && params[0] ? Number(params[0]) : null;
  if (id) {
    await renderDetalhe(container, id);
  } else {
    await renderLista(container);
  }
}

async function renderLista(container) {
  setTitulo('Ciclos');

  const btnNovo = el('button', { class: 'icone-somente', onClick: () => abrirFormNovo() }, '➕');
  setAcoesTopo(btnNovo);

  const areaForm = el('div');
  container.appendChild(areaForm);

  const listaEl = el('div');
  container.appendChild(listaEl);

  function abrirFormNovo() {
    limpar(areaForm);
    areaForm.appendChild(formularioCiclo({}, async (dados) => {
      await add('ciclos', dados);
      mostrarToast('Ciclo criado');
      limpar(areaForm);
      await popularLista();
    }, () => limpar(areaForm)));
  }

  async function popularLista() {
    limpar(listaEl);
    const ciclos = (await getAll('ciclos')).sort((a, b) => b.data_inicio.localeCompare(a.data_inicio));
    if (ciclos.length === 0) {
      listaEl.appendChild(el('div', { class: 'vazio' }, 'Nenhum ciclo cadastrado. Toque em + para criar o primeiro.'));
      return;
    }
    for (const ciclo of ciclos) {
      listaEl.appendChild(
        el('div', { class: 'cartao clicavel', onClick: () => navegar(`#/ciclos/${ciclo.id}`) }, [
          el('div', { class: 'linha' }, [
            el('div', { class: 'linha-titulo' }, ciclo.nome),
            el('span', { class: 'pill' }, ciclo.data_fim ? 'encerrado' : 'ativo'),
          ]),
          el(
            'div',
            { class: 'linha-sub' },
            `${formatarDataBR(ciclo.data_inicio)} — ${ciclo.data_fim ? formatarDataBR(ciclo.data_fim) : 'em andamento'}`
          ),
        ])
      );
    }
  }

  await popularLista();
}

function formularioCiclo(inicial, aoSalvar, aoCancelar) {
  const campoNome = el('input', { type: 'text', value: inicial.nome || '', placeholder: 'ex: Hipertrofia Mar-Mai 2026' });
  const campoInicio = el('input', { type: 'date', value: inicial.data_inicio || hojeISO() });
  const campoFim = el('input', { type: 'date', value: inicial.data_fim || '' });

  return el('div', { class: 'cartao' }, [
    el('label', {}, 'Nome do ciclo'),
    campoNome,
    el('div', { class: 'campo-linha' }, [
      el('div', {}, [el('label', {}, 'Início'), campoInicio]),
      el('div', {}, [el('label', {}, 'Fim (opcional)'), campoFim]),
    ]),
    el('div', { class: 'topo-acoes' }, [
      el(
        'button',
        {
          class: 'primario bloco',
          onClick: async () => {
            const nome = campoNome.value.trim();
            if (!nome) {
              mostrarToast('Dê um nome ao ciclo');
              return;
            }
            if (!campoInicio.value) {
              mostrarToast('Informe a data de início');
              return;
            }
            await aoSalvar({
              ...inicial,
              nome,
              data_inicio: campoInicio.value,
              data_fim: campoFim.value || null,
            });
          },
        },
        'Salvar'
      ),
      el('button', { class: 'bloco', onClick: aoCancelar }, 'Cancelar'),
    ]),
  ]);
}

async function renderDetalhe(container, id) {
  const ciclo = await get('ciclos', id);
  if (!ciclo) {
    setTitulo('Ciclo não encontrado');
    container.appendChild(el('div', { class: 'vazio' }, 'Este ciclo não existe mais.'));
    return;
  }

  setTitulo(ciclo.nome);
  setAcoesTopo(el('button', { class: 'icone-somente', onClick: () => editar() }, '✏️'));

  const areaTopo = el('div');
  const areaModelos = el('div');
  container.appendChild(areaTopo);
  container.appendChild(el('h3', {}, 'Modelos de treino'));
  const areaFormModelo = el('div');
  container.appendChild(areaFormModelo);
  container.appendChild(areaModelos);

  function renderTopo() {
    limpar(areaTopo);
    areaTopo.appendChild(
      el('div', { class: 'cartao' }, [
        el('div', { class: 'linha-sub' }, ciclo.data_fim ? 'Encerrado' : 'Ativo'),
        el(
          'div',
          { class: 'linha-sub' },
          `${formatarDataBR(ciclo.data_inicio)} — ${ciclo.data_fim ? formatarDataBR(ciclo.data_fim) : 'em andamento'}`
        ),
        el('div', { class: 'topo-acoes' }, [
          !ciclo.data_fim
            ? el(
                'button',
                {
                  onClick: async () => {
                    ciclo.data_fim = hojeISO();
                    await put('ciclos', ciclo);
                    mostrarToast('Ciclo encerrado');
                    renderTopo();
                  },
                },
                'Encerrar ciclo'
              )
            : null,
          el('button', { class: 'perigo', onClick: excluirCiclo }, 'Excluir ciclo'),
        ]),
      ])
    );
  }

  function editar() {
    limpar(areaTopo);
    areaTopo.appendChild(
      formularioCiclo(ciclo, async (dados) => {
        Object.assign(ciclo, dados);
        await put('ciclos', ciclo);
        mostrarToast('Ciclo atualizado');
        setTitulo(ciclo.nome);
        renderTopo();
      }, renderTopo)
    );
  }

  async function excluirCiclo() {
    const sessoes = await getSessoesDoCiclo(id);
    const msg =
      sessoes.length > 0
        ? `Este ciclo tem ${sessoes.length} sessão(ões) registrada(s). Elas não serão apagadas, mas ficarão sem ciclo associado. Excluir mesmo assim?`
        : 'Excluir este ciclo?';
    if (!confirm(msg)) return;
    const modelos = await getModelosDoCiclo(id);
    for (const m of modelos) await remove('modelosTreino', m.id);
    await remove('ciclos', id);
    mostrarToast('Ciclo excluído');
    navegar('#/ciclos');
  }

  function formularioModelo() {
    limpar(areaFormModelo);
    const campoNome = el('input', { type: 'text', placeholder: 'ex: Treino A — Peito e tríceps' });
    areaFormModelo.appendChild(
      el('div', { class: 'cartao' }, [
        el('label', {}, 'Nome do modelo de treino'),
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
                const novoId = await add('modelosTreino', { ciclo_id: id, nome, exercicios: [] });
                limpar(areaFormModelo);
                navegar(`#/modelos/${novoId}`);
              },
            },
            'Criar e adicionar exercícios'
          ),
          el('button', { class: 'bloco', onClick: () => limpar(areaFormModelo) }, 'Cancelar'),
        ]),
      ])
    );
  }

  container.insertBefore(
    el('button', { class: 'bloco', onClick: formularioModelo }, '➕ Novo modelo de treino'),
    areaFormModelo
  );

  async function popularModelos() {
    limpar(areaModelos);
    const modelos = (await getModelosDoCiclo(id)).sort((a, b) => a.nome.localeCompare(b.nome));
    if (modelos.length === 0) {
      areaModelos.appendChild(el('div', { class: 'vazio' }, 'Nenhum modelo de treino neste ciclo ainda.'));
      return;
    }
    for (const modelo of modelos) {
      areaModelos.appendChild(
        el('div', { class: 'cartao clicavel', onClick: () => navegar(`#/modelos/${modelo.id}`) }, [
          el('div', { class: 'linha-titulo' }, modelo.nome),
          el('div', { class: 'linha-sub' }, `${(modelo.exercicios || []).length} exercício(s)`),
        ])
      );
    }
  }

  renderTopo();
  await popularModelos();
}
