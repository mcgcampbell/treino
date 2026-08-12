import { add, put, remove, getAll, getAllByIndex } from '../db.js';
import { el, mostrarToast, limpar } from '../utils/ui.js';
import { setTitulo, setAcoesTopo } from '../app.js';

export async function render(container) {
  setTitulo('Exercícios');

  const areaForm = el('div');
  const campoBusca = el('input', { type: 'text', placeholder: '🔍 Buscar na biblioteca…' });
  const listaEl = el('div');

  setAcoesTopo(el('button', { class: 'icone-somente', onClick: () => abrirFormNovo() }, '➕'));

  container.appendChild(areaForm);
  container.appendChild(campoBusca);
  container.appendChild(listaEl);

  function normalizar(txt) {
    return (txt || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  function formularioExercicio(inicial, aoSalvar, aoCancelar) {
    const campoNome = el('input', { type: 'text', value: inicial.nome || '', placeholder: 'ex: Supino reto barra' });
    const campoGrupo = el('input', {
      type: 'text',
      value: inicial.grupo_muscular || '',
      placeholder: 'ex: Peito (opcional)',
    });
    const campoNota = el('input', {
      type: 'text',
      value: inicial.nota_padrao || '',
      placeholder: 'ex: pegada aberta (opcional)',
    });

    return el('div', { class: 'cartao' }, [
      el('label', {}, 'Nome'),
      campoNome,
      el('label', {}, 'Grupo muscular'),
      campoGrupo,
      el('label', {}, 'Nota padrão'),
      campoNota,
      el('div', { class: 'topo-acoes' }, [
        el(
          'button',
          {
            class: 'primario bloco',
            onClick: async () => {
              const nome = campoNome.value.trim();
              if (!nome) {
                mostrarToast('Dê um nome ao exercício');
                return;
              }
              await aoSalvar({
                ...inicial,
                nome,
                grupo_muscular: campoGrupo.value.trim() || null,
                nota_padrao: campoNota.value.trim() || null,
              });
            },
          },
          'Salvar'
        ),
        el('button', { class: 'bloco', onClick: aoCancelar }, 'Cancelar'),
      ]),
    ]);
  }

  function abrirFormNovo() {
    limpar(areaForm);
    areaForm.appendChild(
      formularioExercicio({}, async (dados) => {
        await add('exercicios', dados);
        mostrarToast('Exercício cadastrado');
        limpar(areaForm);
        await popularLista();
      }, () => limpar(areaForm))
    );
  }

  function abrirFormEdicao(exercicio) {
    limpar(areaForm);
    areaForm.appendChild(
      formularioExercicio(exercicio, async (dados) => {
        await put('exercicios', { ...exercicio, ...dados });
        mostrarToast('Exercício atualizado');
        limpar(areaForm);
        await popularLista();
      }, () => limpar(areaForm))
    );
  }

  async function excluirExercicio(exercicio) {
    const usos = await getAllByIndex('registrosSeries', 'exercicio_id', exercicio.id);
    const msg =
      usos.length > 0
        ? `Este exercício tem ${usos.length} série(s) registrada(s) no histórico. Elas serão mantidas, mas o exercício sairá da biblioteca. Excluir mesmo assim?`
        : `Excluir "${exercicio.nome}"?`;
    if (!confirm(msg)) return;
    await remove('exercicios', exercicio.id);
    mostrarToast('Exercício excluído');
    await popularLista();
  }

  async function popularLista() {
    limpar(listaEl);
    let exercicios = await getAll('exercicios');
    exercicios.sort((a, b) => a.nome.localeCompare(b.nome));

    const termo = normalizar(campoBusca.value);
    if (termo) {
      exercicios = exercicios.filter((ex) => normalizar(ex.nome).includes(termo));
    }

    if (exercicios.length === 0) {
      listaEl.appendChild(
        el('div', { class: 'vazio' }, termo ? 'Nenhum exercício encontrado.' : 'Biblioteca vazia. Toque em + para cadastrar.')
      );
      return;
    }

    for (const ex of exercicios) {
      listaEl.appendChild(
        el('div', { class: 'cartao' }, [
          el('div', { class: 'linha' }, [
            el('div', {}, [
              el('div', { class: 'linha-titulo' }, ex.nome),
              ex.grupo_muscular ? el('div', { class: 'linha-sub' }, ex.grupo_muscular) : null,
            ]),
            el('div', {}, [
              el('button', { class: 'icone-somente', onClick: () => abrirFormEdicao(ex) }, '✏️'),
              el('button', { class: 'icone-somente', onClick: () => excluirExercicio(ex) }, '🗑️'),
            ]),
          ]),
        ])
      );
    }
  }

  campoBusca.addEventListener('input', popularLista);
  await popularLista();
}
