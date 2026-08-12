import { exportarTudo } from '../db.js';

// Retorna true se o backup foi entregue ao usuário (compartilhado ou baixado),
// false se o usuário cancelou a caixa de compartilhamento.
export async function baixarBackup() {
  const dados = await exportarTudo();
  const json = JSON.stringify(dados, null, 2);
  const carimbo = dados.exportado_em.replace(/[:.]/g, '-');
  const nomeArquivo = `treino-backup-${carimbo}.json`;
  const blob = new Blob([json], { type: 'application/json' });

  // No app instalado na tela de início do iOS (modo standalone) não existe
  // interface de downloads do Safari, então <a download> não tem efeito.
  // O menu de compartilhamento nativo funciona nesse modo e permite "Salvar em Arquivos".
  const arquivo = new File([blob], nomeArquivo, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: nomeArquivo });
      return true;
    } catch (err) {
      if (err && err.name === 'AbortError') return false;
      // se o compartilhamento falhar por outro motivo, cai para o download abaixo
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
