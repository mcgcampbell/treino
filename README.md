# Treino

PWA pessoal para registro de treino: carga, repetições e observações por série, com histórico por exercício ao longo do tempo (mesmo entre ciclos diferentes) e gráfico de progressão de carga.

Offline-first: todos os dados ficam salvos no aparelho via IndexedDB. Não há servidor nem banco compartilhado — a página funciona sozinha depois de aberta uma vez.

## Rodando localmente

Qualquer servidor de arquivos estáticos serve (é preciso servir via HTTP, não abrir o `index.html` direto com `file://`, porque o app usa ES modules e Service Worker). Exemplos:

```bash
npx http-server . -p 5500
```

ou

```bash
npx serve .
```

Depois abra `http://localhost:5500`.

## Deploy no GitHub Pages

1. Crie um repositório no GitHub (pode ser público — os dados ficam só no aparelho de quem instalou, nunca no repositório).
2. `git remote add origin <url-do-repo>`
3. `git push -u origin main`
4. Nas configurações do repositório, em **Pages**, selecione a branch `main` e a pasta raiz (`/`).
5. Aguarde a publicação e acesse a URL gerada (`https://<usuario>.github.io/<repo>/`).

## Instalando no iPhone

1. Abra a URL do GitHub Pages no Safari.
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**.
3. Abra pelo ícone criado — o app roda em modo standalone, sem barra de navegador.

## Backup

Ao tocar em **Finalizar treino**, o app salva a sessão no IndexedDB e, no mesmo toque, baixa um arquivo JSON (`treino-backup-<data>.json`) com o histórico completo até aquele momento. Cada exportação é autossuficiente — o arquivo mais recente sozinho já é um backup completo. Vale guardar esses arquivos em algum lugar sincronizado (iCloud Drive, por exemplo) de tempos em tempos.

## Estrutura

- `js/db.js` — camada de dados (IndexedDB): exercícios, ciclos, modelos de treino, sessões, séries.
- `js/app.js` — roteador (hash-based) e shell do app.
- `js/views/` — cada tela: início, ciclos, modelos de treino, exercícios, sessão (logging), histórico.
- `js/utils/` — utilitários compartilhados (UI, busca/autocomplete de exercício, gráfico em canvas, backup).
- `service-worker.js` — cache dos arquivos do app para funcionamento offline (estratégia network-first com fallback em cache).
