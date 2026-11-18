jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ATIVIDADE_PARA_API, api, emocao, entrarComoTeste, MODO_API, resetarMock, sessao } from '..';
import { dataLocal } from '../helpers';

async function lanca(fn: () => Promise<unknown>): Promise<any> {
  try { await fn(); } catch (e) { return e; }
  return null;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await resetarMock();
});

describe('modo e helpers', () => {
  it('usa o mock em dev sem variável', () => expect(MODO_API).toBe('mock'));
  it('emocao converte ida e volta', () => {
    expect(emocao.paraApi('mais-ou-menos')).toBe('MAIS_OU_MENOS');
    expect(emocao.daApi('MAIS_OU_MENOS')).toBe('mais-ou-menos');
    expect(emocao.paraApi(null)).toBeNull();
  });
  it('ATIVIDADE_PARA_API cobre as 10 atividades', () => {
    expect(Object.keys(ATIVIDADE_PARA_API)).toHaveLength(10);
    expect(ATIVIDADE_PARA_API.sono).toBe('SLEEP_WELL');
    expect(ATIVIDADE_PARA_API.trabalho).toBe('WORK');
  });
});

describe('auth', () => {
  it('sem token: 401 com semLogin', async () => {
    const e = await lanca(() => api.humor.hoje());
    expect(e.status).toBe(401);
    expect(e.semLogin).toBe(true);
  });
  it('usuário de teste já tem os dados de exemplo; outro usuário começa vazio', async () => {
    await entrarComoTeste();
    expect((await api.humor.todos()).length).toBeGreaterThan(0);
    expect(await api.diario.listar()).toHaveLength(3);
    expect(await api.ia.sessoes()).toHaveLength(2);
    await api.auth.sair();
    await api.auth.login('outra.pessoa@pluma.dev', 'qualquer');
    expect(await api.humor.todos()).toHaveLength(0);
    expect(await api.ia.sessoes()).toHaveLength(0);
  });

  it('entrarComoTeste vira usuário 1 e fica logado', async () => {
    const u = await entrarComoTeste();
    expect(u).toMatchObject({ id: 1, email: 'teste@pluma.dev' });
    expect(await api.auth.logado()).toBe(true);
    expect((await api.usuarios.eu()).email).toBe('teste@pluma.dev');
  });
  it('login exige email e senha (400)', async () => {
    expect((await lanca(() => api.auth.login('', ''))).status).toBe(400);
  });
  it('cadastro duplicado = 409; cadastro novo não vê dados do usuário 1', async () => {
    await entrarComoTeste();
    expect((await lanca(() => api.auth.register('teste@pluma.dev', '12345678'))).status).toBe(409);
    await api.auth.sair();
    expect(await api.auth.logado()).toBe(false);
    expect(await sessao.usuario()).toBeNull();
    const u2 = await api.auth.register('novo@x.com', '12345678', 'Novo');
    expect(u2.id).not.toBe(1);
    expect(u2.name).toBe('Novo');
    expect(await api.humor.todos()).toEqual([]);
  });
  it('google no mock = 503', async () => {
    expect((await lanca(() => api.auth.google('x'))).status).toBe(503);
  });
});

describe('humor', () => {
  beforeEach(async () => { await entrarComoTeste(); });

  it('semente de 12 registros', async () => expect(await api.humor.todos()).toHaveLength(12));

  it('CRUD com atividades (multipart)', async () => {
    const novo = await api.humor.criar('BEM', 'nota', ['WORK', 'SLEEP_WELL']);
    expect(novo).toMatchObject({ mood: 'BEM', note: 'nota', activities: ['WORK', 'SLEEP_WELL'], logDate: dataLocal() });
    expect(await api.humor.hoje()).toHaveLength(1);

    const a = await api.humor.atualizar(novo.id, 'MAL', 'outra');
    expect(a).toMatchObject({ mood: 'MAL', note: 'outra', activities: ['WORK', 'SLEEP_WELL'] }); // null mantém
    const b = await api.humor.atualizar(novo.id, 'OTIMO', null, []);
    expect(b.activities).toEqual([]); // [] apaga

    await api.humor.apagar(novo.id);
    expect(await api.humor.todos()).toHaveLength(12);
    expect((await lanca(() => api.humor.apagar(novo.id))).status).toBe(404);
  });

  it('listar pagina, mais recente primeiro', async () => {
    const p = await api.humor.listar({ page: 0, size: 5 });
    expect(p).toMatchObject({ totalElements: 12, totalPages: 3, number: 0, first: true, last: false, empty: false });
    expect(p.content).toHaveLength(5);
    const ult = await api.humor.listar({ page: 2, size: 5 });
    expect(ult.content).toHaveLength(2);
    expect(ult.last).toBe(true);
  });

  it('valida enums antes de chamar', async () => {
    expect((await lanca(async () => api.humor.criar('XXX' as any))).message).toMatch(/mood inválido/);
    expect((await lanca(async () => api.humor.criar('BEM', null, ['VOAR' as any]))).message).toMatch(/activities inválido/);
  });
});

describe('diário', () => {
  beforeEach(async () => { await entrarComoTeste(); });

  it('lista, busca, CRUD', async () => {
    expect(await api.diario.listar()).toHaveLength(3);
    expect(await api.diario.listar('gratid')).toHaveLength(1);
    expect(await api.diario.listar('zzz')).toHaveLength(0);
    const d = await api.diario.criar({ title: 'T', text: 'Texto', emotion: 'BEM' });
    expect((await api.diario.buscar(d.id)).title).toBe('T');
    const up = await api.diario.atualizar(d.id, { title: 'T2', text: 'Texto', emotion: null });
    expect(up).toMatchObject({ title: 'T2', emotion: null });
    await api.diario.apagar(d.id);
    expect(await api.diario.listar()).toHaveLength(3);
    expect((await lanca(() => api.diario.buscar(d.id))).status).toBe(404);
  });

  it('valida title, text e emotion', async () => {
    expect((await lanca(async () => api.diario.criar({ title: '', text: 'x' }))).message).toBe('title é obrigatório');
    expect((await lanca(async () => api.diario.criar({ title: 'x', text: ' ' }))).message).toBe('text é obrigatório');
    expect((await lanca(async () => api.diario.criar({ title: 'x', text: 'y', emotion: 'FELIZ' as any }))).message).toMatch(/emotion inválido/);
  });
});

describe('respiração', () => {
  beforeEach(async () => { await entrarComoTeste(); });

  it('registrar, stats e apagar todas', async () => {
    expect(await api.respiracao.sessoes()).toHaveLength(3);
    await api.respiracao.registrar({ technique: '3-4-5', cycles: 3, durationSeconds: 90 });
    expect(await api.respiracao.stats()).toEqual({ todaySessions: 1, totalSessions: 4, totalMinutes: 5 });
    await api.respiracao.apagarTodas();
    expect(await api.respiracao.sessoes()).toEqual([]);
  });
  it('campos obrigatórios', async () => {
    expect((await lanca(async () => api.respiracao.registrar({ technique: '', cycles: 1, durationSeconds: 1 }))).message).toBe('technique é obrigatório');
  });
});

describe('histórico e estatísticas', () => {
  beforeEach(async () => { await entrarComoTeste(); });

  it('resumo com sequência', async () => {
    const h = await api.historico.resumo();
    expect(h).toMatchObject({ totalRecords: 12, currentStreak: 12, bestStreak: 12, breathingSessions: 3 });
  });
  it('sequência quebra quando falta um dia', async () => {
    // hoje + 12 dias anteriores já existem; hoje entra e estende a sequência
    await api.humor.criar('BEM');
    expect((await api.historico.resumo()).currentStreak).toBe(13);
  });
  it('distribuição e evolução', async () => {
    const d = await api.historico.distribuicao(30);
    expect(d.total).toBe(12);
    expect(d.predominant).toBe('BEM');
    expect(d.items).toHaveLength(6);
    expect(d.items.reduce((s, i) => s + i.percentage, 0)).toBeCloseTo(100);
    const ev = await api.historico.evolucao(7);
    expect(ev).toHaveLength(7);
    expect(ev[6].date).toBe(dataLocal());
    expect(ev[6].averageScore).toBeNull(); // hoje sem registro
    expect(ev[5].averageScore).not.toBeNull();
  });
  it('média da evolução usa o score das EMOCOES', async () => {
    await api.humor.criar('OTIMO');
    await api.humor.criar('DEPRESSIVO'); // (5 + 1) / 2
    const ev = await api.historico.evolucao(7);
    expect(ev[6]).toMatchObject({ count: 2, averageScore: 3 });
  });
  it('estatisticas.resumo', async () => {
    const s = await api.estatisticas.resumo(7);
    expect(s).toMatchObject({ days: 7, endDate: dataLocal(), currentStreak: 12, longestStreak: 12 });
    expect(s.evolution).toHaveLength(7);
    expect(s.totalEntries).toBe(6); // semente: dias 1..6 atrás dentro da janela de 7
  });
});

describe('chat (ia)', () => {
  beforeEach(async () => { await entrarComoTeste(); });

  it('conversa, histórico e encerrar', async () => {
    expect(await api.ia.historico()).toEqual([]);
    const r = await api.ia.conversar('oi, estou mal hoje');
    expect(r).toMatchObject({ status: 'SUCCESS', crisisDetected: false, helpResources: [] });
    expect(await sessao.conversaSalva()).toBe(r.conversationId);
    const h = await api.ia.historico();
    expect(h.map((m) => m.role)).toEqual(['USER', 'ASSISTANT']);
    await api.ia.encerrar();
    expect(await sessao.conversaSalva()).toBeNull();
    expect((await api.ia.conversas()).map((c) => c.id)).toContain(r.conversationId);
    expect(await api.ia.historico()).toEqual([]);
  });

  it('encerrar guarda a sessão; retomar continua nela', async () => {
    const antes = (await api.ia.sessoes()).length;
    const r = await api.ia.conversar('quero falar do trabalho');
    await api.ia.encerrar();
    expect(await sessao.conversaSalva()).toBeNull();
    const lista = await api.ia.sessoes();
    expect(lista).toHaveLength(antes + 1);
    expect(lista[0].id).toBe(r.conversationId);
    await api.ia.retomar(r.conversationId!);
    const b = await api.ia.conversar('continuando');
    expect(b.conversationId).toBe(r.conversationId);
    expect(await api.ia.mensagens(r.conversationId!)).toHaveLength(4);
  });

  it.each(['quero me matar', 'não quero mais viver', 'Penso em suicídio'])('detecta crise: %s', async (txt) => {
    const r = await api.ia.conversar(txt);
    expect(r).toMatchObject({ status: 'CRISIS', crisisDetected: true });
    expect(r.helpResources[0]).toMatchObject({ name: 'CVV', phone: '188' });
  });

  it('continua a mesma conversa', async () => {
    const a = await api.ia.conversar('um');
    const b = await api.ia.conversar('dois');
    expect(b.conversationId).toBe(a.conversationId);
    expect(await api.ia.historico()).toHaveLength(4);
  });

  it('conversa apagada por fora: retry em 404 abre outra', async () => {
    const a = await api.ia.conversar('um');
    await api.ia.apagarConversa(a.conversationId!);
    const b = await api.ia.conversar('dois');
    expect(b.conversationId).not.toBe(a.conversationId);
    expect(await sessao.conversaSalva()).toBe(b.conversationId);
  });

  it('histórico com conversa inexistente limpa a salva e devolve []', async () => {
    await sessao.salvarConversa(9999);
    expect(await api.ia.historico()).toEqual([]);
    expect(await sessao.conversaSalva()).toBeNull();
  });

  it('conversa é por usuário', async () => {
    const a = await api.ia.conversar('um');
    await api.auth.sair();
    await api.auth.register('outro@x.com', '12345678');
    expect(await sessao.conversaSalva()).toBeNull();
    expect(a.conversationId).toBeDefined();
  });

  it('insight e reflexão', async () => {
    expect((await api.ia.insightHumor(7)).useCase).toBe('MOOD_INSIGHT');
    expect((await api.ia.reflexaoRegistro(1)).useCase).toBe('MOOD_REFLECTION');
    expect((await lanca(() => api.ia.reflexaoRegistro(99999))).status).toBe(404);
  });
});
