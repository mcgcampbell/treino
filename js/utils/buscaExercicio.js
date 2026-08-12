import { getAll, add } from '../db.js';
import { el } from './ui.js';

function normalizar(txt) {
  return txt
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Campo de busca/autocomplete de exercícios da biblioteca.
// options.aoSelecionar(exercicio) é chamado quando um item é escolhido.
// options.excluirIds: ids que não devem aparecer nas sugestões (já usados, por ex).
export function criarBuscaExercicio(options) {
  const { aoSelecionar, excluirIds = [], placeholder = 'Buscar exercício…' } = options;

  const input = el('input', { type: 'text', placeholder });
  const sugestoesEl = el('div', { class: 'sugestoes' });
  sugestoesEl.style.display = 'none';

  const wrap = el('div', { class: 'lista-sugestoes' }, [input, sugestoesEl]);

  async function atualizarSugestoes() {
    const termo = normalizar(input.value);
    const todos = await getAll('exercicios');
    const excluidos = new Set(typeof excluirIds === 'function' ? excluirIds() : excluirIds);
    let candidatos = todos.filter((ex) => !excluidos.has(ex.id));

    if (termo) {
      candidatos = candidatos.filter((ex) => normalizar(ex.nome).includes(termo));
    }
    candidatos.sort((a, b) => a.nome.localeCompare(b.nome));
    candidatos = candidatos.slice(0, 8);

    sugestoesEl.innerHTML = '';

    for (const ex of candidatos) {
      sugestoesEl.appendChild(
        el(
          'button',
          {
            type: 'button',
            onClick: () => {
              input.value = '';
              sugestoesEl.style.display = 'none';
              aoSelecionar(ex);
            },
          },
          ex.nome
        )
      );
    }

    if (termo && !todos.some((ex) => normalizar(ex.nome) === termo)) {
      sugestoesEl.appendChild(
        el(
          'button',
          {
            type: 'button',
            onClick: async () => {
              const nome = input.value.trim();
              if (!nome) return;
              const novoId = await add('exercicios', { nome, grupo_muscular: null, nota_padrao: null });
              input.value = '';
              sugestoesEl.style.display = 'none';
              aoSelecionar({ id: novoId, nome, grupo_muscular: null, nota_padrao: null });
            },
          },
          `➕ Cadastrar "${input.value.trim()}"`
        )
      );
    }

    sugestoesEl.style.display = candidatos.length > 0 || termo ? 'block' : 'none';
  }

  input.addEventListener('input', atualizarSugestoes);
  input.addEventListener('focus', atualizarSugestoes);
  document.addEventListener('click', (ev) => {
    if (!wrap.contains(ev.target)) sugestoesEl.style.display = 'none';
  });

  return wrap;
}
