import { baixarBackup, importarBackup } from '../utils/backup.js';
import { el, mostrarToast, limpar } from '../utils/ui.js';
import { setTitulo, navegar } from '../app.js';

export async function render(container) {
  setTitulo('Backup');

  container.appendChild(
    el('div', { class: 'cartao' }, [
      el('div', { class: 'linha-titulo' }, 'Exportar agora'),
      el('p', { class: 'dica' }, 'Gera um arquivo com todo o histórico até este momento e abre o menu para salvar ou compartilhar.'),
      el(
        'button',
        {
          class: 'primario bloco',
          onClick: async () => {
            const entregue = await baixarBackup();
            mostrarToast(entregue ? 'Backup entregue' : 'Backup não concluído');
          },
        },
        '📤 Exportar backup'
      ),
    ])
  );

  const areaImportar = el('div');
  container.appendChild(areaImportar);

  function renderImportar() {
    limpar(areaImportar);

    const inputArquivo = el('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });

    inputArquivo.addEventListener('change', async () => {
      const arquivo = inputArquivo.files && inputArquivo.files[0];
      inputArquivo.value = '';
      if (!arquivo) return;

      const confirmado = confirm(
        `Importar "${arquivo.name}" vai APAGAR todos os dados atuais do app (ciclos, treinos, exercícios, histórico) e substituir pelo conteúdo desse arquivo. Essa ação não pode ser desfeita. Continuar?`
      );
      if (!confirmado) return;

      try {
        await importarBackup(arquivo);
        mostrarToast('Backup importado com sucesso');
        navegar('#/');
      } catch (err) {
        alert(err.message || 'Não foi possível importar este arquivo.');
      }
    });

    areaImportar.appendChild(
      el('div', { class: 'cartao' }, [
        el('div', { class: 'linha-titulo' }, 'Restaurar de um backup'),
        el(
          'p',
          { class: 'dica' },
          'Use isto se o app perdeu os dados (por exemplo, depois de limpar o cache/dados do Safari) ou ao configurar em um novo aparelho. Selecione o arquivo treino-backup-….json mais recente que você salvou.'
        ),
        el(
          'button',
          {
            class: 'bloco',
            onClick: () => inputArquivo.click(),
          },
          '📥 Selecionar arquivo de backup'
        ),
        inputArquivo,
      ])
    );
  }

  renderImportar();
}
