import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { REGRAS, USUARIO_TESTE } from '@/entities/catalogo';
import { type EstadoLogin, MENSAGENS_LOGIN } from '@/entities/estados';
import { api, entrarComoTeste, GOOGLE_CLIENT_ID, MODO_API } from '@/infrastructure';
import type { ApiError } from '@/models';

import { carregarGoogleIdentity } from './googleIdentity';

function mensagemLogin(err: ApiError, cadastro: boolean): string {
  if (err.offline) return 'Não foi possível conectar ao servidor. Tente de novo em instantes.';
  if (err.status === 401) return MENSAGENS_LOGIN[401];
  if (err.status === 409) return MENSAGENS_LOGIN[409];
  if (err.status === 400) return err.message || MENSAGENS_LOGIN[400];
  return cadastro ? 'Não foi possível criar a conta agora.' : 'Não foi possível entrar agora.';
}

function mensagemGoogle(err: ApiError): string {
  if (err.offline) return 'Não foi possível conectar ao servidor. Tente de novo em instantes.';
  if (err.status === 401) return 'Não conseguimos confirmar sua conta Google. Tente de novo.';
  if (err.status === 409) return 'Este email já está ligado a outra conta Google.';
  if (err.status === 503) return 'O Google não respondeu. Tente de novo em instantes.';
  return 'Não foi possível entrar com o Google agora.';
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useLoginController() {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoLogin>({ tipo: 'editando', modo: 'entrar' });
  const cadastro = estado.modo === 'cadastrar';
  const carregando = estado.tipo === 'enviando';
  const erro = estado.tipo === 'erro' ? estado.mensagem : '';
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [erroSocial, setErroSocial] = useState('');
  const [googleBotaoPronto, setGoogleBotaoPronto] = useState(false);
  const containerGoogle = useRef<unknown>(null);

  // Já logado: vai direto para a home (evita ver o login à toa).
  useEffect(() => {
    let vivo = true;
    api.auth
      .logado()
      .then((logado) => {
        if (vivo && logado) router.replace('/');
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [router]);

  const entrouComGoogle = useCallback(
    async (credential: string) => {
      setErroSocial('');
      try {
        await api.auth.google(credential);
        router.replace('/');
      } catch (e) {
        setErroSocial(mensagemGoogle(e as ApiError));
      }
    },
    [router],
  );

  // Web: botão oficial do Google (Google Identity Services). Se falhar, o botão próprio avisa.
  const [containerPronto, setContainerPronto] = useState(false);
  const registrarContainerGoogle = useCallback((node: unknown) => {
    containerGoogle.current = node;
    setContainerPronto(Boolean(node));
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !GOOGLE_CLIENT_ID || !containerPronto) return;
    let cancelado = false;
    carregarGoogleIdentity()
      .then((google) => {
        const el = containerGoogle.current as HTMLElement | null;
        if (cancelado || !el) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (r) => void entrouComGoogle(r.credential),
          ux_mode: 'popup',
        });
        google.accounts.id.renderButton(el, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          locale: 'pt-BR',
          width: Math.min(el.parentElement?.clientWidth || 320, 400),
        });
        setGoogleBotaoPronto(true);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [containerPronto, entrouComGoogle]);

  const alternarModo = useCallback(() => {
    setEstado((e) => ({ tipo: 'editando', modo: e.modo === 'entrar' ? 'cadastrar' : 'entrar' }));
  }, []);

  const definirModo = useCallback((modo: EstadoLogin['modo']) => {
    // mesmo modo (ou envio em andamento): não mexe; outro modo: limpa o erro do modo anterior
    setEstado((e) => (e.modo === modo || e.tipo === 'enviando' ? e : { tipo: 'editando', modo }));
  }, []);

  const alternarSenha = useCallback(() => setSenhaVisivel((v) => !v), []);

  const enviar = useCallback(async () => {
    if (carregando) return;
    const modo = estado.modo;
    const falha = (mensagem: string) => setEstado({ tipo: 'erro', modo, mensagem });
    const emailLimpo = email.trim();
    if (!emailLimpo) return falha(MENSAGENS_LOGIN.emailVazio);
    if (!EMAIL_VALIDO.test(emailLimpo)) return falha('Informe um email válido.');
    if (!senha) return falha(MENSAGENS_LOGIN.senhaVazia);
    if (modo === 'cadastrar' && (senha.length < REGRAS.SENHA_MIN || senha.length > REGRAS.SENHA_MAX)) {
      return falha(MENSAGENS_LOGIN.senhaTamanho);
    }
    setEstado({ tipo: 'enviando', modo });
    try {
      if (modo === 'cadastrar') await api.auth.register(emailLimpo, senha, nome.trim() || undefined);
      else await api.auth.login(emailLimpo, senha);
      setEstado({ tipo: 'editando', modo });
      router.replace('/');
    } catch (e) {
      falha(mensagemLogin(e as ApiError, modo === 'cadastrar'));
    }
  }, [carregando, estado.modo, email, senha, nome, router]);

  /** Só no modo mock: entra com o usuário de teste, que já tem os dados de exemplo. */
  const entrarTeste = useCallback(async () => {
    if (carregando || MODO_API !== 'mock') return;
    const modo = estado.modo;
    setEstado({ tipo: 'enviando', modo });
    try {
      await entrarComoTeste();
      setEstado({ tipo: 'editando', modo });
      router.replace('/');
    } catch (e) {
      setEstado({ tipo: 'erro', modo, mensagem: mensagemLogin(e as ApiError, false) });
    }
  }, [carregando, estado.modo, router]);

  /** Botão próprio do Google: só aparece enquanto o botão oficial não está pronto. */
  const clicarGoogle = useCallback(() => {
    if (Platform.OS !== 'web') {
      setErroSocial('Login com Google está disponível por enquanto só na versão web. Use email e senha.');
    } else if (!GOOGLE_CLIENT_ID) {
      setErroSocial('Login com Google ainda não configurado (EXPO_PUBLIC_GOOGLE_CLIENT_ID).');
    } else {
      setErroSocial(
        'Não foi possível carregar o login do Google. Verifique sua conexão e recarregue a página.',
      );
    }
  }, []);

  return {
    cadastro, nome, setNome, email, setEmail, senha, setSenha,
    senhaVisivel, alternarSenha, erro, erroSocial, carregando,
    alternarModo, definirModo, enviar, clicarGoogle,
    entrarTeste, modoMock: MODO_API === 'mock', emailTeste: USUARIO_TESTE.email,
    googleWeb: Platform.OS === 'web' && Boolean(GOOGLE_CLIENT_ID),
    googleBotaoPronto, registrarContainerGoogle,
  };
}
