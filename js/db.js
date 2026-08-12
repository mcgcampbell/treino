// Camada de dados: IndexedDB
// Stores: exercicios, ciclos, modelosTreino, sessoes, registrosSeries

const DB_NAME = 'treino-db';
const DB_VERSION = 1;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('exercicios')) {
        const store = db.createObjectStore('exercicios', { keyPath: 'id', autoIncrement: true });
        store.createIndex('nome', 'nome', { unique: false });
      }

      if (!db.objectStoreNames.contains('ciclos')) {
        db.createObjectStore('ciclos', { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains('modelosTreino')) {
        const store = db.createObjectStore('modelosTreino', { keyPath: 'id', autoIncrement: true });
        store.createIndex('ciclo_id', 'ciclo_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('sessoes')) {
        const store = db.createObjectStore('sessoes', { keyPath: 'id', autoIncrement: true });
        store.createIndex('ciclo_id', 'ciclo_id', { unique: false });
        store.createIndex('data', 'data', { unique: false });
      }

      if (!db.objectStoreNames.contains('registrosSeries')) {
        const store = db.createObjectStore('registrosSeries', { keyPath: 'id', autoIncrement: true });
        store.createIndex('exercicio_id', 'exercicio_id', { unique: false });
        store.createIndex('sessao_id', 'sessao_id', { unique: false });
      }
    };

    req.onsuccess = (event) => resolve(event.target.result);
    req.onerror = (event) => reject(event.target.error);
  });
  return dbPromise;
}

function tx(storeName, mode) {
  return openDb().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function add(storeName, obj) {
  const store = await tx(storeName, 'readwrite');
  return reqToPromise(store.add(obj));
}

export async function put(storeName, obj) {
  const store = await tx(storeName, 'readwrite');
  return reqToPromise(store.put(obj));
}

export async function get(storeName, id) {
  const store = await tx(storeName, 'readonly');
  return reqToPromise(store.get(id));
}

export async function getAll(storeName) {
  const store = await tx(storeName, 'readonly');
  return reqToPromise(store.getAll());
}

export async function getAllByIndex(storeName, indexName, value) {
  const store = await tx(storeName, 'readonly');
  return reqToPromise(store.index(indexName).getAll(value));
}

export async function remove(storeName, id) {
  const store = await tx(storeName, 'readwrite');
  return reqToPromise(store.delete(id));
}

// ---- Consultas compostas ----

export async function getHistoricoExercicio(exercicioId) {
  const registros = await getAllByIndex('registrosSeries', 'exercicio_id', exercicioId);
  const sessoesCache = new Map();
  const ciclosCache = new Map();

  const linhas = [];
  for (const reg of registros) {
    let sessao = sessoesCache.get(reg.sessao_id);
    if (!sessao) {
      sessao = await get('sessoes', reg.sessao_id);
      if (sessao) sessoesCache.set(reg.sessao_id, sessao);
    }
    if (!sessao) continue;

    let ciclo = ciclosCache.get(sessao.ciclo_id);
    if (ciclo === undefined) {
      ciclo = await get('ciclos', sessao.ciclo_id);
      ciclosCache.set(sessao.ciclo_id, ciclo || null);
    }

    linhas.push({
      registro: reg,
      sessao,
      cicloNome: ciclo ? ciclo.nome : null,
    });
  }

  linhas.sort((a, b) => {
    const d = a.sessao.data.localeCompare(b.sessao.data);
    if (d !== 0) return d;
    return (a.registro.ordem_serie ?? 0) - (b.registro.ordem_serie ?? 0);
  });

  return linhas;
}

export async function getUltimoRegistroExercicio(exercicioId) {
  const linhas = await getHistoricoExercicio(exercicioId);
  if (linhas.length === 0) return null;
  return linhas[linhas.length - 1];
}

export async function getSessoesDoCiclo(cicloId) {
  return getAllByIndex('sessoes', 'ciclo_id', cicloId);
}

export async function getModelosDoCiclo(cicloId) {
  return getAllByIndex('modelosTreino', 'ciclo_id', cicloId);
}

export async function getRegistrosDaSessao(sessaoId) {
  return getAllByIndex('registrosSeries', 'sessao_id', sessaoId);
}

export async function getCicloAtivo() {
  const ciclos = await getAll('ciclos');
  const ativos = ciclos.filter((c) => !c.data_fim);
  if (ativos.length === 0) return null;
  ativos.sort((a, b) => b.data_inicio.localeCompare(a.data_inicio));
  return ativos[0];
}

// ---- Exportação completa para backup ----

export async function exportarTudo() {
  const [exercicios, ciclos, modelosTreino, sessoes, registrosSeries] = await Promise.all([
    getAll('exercicios'),
    getAll('ciclos'),
    getAll('modelosTreino'),
    getAll('sessoes'),
    getAll('registrosSeries'),
  ]);
  return {
    versao: 1,
    exportado_em: new Date().toISOString(),
    exercicios,
    ciclos,
    modelosTreino,
    sessoes,
    registrosSeries,
  };
}

// ---- Restauração a partir de um backup ----

const NOMES_STORES = ['exercicios', 'ciclos', 'modelosTreino', 'sessoes', 'registrosSeries'];

async function limparStore(storeName) {
  const store = await tx(storeName, 'readwrite');
  return reqToPromise(store.clear());
}

// Substitui todo o conteúdo do banco pelos dados do backup, preservando os
// ids originais (as referências entre sessão/exercício/série dependem disso).
export async function restaurarTudo(dados) {
  for (const nome of NOMES_STORES) {
    await limparStore(nome);
  }
  for (const nome of NOMES_STORES) {
    const registros = Array.isArray(dados[nome]) ? dados[nome] : [];
    for (const registro of registros) {
      await put(nome, registro);
    }
  }
}
