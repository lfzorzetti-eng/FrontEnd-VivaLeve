import { expect, test as base, type Page } from '@playwright/test';

/** Data fixa: saudação, "hoje" e dados do mock ficam estáveis nos screenshots. */
export const DATA_FIXA = new Date('2026-11-17T10:00:00-03:00');

export const TELAS = [
  { rota: '/', nome: 'home', pronta: 'home-saudacao' },
  { rota: '/humor', nome: 'humor', pronta: 'humor-data' },
  { rota: '/diario', nome: 'diario', pronta: 'diario-novo' },
  { rota: '/historico', nome: 'historico', pronta: 'historico-total' },
  { rota: '/respirar', nome: 'respirar', pronta: 'respirar-card' },
  { rota: '/chat', nome: 'chat', pronta: 'chat-input' },
  { rota: '/config', nome: 'config', pronta: 'config-usuario' },
] as const;

export async function entrar(page: Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill('teste@pluma.dev');
  await page.getByTestId('login-senha').fill('senha12345');
  await page.getByTestId('login-entrar').click();
  await expect(page).not.toHaveURL(/login/);
}

/** Elementos animados/dinâmicos que não entram na comparação de pixels. */
export const mascaras = (page: Page) => [
  page.getByTestId('hero-scene'),
  page.getByTestId('home-hero-3d'),
  page.getByTestId('breathing-orb'),
  page.getByTestId('respirar-orb'),
  page.getByTestId('respirar-timer'),
];

export const test = base.extend<{ logado: Page }>({
  logado: async ({ page }, use) => {
    await page.clock.install({ time: DATA_FIXA });
    await entrar(page);
    await use(page);
  },
});
export { expect };

/** A rolagem é interna: cresce a viewport até caber o conteúdo rolável inteiro (máx. 6000px). */
export async function expandirViewport(page: Page) {
  const atual = page.viewportSize()!;
  const extra = await page.evaluate(() => {
    let max = 0;
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight) max = Math.max(max, el.scrollHeight - el.clientHeight);
    });
    return max;
  });
  if (extra > 0) {
    await page.setViewportSize({ width: atual.width, height: Math.min(6000, atual.height + extra) });
    await page.waitForTimeout(500);
  }
}
