// Gráfico de linha simples em canvas, sem dependências externas.
// pontos: [{ x: 'label', y: number }], em ordem cronológica.
export function desenharGraficoLinha(canvas, pontos) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 320;
  const cssHeight = canvas.clientHeight || 180;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  if (pontos.length === 0) return;

  const pad = { top: 16, right: 16, bottom: 28, left: 40 };
  const w = cssWidth - pad.left - pad.right;
  const h = cssHeight - pad.top - pad.bottom;

  const valores = pontos.map((p) => p.y);
  let min = Math.min(...valores);
  let max = Math.max(...valores);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const margem = (max - min) * 0.1;
  min -= margem;
  max += margem;

  const styles = getComputedStyle(document.documentElement);
  const corLinha = styles.getPropertyValue('--cor-acento').trim() || '#4f8cff';
  const corGrade = styles.getPropertyValue('--cor-borda').trim() || '#333';
  const corTexto = styles.getPropertyValue('--cor-texto-fraco').trim() || '#888';

  const escalaX = (i) => pad.left + (pontos.length === 1 ? w / 2 : (i / (pontos.length - 1)) * w);
  const escalaY = (v) => pad.top + h - ((v - min) / (max - min)) * h;

  // linhas de grade horizontais
  ctx.strokeStyle = corGrade;
  ctx.lineWidth = 1;
  const linhasGrade = 4;
  ctx.fillStyle = corTexto;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= linhasGrade; i++) {
    const v = min + ((max - min) * i) / linhasGrade;
    const y = escalaY(v);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + w, y);
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillText(v.toFixed(0), pad.left - 6, y);
  }

  // linha de dados
  ctx.strokeStyle = corLinha;
  ctx.lineWidth = 2;
  ctx.beginPath();
  pontos.forEach((p, i) => {
    const x = escalaX(i);
    const y = escalaY(p.y);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // pontos
  ctx.fillStyle = corLinha;
  pontos.forEach((p, i) => {
    const x = escalaX(i);
    const y = escalaY(p.y);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // rótulos eixo X (primeiro, meio, último, para não poluir)
  ctx.fillStyle = corTexto;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const indicesRotulo = new Set([0, pontos.length - 1, Math.floor((pontos.length - 1) / 2)]);
  indicesRotulo.forEach((i) => {
    if (i < 0 || i >= pontos.length) return;
    const x = escalaX(i);
    ctx.fillText(pontos[i].x, x, pad.top + h + 6);
  });
}
