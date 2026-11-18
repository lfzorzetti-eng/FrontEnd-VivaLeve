/**
 * Back-end falso (porta de js/mock-api.js). Implementa a mesma interface de transporte do HTTP.
 * Tudo fica no AsyncStorage, chave "pluma_mock_db". Qualquer email/senha entra. Google não funciona.
 * O usuário de teste (USUARIO_TESTE) já existe e é o dono dos dados de exemplo (userId 1).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Transporte, Requisicao } from './transporte';
import { dataLocal } from './helpers';
import { erroApi } from './erros';
import { EMOCOES, USUARIO_TESTE } from '@/entities';

const DB_KEY = 'pluma_mock_db';
const LATENCIA_MS = 150;

const SCORE: Record<string, number> = Object.fromEntries(EMOCOES.map((e) => [e.mood, e.score]));

interface DB {
  seq: number;
  usuarios: any[];
  humor: any[];
  diario: any[];
  respiracao: any[];
  conversas: any[];
  mensagens: any[];
}

// ------------------------------------------------------------ banco

function diasAtras(n: number, hora = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hora, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function semente(): DB {
  const db: DB = { seq: 1, usuarios: [], humor: [], diario: [], respiracao: [], conversas: [], mensagens: [] };
  const id = () => db.seq++;
  db.usuarios.push({ id: 1, email: USUARIO_TESTE.email, name: USUARIO_TESTE.nome, password: null });
  const humores = ['BEM', 'OTIMO', 'MAIS_OU_MENOS', 'BEM', 'ANSIOSO', 'BEM', 'OTIMO', 'MAL', 'BEM', 'MAIS_OU_MENOS', 'OTIMO', 'BEM'];
  const atividades = [['WORK'], ['EXERCISE', 'FRIENDS'], ['STUDY'], ['FAMILY', 'REST'], ['WORK'], ['READING'], ['HOBBY', 'SLEEP_WELL'], ['WORK'], ['MEDITATION'], ['STUDY'], ['FRIENDS'], ['EXERCISE']];
  humores.forEach((mood, i) => {
    const d = diasAtras(i + 1);
    db.humor.push({
      id: id(), userId: 1, mood, note: i % 3 === 0 ? 'Registro de exemplo (mock)' : null,
      activities: atividades[i], imageUrl: null, logDate: dataLocal(d),
      createdAt: d.toISOString(), updatedAt: d.toISOString(),
    });
  });
  [
    { title: 'Um dia leve', text: 'Consegui caminhar no fim da tarde e isso ajudou bastante.', emotion: 'BEM', dias: 1 },
    { title: 'Semana corrida', text: 'Muita coisa no trabalho. Preciso lembrar de pausar.', emotion: 'ANSIOSO', dias: 4 },
    { title: 'Gratidão', text: 'Almoço com a família no domingo. Foi ótimo.', emotion: 'OTIMO', dias: 6 },
  ].forEach((e) => {
    const d = diasAtras(e.dias, 21);
    db.diario.push({ id: id(), userId: 1, title: e.title, text: e.text, emotion: e.emotion, createdAt: d.toISOString(), updatedAt: d.toISOString() });
  });
  [2, 3, 5].forEach((n) => {
    const d = diasAtras(n, 8);
    db.respiracao.push({ id: id(), userId: 1, technique: '3-4-5', cycles: 5, durationSeconds: 60, sessionDate: dataLocal(d), createdAt: d.toISOString() });
  });
  // sessões anteriores com a Pluma (aparecem em "Sessões anteriores" e no "Reabrir última sessão")
  [
    { dias: 3, titulo: 'Ansiedade antes da apresentação', falas: [
      'Amanhã tenho que apresentar um projeto e não consigo parar de pensar que vai dar tudo errado.',
      'Faz sentido o corpo entrar em alerta antes de algo que importa para você. Quando você imagina dando errado, qual é a cena que aparece primeiro?',
      'Eu travando no meio e todo mundo me olhando.',
      'Essa cena tem muita força porque parece real agora. Já aconteceu de você travar e conseguir retomar? Às vezes a gente lembra só do susto e esquece que atravessou.',
    ] },
    { dias: 7, titulo: 'Noites sem dormir direito', falas: [
      'Faz uma semana que eu deito e fico rolando na cama até umas 3h.',
      'Uma semana assim cansa de verdade. O que costuma passar pela sua cabeça nesse horário?',
    ] },
  ].forEach((c) => {
    const d = diasAtras(c.dias, 20);
    const conversa = { id: id(), userId: 1, useCase: 'CHAT', title: c.titulo, createdAt: d.toISOString(), lastMessageAt: d.toISOString() };
    db.conversas.push(conversa);
    c.falas.forEach((content, i) => {
      const quando = new Date(d.getTime() + i * 60000).toISOString();
      db.mensagens.push({ id: id(), conversationId: conversa.id, role: i % 2 ? 'ASSISTANT' : 'USER', content, status: 'SUCCESS', createdAt: quando });
      conversa.lastMessageAt = quando;
    });
  });
  return db;
}

async function carregar(): Promise<DB> {
  try {
    const raw = await AsyncStorage.getItem(DB_KEY);
    const db = raw ? JSON.parse(raw) : null;
    if (db) {
      // banco criado antes do usuário de teste: ele entra como dono dos dados de exemplo, se ninguém for
      if (!db.usuarios.some((u: any) => u.email === USUARIO_TESTE.email) && !db.usuarios.some((u: any) => u.id === 1)) {
        db.usuarios.push({ id: 1, email: USUARIO_TESTE.email, name: USUARIO_TESTE.nome, password: null });
      }
      return db;
    }
  } catch { /* banco corrompido: recria */ }
  const db = semente();
  await salvar(db);
  return db;
}

async function salvar(db: DB): Promise<void> {
  await AsyncStorage.setItem(DB_KEY, JSON.stringify(db));
}

/** Zera o mock (volta aos dados de exemplo na próxima chamada). */
export async function resetarMock(): Promise<void> {
  await AsyncStorage.removeItem(DB_KEY);
}

// ------------------------------------------------------------ helpers

const erro = (status: number, message: string) => erroApi(message, { status });

function usuarioDoToken(db: DB, token: string | null) {
  const id = token ? Number(String(token).replace('mock-', '')) : NaN;
  const u = db.usuarios.find((x) => x.id === id);
  if (!u) throw erro(401, 'Não autenticado');
  return u;
}

function sessaoDe(u: any) {
  const expira = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  return {
    token: 'mock-' + u.id, tokenType: 'Bearer', expiresAt: expira.toISOString(),
    user: { id: u.id, email: u.email, name: u.name, pictureUrl: null },
  };
}

/** Todo dado de exemplo nasce com userId 1 (o usuário de teste); quem mais entrar começa vazio. */
function criarUsuario(db: DB, email: string, name?: string | null) {
  const id = db.usuarios.length === 0 ? 1 : db.seq++;
  const u = { id, email, name: name || email.split('@')[0], password: null };
  db.usuarios.push(u);
  return u;
}

function sequencias(datas: string[]) {
  const dias = [...new Set(datas)].sort();
  let melhor = 0, corrida = 0;
  let anterior: string | null = null;
  dias.forEach((d) => {
    const diff = anterior ? (Date.parse(d) - Date.parse(anterior)) / 86400000 : null;
    corrida = diff === 1 ? corrida + 1 : 1;
    melhor = Math.max(melhor, corrida);
    anterior = d;
  });
  let atual = 0;
  const set = new Set(dias);
  const cursor = new Date();
  if (!set.has(dataLocal(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (set.has(dataLocal(cursor))) {
    atual++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { atual, melhor };
}

function doPeriodo(lista: any[], days: unknown) {
  const n = Number(days) || 7;
  const inicio = dataLocal(diasAtras(n - 1));
  return lista.filter((r) => r.logDate >= inicio);
}

function distribuicao(lista: any[]) {
  const total = lista.length;
  const cont: Record<string, number> = {};
  lista.forEach((r) => { cont[r.mood] = (cont[r.mood] || 0) + 1; });
  const items = Object.keys(SCORE).map((mood) => ({
    mood, count: cont[mood] || 0, percentage: total ? ((cont[mood] || 0) * 100) / total : 0,
  }));
  const top = items.slice().sort((a, b) => b.count - a.count)[0];
  return { items, total, predominant: total ? top.mood : null, predominantPercentage: total ? top.percentage : 0 };
}

function evolucao(lista: any[], days: unknown) {
  const n = Number(days) || 7;
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = dataLocal(diasAtras(i));
    const doDia = lista.filter((r) => r.logDate === date);
    out.push({
      date, count: doDia.length,
      averageScore: doDia.length ? doDia.reduce((s, r) => s + SCORE[r.mood], 0) / doDia.length : null,
    });
  }
  return out;
}

const CRISE = /(suic|me matar|tirar minha vida|não quero mais viver|nao quero mais viver|me machucar|acabar com tudo)/i;

function respostaIa(texto: string, nome?: string | null) {
  if (CRISE.test(texto)) {
    return {
      status: 'CRISIS',
      reply: 'Sinto muito que você esteja passando por isso. Você não está sozinho(a). Ligue agora para o CVV no 188 (24h, gratuito) ou procure o pronto-socorro mais próximo.',
      crisisDetected: true,
      helpResources: [{ name: 'CVV', phone: '188', url: 'https://cvv.org.br' }],
    };
  }
  const respostas = [
    `Obrigada por compartilhar${nome ? ', ' + nome : ''}. Como isso tem afetado o seu dia?`,
    'Entendo. Quer tentar um exercício de respiração rapidinho comigo na aba Respirar?',
    'Faz sentido se sentir assim. O que costuma te ajudar em momentos parecidos?',
    'Estou aqui com você. Se quiser, escreva mais sobre isso no seu diário também.',
  ];
  return {
    status: 'SUCCESS',
    reply: '[mock] ' + respostas[Math.floor(Math.random() * respostas.length)],
    crisisDetected: false,
    helpResources: [] as any[],
  };
}

// ------------------------------------------------------------ rotas

function rotear(db: DB, metodo: string, caminho: string, query: Record<string, string>, body: any, token: string | null): any {
  // ---------- auth (sem token)
  if (caminho === '/v1/auth/login' && metodo === 'POST') {
    if (!body.email || !body.password) throw erro(400, 'Informe email e senha.');
    const u = db.usuarios.find((x) => x.email === body.email) || criarUsuario(db, body.email);
    return sessaoDe(u);
  }
  if (caminho === '/v1/auth/register' && metodo === 'POST') {
    if (db.usuarios.some((x) => x.email === body.email)) throw erro(409, 'Email já cadastrado');
    return sessaoDe(criarUsuario(db, body.email, body.name));
  }
  if (caminho === '/v1/auth/google' && metodo === 'POST') {
    throw erro(503, 'Login com Google não funciona no modo mock. Use email e senha.');
  }

  const u = usuarioDoToken(db, token);
  const meus = (lista: any[]) => lista.filter((x) => x.userId === u.id);
  const achar = (lista: any[], id: string | number) => {
    const item = lista.find((x) => x.id === Number(id) && x.userId === u.id);
    if (!item) throw erro(404, 'Não encontrado');
    return item;
  };
  const agora = () => new Date().toISOString();
  let m: RegExpMatchArray | null;

  // ---------- usuário
  if (caminho === '/v1/users/me') return { id: u.id, email: u.email, name: u.name, pictureUrl: null };

  // ---------- estatísticas
  if (caminho === '/v1/stats') {
    const lista = doPeriodo(meus(db.humor), query.days);
    const dist = distribuicao(lista);
    const seq = sequencias(meus(db.humor).map((r) => r.logDate));
    const n = Number(query.days) || 7;
    return {
      days: n, startDate: dataLocal(diasAtras(n - 1)), endDate: dataLocal(),
      totalEntries: lista.length, predominantMood: dist.predominant,
      currentStreak: seq.atual, longestStreak: seq.melhor,
      evolution: evolucao(lista, query.days), distribution: dist.items,
    };
  }

  // ---------- humor
  if (caminho === '/v1/mood-logs/all') return meus(db.humor);
  if (caminho === '/v1/mood-logs/today') return meus(db.humor).filter((r) => r.logDate === dataLocal());
  if (caminho === '/v1/mood-logs' && metodo === 'GET') {
    const lista = meus(db.humor).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const page = Number(query.page) || 0, size = Number(query.size) || 20;
    const content = lista.slice(page * size, page * size + size);
    const totalPages = Math.ceil(lista.length / size);
    return {
      content, totalPages, totalElements: lista.length, number: page, size,
      first: page === 0, last: page >= totalPages - 1, empty: content.length === 0,
    };
  }
  if (caminho === '/v1/mood-logs' && metodo === 'POST') {
    const r = {
      id: db.seq++, userId: u.id, mood: body.mood, note: body.note || null,
      activities: body.activities || [], imageUrl: null, logDate: dataLocal(),
      createdAt: agora(), updatedAt: agora(),
    };
    db.humor.push(r);
    return r;
  }
  if ((m = caminho.match(/^\/v1\/mood-logs\/(\d+)$/))) {
    const r = achar(db.humor, m[1]);
    if (metodo === 'DELETE') { db.humor = db.humor.filter((x) => x !== r); return null; }
    if (metodo === 'PUT') {
      r.mood = body.mood;
      r.note = body.note || null;
      if (body.activities) r.activities = body.activities;
      r.updatedAt = agora();
    }
    return r;
  }

  // ---------- diário
  if (caminho === '/v1/diary' && metodo === 'GET') {
    const q = (query.q || '').toLowerCase();
    return meus(db.diario).filter((e) => !q || (e.title + ' ' + e.text).toLowerCase().includes(q));
  }
  if (caminho === '/v1/diary' && metodo === 'POST') {
    const e = { id: db.seq++, userId: u.id, title: body.title, text: body.text, emotion: body.emotion || null, createdAt: agora(), updatedAt: agora() };
    db.diario.push(e);
    return e;
  }
  if ((m = caminho.match(/^\/v1\/diary\/(\d+)$/))) {
    const e = achar(db.diario, m[1]);
    if (metodo === 'DELETE') { db.diario = db.diario.filter((x) => x !== e); return null; }
    if (metodo === 'PUT') Object.assign(e, { title: body.title, text: body.text, emotion: body.emotion || null, updatedAt: agora() });
    return e;
  }

  // ---------- respiração
  if (caminho === '/v1/breathing/sessions') {
    if (metodo === 'GET') return meus(db.respiracao);
    if (metodo === 'DELETE') { db.respiracao = db.respiracao.filter((x) => x.userId !== u.id); return null; }
    const s = {
      id: db.seq++, userId: u.id, technique: body.technique, cycles: body.cycles,
      durationSeconds: body.durationSeconds, sessionDate: dataLocal(), createdAt: agora(),
    };
    db.respiracao.push(s);
    return s;
  }
  if (caminho === '/v1/breathing/stats') {
    const lista = meus(db.respiracao);
    return {
      todaySessions: lista.filter((s) => s.sessionDate === dataLocal()).length,
      totalSessions: lista.length,
      totalMinutes: Math.round(lista.reduce((t, s) => t + (s.durationSeconds || 0), 0) / 60),
    };
  }

  // ---------- histórico emocional
  if (caminho === '/api/history/distribution') return distribuicao(doPeriodo(meus(db.humor), query.days));
  if (caminho === '/api/history/evolution') return evolucao(doPeriodo(meus(db.humor), query.days), query.days);
  if (caminho === '/api/history/summary') {
    const seq = sequencias(meus(db.humor).map((r) => r.logDate));
    return {
      totalRecords: meus(db.humor).length, currentStreak: seq.atual, bestStreak: seq.melhor,
      breathingSessions: meus(db.respiracao).length,
    };
  }

  // ---------- IA
  if (caminho === '/v1/ai/chat' && metodo === 'POST') {
    let conversa = body.conversationId && db.conversas.find((c) => c.id === body.conversationId && c.userId === u.id);
    if (body.conversationId && !conversa) throw erro(404, 'Conversa não encontrada');
    if (!conversa) {
      conversa = { id: db.seq++, userId: u.id, useCase: 'CHAT', title: String(body.message).slice(0, 40), createdAt: agora(), lastMessageAt: agora() };
      db.conversas.push(conversa);
    }
    db.mensagens.push({ id: db.seq++, conversationId: conversa.id, role: 'USER', content: body.message, status: 'SUCCESS', createdAt: agora() });
    const r = respostaIa(body.message, body.userName);
    const msg = { id: db.seq++, conversationId: conversa.id, role: 'ASSISTANT', content: r.reply, status: r.status, createdAt: agora() };
    db.mensagens.push(msg);
    conversa.lastMessageAt = msg.createdAt;
    return { conversationId: conversa.id, messageId: msg.id, useCase: 'CHAT', model: 'mock', createdAt: msg.createdAt, ...r };
  }
  if (caminho === '/v1/ai/conversations') {
    return meus(db.conversas).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  }
  if ((m = caminho.match(/^\/v1\/ai\/conversations\/(\d+)\/messages$/))) {
    const c = achar(db.conversas, m[1]);
    return db.mensagens.filter((x) => x.conversationId === c.id);
  }
  if ((m = caminho.match(/^\/v1\/ai\/conversations\/(\d+)$/)) && metodo === 'DELETE') {
    const c = achar(db.conversas, m[1]);
    db.conversas = db.conversas.filter((x) => x !== c);
    db.mensagens = db.mensagens.filter((x) => x.conversationId !== c.id);
    return null;
  }
  if (caminho === '/v1/ai/insights/mood') {
    const dist = distribuicao(doPeriodo(meus(db.humor), body.days));
    return {
      status: 'SUCCESS', useCase: 'MOOD_INSIGHT', model: 'mock', createdAt: agora(), crisisDetected: false, helpResources: [],
      reply: dist.total
        ? `[mock] Nos últimos ${body.days || 7} dias você fez ${dist.total} registro(s); o humor mais comum foi ${dist.predominant}.`
        : '[mock] Ainda não há registros suficientes nesse período.',
    };
  }
  if ((m = caminho.match(/^\/v1\/ai\/mood-logs\/(\d+)\/reflection$/))) {
    achar(db.humor, m[1]);
    return {
      status: 'SUCCESS', useCase: 'MOOD_REFLECTION', model: 'mock', createdAt: agora(), crisisDetected: false, helpResources: [],
      reply: '[mock] Que bom que você parou para registrar como está. Isso já é um cuidado com você.',
    };
  }

  throw erro(404, `Rota não existe no mock: ${metodo} ${caminho}`);
}

// ------------------------------------------------------------ transporte

// Serializa as chamadas: carregar -> rotear -> salvar sem corrida entre requisições paralelas.
let fila: Promise<unknown> = Promise.resolve();

export const transporteMock: Transporte = {
  enviar(req: Requisicao) {
    const tarefa = async () => {
      await new Promise((r) => setTimeout(r, LATENCIA_MS));
      const url = new URL(req.endpoint, 'http://mock');
      const metodo = req.metodo.toUpperCase();
      const db = await carregar();
      let body: any = {};
      if (req.form) {
        const f = req.form;
        body = { mood: f.mood ?? null, note: f.note ?? null, activities: 'activities' in f ? ([] as string[]).concat(f.activities) : null };
      } else if (req.json && typeof req.json === 'object') {
        body = req.json;
      }
      const resp = rotear(db, metodo, url.pathname, Object.fromEntries(url.searchParams), body, req.token);
      await salvar(db);
      return resp === undefined || resp === null ? null : JSON.parse(JSON.stringify(resp));
    };
    const r = fila.then(tarefa, tarefa);
    fila = r.catch(() => undefined);
    return r;
  },
};
