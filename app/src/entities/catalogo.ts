/**
 * Catálogo de domínio do Pluma: dados fixos no código (hardcoded), imutáveis em tempo de execução.
 * É a FONTE ÚNICA — tema, telas, mock e testes leem daqui. Não duplique estes valores em outro lugar.
 * Origem: front legado (js/app.js, humor.html, js/respirar.js, js/sons.js, index.html, chat.html).
 */
import type { Activity, Mood } from '@/models';

/** Congela o objeto e tudo dentro dele. */
function congelar<T>(obj: T): Readonly<T> {
  if (obj && typeof obj === 'object') {
    Object.values(obj as object).forEach(congelar);
    Object.freeze(obj);
  }
  return obj;
}

// ------------------------------------------------------------ emoções / humor

export interface Emocao {
  /** valor da API */
  readonly mood: Mood;
  /** id usado na tela e em testID ('mais-ou-menos') */
  readonly id: string;
  readonly label: string;
  readonly emoji: string;
  /** cor base; o texto sobre ela passa por auto-contraste (theme) */
  readonly cor: string;
  /** 1 (pior) a 5 (melhor) — usado na média do gráfico de evolução */
  readonly score: number;
}

export const EMOCOES: readonly Emocao[] = congelar([
  { mood: 'OTIMO', id: 'otimo', label: 'Ótimo', emoji: '😄', cor: '#4CAF50', score: 5 },
  { mood: 'BEM', id: 'bem', label: 'Bem', emoji: '🙂', cor: '#8BC34A', score: 4 },
  { mood: 'MAIS_OU_MENOS', id: 'mais-ou-menos', label: 'Mais ou menos', emoji: '😐', cor: '#FFC107', score: 3 },
  { mood: 'MAL', id: 'mal', label: 'Mal', emoji: '😔', cor: '#FF9800', score: 2 },
  { mood: 'DEPRESSIVO', id: 'depressivo', label: 'Depressivo', emoji: '😢', cor: '#9C27B0', score: 1 },
  { mood: 'ANSIOSO', id: 'ansioso', label: 'Ansioso', emoji: '😰', cor: '#E91E63', score: 1 },
] as Emocao[]);

const EMOCAO_DESCONHECIDA: Emocao = congelar({
  mood: 'MAIS_OU_MENOS', id: 'desconhecido', label: 'Desconhecido', emoji: '😶', cor: '#999999', score: 0,
}) as Emocao;

export function emocaoPorMood(mood: Mood | null | undefined): Emocao {
  return EMOCOES.find((e) => e.mood === mood) ?? EMOCAO_DESCONHECIDA;
}

export function emocaoPorId(id: string | null | undefined): Emocao {
  return EMOCOES.find((e) => e.id === id) ?? EMOCAO_DESCONHECIDA;
}

// ------------------------------------------------------------ atividades

export interface Atividade {
  readonly activity: Activity;
  readonly id: string;
  readonly label: string;
  readonly emoji: string;
}

export const ATIVIDADES: readonly Atividade[] = congelar([
  { activity: 'WORK', id: 'trabalho', label: 'Trabalho', emoji: '💼' },
  { activity: 'EXERCISE', id: 'exercicio', label: 'Exercício', emoji: '🏃' },
  { activity: 'FAMILY', id: 'familia', label: 'Família', emoji: '👨‍👩‍👧' },
  { activity: 'FRIENDS', id: 'amigos', label: 'Amigos', emoji: '🤝' },
  { activity: 'HOBBY', id: 'hobby', label: 'Hobby', emoji: '🎨' },
  { activity: 'REST', id: 'descanso', label: 'Descanso', emoji: '🛋️' },
  { activity: 'STUDY', id: 'estudo', label: 'Estudo', emoji: '📚' },
  { activity: 'MEDITATION', id: 'meditacao', label: 'Meditação', emoji: '🧘' },
  { activity: 'READING', id: 'leitura', label: 'Leitura', emoji: '📖' },
  { activity: 'SLEEP_WELL', id: 'sono', label: 'Dormi bem', emoji: '😴' },
] as Atividade[]);

export function atividadePorId(id: string): Atividade | undefined {
  return ATIVIDADES.find((a) => a.id === id);
}

export function atividadePorActivity(activity: Activity): Atividade | undefined {
  return ATIVIDADES.find((a) => a.activity === activity);
}

// ------------------------------------------------------------ respiração

export type FaseRespiracaoId = 'inhale' | 'hold' | 'exhale';

export interface FaseRespiracao {
  readonly id: FaseRespiracaoId;
  readonly texto: string;
  readonly label: string;
  readonly desc: string;
  /** segundos */
  readonly dur: number;
}

export interface TecnicaRespiracao {
  /** valor enviado em technique para /v1/breathing/sessions */
  readonly id: string;
  readonly nome: string;
  readonly ciclos: number;
  readonly fases: readonly FaseRespiracao[];
}

export const TECNICA_345: TecnicaRespiracao = congelar({
  id: '3-4-5',
  nome: 'Respiração 3-4-5',
  ciclos: 5,
  fases: [
    { id: 'inhale', texto: 'Inspire', label: 'Inspire pelo nariz', desc: 'Encha os pulmões devagar', dur: 3 },
    { id: 'hold', texto: 'Segure', label: 'Segure o ar', desc: 'Mantenha o ar com calma', dur: 4 },
    { id: 'exhale', texto: 'Expire', label: 'Expire pela boca', desc: 'Solte o ar lentamente', dur: 5 },
  ],
}) as TecnicaRespiracao;

export function segundosPorCiclo(t: TecnicaRespiracao): number {
  return t.fases.reduce((s, f) => s + f.dur, 0);
}

export function duracaoTotal(t: TecnicaRespiracao): number {
  return segundosPorCiclo(t) * t.ciclos;
}

// ------------------------------------------------------------ sons ambiente

export interface SomAmbiente {
  readonly id: 'chuva' | 'mar' | 'vento' | 'fogueira' | 'tigelas';
  readonly nome: string;
  readonly emoji: string;
  readonly desc: string;
}

export const SONS: readonly SomAmbiente[] = congelar([
  { id: 'chuva', nome: 'Chuva', emoji: '🌧️', desc: 'Chuva suave na janela' },
  { id: 'mar', nome: 'Ondas do mar', emoji: '🌊', desc: 'Vai e vem tranquilo' },
  { id: 'vento', nome: 'Vento suave', emoji: '🍃', desc: 'Brisa entre as árvores' },
  { id: 'fogueira', nome: 'Fogueira', emoji: '🔥', desc: 'Estalos aconchegantes' },
  { id: 'tigelas', nome: 'Tigelas tibetanas', emoji: '🔔', desc: 'Meditação profunda' },
] as SomAmbiente[]);

// ------------------------------------------------------------ rede de apoio

export interface RecursoApoio {
  readonly id: string;
  readonly titulo: string;
  readonly descricao: string;
  readonly url: string;
  readonly telefone?: string;
  /** destaque de emergência (CVV) */
  readonly emergencia?: boolean;
}

export const CVV_TELEFONE = '188';

export const REDE_APOIO: readonly RecursoApoio[] = congelar([
  {
    id: 'cvv', titulo: 'CVV - Ligue 188', descricao: 'Centro de Valorização da Vida - Apoio emocional 24 horas',
    url: 'https://www.cvv.org.br/', telefone: CVV_TELEFONE, emergencia: true,
  },
  { id: 'psicologos', titulo: 'Encontre um psicólogo', descricao: 'Busque profissionais qualificados perto de você', url: 'https://www.doctoralia.com.br/psicologos' },
  { id: 'terapia-online', titulo: 'Terapia online', descricao: 'Plataforma de terapia online acessível', url: 'https://www.vittude.com/' },
  { id: 'ansiedade', titulo: 'Sobre ansiedade', descricao: 'Entenda os sintomas e aprenda a lidar', url: 'https://www.minhavida.com.br/bem-estar/tudo-sobre/17115-ansiedade' },
] as RecursoApoio[]);

export const POLITICA_PRIVACIDADE_URL = 'https://policy-private-pluma.vercel.app/';

// ------------------------------------------------------------ sessão com a Pluma (tela /chat)

export interface FraseSessao {
  readonly texto: string;
  /** só quando a frase é citação de alguém */
  readonly autor?: string;
}

/** Frase de abertura da sessão, sorteada a cada vez que a tela inicial aparece. */
export const FRASES_SESSAO: readonly FraseSessao[] = congelar([
  { texto: 'Nomear o que você sente já é um jeito de começar a cuidar.' },
  { texto: 'O que não é dito também pede para ser ouvido.' },
  { texto: 'Você não precisa ter tudo resolvido para começar a falar.' },
  { texto: 'O curioso paradoxo é que, quando me aceito como sou, então posso mudar.', autor: 'Carl Rogers' },
  { texto: 'Sentir não é fraqueza. É informação sobre o que importa para você.' },
  { texto: 'Por onde você quer começar hoje?' },
] as FraseSessao[]);

/** Trocadilhos de psicologia que giram enquanto a Pluma "pensa". */
export const PALAVRAS_PENSANDO: readonly string[] = congelar([
  'Escutando nas entrelinhas…', 'Elaborando…', 'Ressignificando…', 'Fazendo associação livre…',
  'Acolhendo sem julgar…', 'Puxando do inconsciente…', 'Ajeitando o divã…', 'Integrando a sombra…',
  'Sublimando a pressa…', 'Validando o que você sente…', 'Desatando nós…', 'Respirando junto…',
  'Organizando as emoções…', 'Procurando um insight…', 'Sem projeções, prometo…', 'Deixando o ego de fora…',
]);

/** Ritmo da sessão (pedido de produto: a resposta nunca sai antes de 4 s, e é digitada em ritmo fixo). */
export const RITMO_SESSAO = congelar({
  /** "pensando" dura entre MIN e MAX ms, mesmo que a resposta já tenha chegado */
  PENSAR_MIN_MS: 4000,
  PENSAR_MAX_MS: 5000,
  /** troca do trocadilho */
  PALAVRA_MS: 1300,
  /** um caractere a cada N ms */
  DIGITAR_MS: 24,
  /** o campo cresce até N linhas; depois rola */
  CAMPO_MAX_LINHAS: 6,
});

// ------------------------------------------------------------ frases

export interface Frase {
  readonly text: string;
  readonly author: string;
}

export const FRASES_MOTIVACIONAIS: readonly Frase[] = congelar([
  { text: 'Cada dia é uma nova oportunidade para cuidar de si mesmo.', author: 'Pluma' },
  { text: 'Você é mais forte do que imagina.', author: 'Pluma' },
  { text: 'Não há problema em não estar bem. O importante é buscar ajuda.', author: 'Pluma' },
  { text: 'A jornada de mil milhas começa com um único passo.', author: 'Lao Tzu' },
  { text: 'Cuide da sua mente, ela é seu bem mais precioso.', author: 'Pluma' },
  { text: 'Respirar fundo é o primeiro passo para a calma.', author: 'Pluma' },
  { text: 'Você merece paz e tranquilidade.', author: 'Pluma' },
  { text: 'Um dia de cada vez. Você está fazendo o seu melhor.', author: 'Pluma' },
  { text: 'Aceite-se como você é. Você é único e especial.', author: 'Pluma' },
  { text: 'A tempestade passa, e o sol sempre volta a brilhar.', author: 'Pluma' },
  { text: 'Permita-se sentir. Suas emoções são válidas.', author: 'Pluma' },
  { text: 'Pequenos progressos ainda são progressos.', author: 'Pluma' },
] as Frase[]);

/** Frase do dia: estável durante o dia (mesmo índice para a mesma data). */
export function fraseDoDia(data: Date = new Date()): Frase {
  const dia = Math.floor(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()) / 86400000);
  return FRASES_MOTIVACIONAIS[dia % FRASES_MOTIVACIONAIS.length];
}

// ------------------------------------------------------------ modo mock

/**
 * Usuário de teste do modo mock (EXPO_PUBLIC_API_URL=mock): já nasce dono dos dados de exemplo
 * (humor, diário, respiração e sessões). O mock aceita qualquer senha.
 */
export const USUARIO_TESTE = congelar({ email: 'teste@pluma.dev', senha: '12345678', nome: 'Teste' });

// ------------------------------------------------------------ regras fixas

export const REGRAS = congelar({
  SENHA_MIN: 8,
  SENHA_MAX: 64,
  NOME_IA_MAX: 60,
  PERIODOS_HISTORICO: [7, 30] as const,
});
