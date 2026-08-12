import { exportarTudo } from '../db.js';

export async function baixarBackup() {
  const dados = await exportarTudo();
  const json = JSON.stringify(dados, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const carimbo = dados.exportado_em.replace(/[:.]/g, '-');
  const a = document.createElement('a');
  a.href = url;
  a.download = `treino-backup-${carimbo}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
