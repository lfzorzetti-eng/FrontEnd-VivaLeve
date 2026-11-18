import { MotiView } from 'moti';
import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Button, Text, TextField, useReduceMotion } from '@/components/ui';
import { timing } from '@/components/ui/motion';
import type { useLoginController } from '@/controllers/useLoginController';
import { radius, spacing, useTheme } from '@/theme';

type Controle = ReturnType<typeof useLoginController>;

/** Duração das trocas entre Entrar e Criar conta. */
const TROCA = 400;

/** Abas Entrar | Criar conta: controle segmentado com o segmento ativo deslizando. */
function AbasModo({ c }: { c: Controle }) {
  const { colors } = useTheme();
  const reduce = useReduceMotion();
  const [largura, setLargura] = useState(0);
  const metade = largura > 0 ? (largura - 8) / 2 : 0;

  const aba = (modo: 'entrar' | 'cadastrar', rotulo: string) => {
    const ativa = (modo === 'cadastrar') === c.cadastro;
    return (
      <Pressable
        onPress={() => c.definirModo(modo)}
        accessibilityRole="button"
        accessibilityState={{ selected: ativa }}
        testID={`login-aba-${modo}`}
        style={{
          flex: 1,
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="label" tone={ativa ? 'default' : 'muted'}>
          {rotulo}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      onLayout={(e) => setLargura(e.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        padding: 4,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceAlt,
      }}
    >
      {metade > 0 ? (
        <MotiView
          pointerEvents="none"
          animate={{ translateX: c.cadastro ? metade : 0 }}
          transition={timing(reduce ? 0 : TROCA)}
          style={{
            position: 'absolute',
            top: 4,
            bottom: 4,
            left: 4,
            width: metade,
            borderRadius: radius.md - 2,
            backgroundColor: colors.surface,
          }}
        />
      ) : null}
      {aba('entrar', 'Entrar')}
      {aba('cadastrar', 'Criar conta')}
    </View>
  );
}

export interface FormularioLoginProps {
  c: Controle;
  /** título e subtítulo acima das abas */
  centralizado?: boolean;
}

export function FormularioLogin({ c, centralizado }: FormularioLoginProps) {
  const { spacing: sp, colors } = useTheme();
  const reduce = useReduceMotion();
  const deslize = reduce ? undefined : LinearTransition.duration(TROCA);
  const alinhamento = centralizado ? 'center' : 'left';
  // tirados de `c` antes do JSX: o `ref` abaixo faria o lint tratar o objeto inteiro como ref
  const { googleWeb, googleBotaoPronto, registrarContainerGoogle, clicarGoogle, erroSocial } = c;

  return (
    <View style={{ gap: sp.lg }}>
      <MotiView
        key={c.cadastro ? 'cadastrar' : 'entrar'}
        from={{ opacity: 0, translateX: reduce ? 0 : c.cadastro ? 14 : -14 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={timing(reduce ? 0 : TROCA)}
        style={{ gap: sp.xs }}
      >
        <Text variant="title" align={alinhamento}>
          {c.cadastro ? 'Crie sua conta' : 'Bem-vindo de volta'}
        </Text>
        <Text tone="muted" align={alinhamento}>
          {c.cadastro ? 'Leva menos de um minuto. Depois é só começar.' : 'Entre para continuar sua jornada de bem-estar.'}
        </Text>
      </MotiView>

      <AbasModo c={c} />

      <View style={{ gap: sp.md }}>
        {c.cadastro ? (
          <Animated.View
            entering={reduce ? undefined : FadeIn.duration(TROCA).delay(120)}
            exiting={reduce ? undefined : FadeOut.duration(180)}
          >
            <TextField
              label="Nome (opcional)"
              placeholder="Como quer ser chamado"
              value={c.nome}
              onChangeText={c.setNome}
              maxLength={100}
              autoComplete="name"
              textContentType="name"
              testID="login-nome"
            />
          </Animated.View>
        ) : null}
        <Animated.View layout={deslize}>
          <TextField
            label="Email"
            placeholder="voce@email.com"
            value={c.email}
            onChangeText={c.setEmail}
            maxLength={100}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            testID="login-email"
          />
        </Animated.View>
        <Animated.View layout={deslize}>
          <TextField
            label="Senha"
            placeholder={c.cadastro ? 'Entre 8 e 64 caracteres' : 'Sua senha'}
            value={c.senha}
            onChangeText={c.setSenha}
            maxLength={64}
            secure
            autoCapitalize="none"
            autoComplete={c.cadastro ? 'new-password' : 'current-password'}
            textContentType={c.cadastro ? 'newPassword' : 'password'}
            onSubmitEditing={c.enviar}
            returnKeyType="go"
            testID="login-senha"
          />
        </Animated.View>
        {c.erro ? (
          <Text tone="danger" variant="caption" accessibilityRole="alert" testID="login-erro">
            {c.erro}
          </Text>
        ) : null}
        <Animated.View layout={deslize}>
          <Button
            label={c.cadastro ? 'Criar conta' : 'Entrar'}
            onPress={c.enviar}
            loading={c.carregando}
            fullWidth
            testID="login-entrar"
          />
        </Animated.View>
      </View>

      <Animated.View layout={deslize} style={{ gap: sp.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
          <Text tone="muted" variant="caption">
            ou
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
        </View>

        {/* Web: botão oficial do Google (GIS) aparece aqui e esconde o botão próprio */}
        {Platform.OS === 'web' && googleWeb ? (
          <View
            ref={registrarContainerGoogle}
            testID="login-google-oficial"
            style={{
              alignItems: 'center',
              minHeight: googleBotaoPronto ? 44 : 0,
            }}
          />
        ) : null}
        {!googleBotaoPronto ? (
          <Button
            label="Continuar com o Google"
            variant="secondary"
            fullWidth
            onPress={clicarGoogle}
            icon="G"
            testID="login-google"
          />
        ) : null}
        {erroSocial ? (
          <Text tone="danger" variant="caption" align="center" accessibilityRole="alert" testID="login-google-erro">
            {erroSocial}
          </Text>
        ) : null}
        {c.modoMock ? (
          <View style={{ gap: spacing.xs }}>
            <Button
              label="Entrar com usuário de teste"
              variant="ghost"
              fullWidth
              onPress={c.entrarTeste}
              disabled={c.carregando}
              testID="login-teste"
            />
            <Text tone="muted" variant="caption" align="center">
              Modo demonstração: {c.emailTeste}, já com dados de exemplo.
            </Text>
          </View>
        ) : null}

        <Text tone="muted" variant="caption" align="center">
          Ao entrar, você concorda com os Termos de Uso e a Política de Privacidade.
        </Text>
      </Animated.View>
    </View>
  );
}
