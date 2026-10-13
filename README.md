# Meu Financeiro Pessoal

Controle financeiro em português com autenticação Supabase, dados locais por usuário e sincronização com controle de revisão.

## Estado de comercialização

**Ainda não liberado para venda.** Cobranças reais são bloqueadas no servidor. Os planos cadastrados são Gratuito R$ 0, Premium R$ 39,90/mês e MEI/PME Pro R$ 249,90/mês.

Funcionalidades implementadas: lançamentos, contas, metas, orçamentos, categorias, CSV e backup JSON; comparação mensal Premium e demonstrativo gerencial por regime de caixa Pro. Limites: 1/5/10 contas, com preservação de contas antigas acima do limite. DRE contábil, Open Finance, IA, emissão fiscal e cobranças para clientes ainda precisam de implementação e provedores. A autorização desses recursos não implementados retorna 501.

## Desenvolvimento e validação

```sh
npm ci
npm run build
npm run typecheck
npm test
npm run copy:web
```

O SDK Supabase é empacotado em `vendor/supabase.js`; o APK não depende de importação de código de um CDN. O arquivo gerado é versionado para a publicação estática existente. Não altere arquivos de `vendor` manualmente.

Use um servidor HTTP para abrir a interface. Os endpoints TypeScript em `api/` rodam como Vercel Functions. Variáveis de configuração estão em `.env.example`; valores secretos ficam exclusivamente no servidor.

## Sincronização

Os dados e alterações pendentes ficam em uma chave por usuário. Escritas usam a revisão do documento; um conflito entre dispositivos pausa a sincronização e preserva a cópia local. Exporte o backup antes de resolver um conflito. Atualizar a tela ou renovar o token não escreve dados. Sair da conta não apaga o documento financeiro.

Aplique `supabase/migrations/20261013182027_enforce_finance_account_limits.sql` junto da nova interface, após validação. O trigger impõe o limite de contas e gera revisões no servidor sem remover contas existentes. Não execute migrações antigas sobre o banco existente sem comparar seu histórico.

## Android

```sh
npm run build
npm run copy:web
npx cap add android
npx cap sync android
node scripts/set-android-icon.js
cd android
./gradlew assembleDebug
```

Android usa Capacitor 8.5.3 (SDK 36), Node 24 e Java 21 no CI. O workflow Android usa `npm ci`, verifica código e testes e gera **APK de depuração**, destinado a testes. Não é uma versão assinada de comercialização. Login e recuperação de senha precisam de teste em aparelho; os links de e-mail atualmente abrem a versão web. Exportação de arquivos no WebView também precisa de validação em aparelho. Publicação na Google Play exige assinatura, revisão do SDK/target API exigido, declaração de privacidade e definição da política de pagamento aplicável.

## Pagamentos

Asaas está restrito a sandbox e usuários de teste explicitamente permitidos por `BILLING_TEST_USER_IDS`. A flag `BILLING_SANDBOX_ENABLED` é `false` por padrão; produção permanece bloqueada mesmo que a flag esteja ativa. O checkout reserva a operação no banco, reconciliando resultados incertos sem repetir POSTs. Webhooks usam uma caixa de entrada durável e uma trava por assinatura; acesso e evento são atualizados na mesma transação. O cancelamento mantém o período já pago. O painel de Sandbox aparece apenas para usuários de teste permitidos.

Aplique também `supabase/migrations/20261013185022_transactional_billing.sql` no ambiente isolado de testes antes de validar o fluxo. Não ative a flag até preparar dados e credenciais de teste e revisar os itens pendentes de `docs/RELEASE_READINESS.md`.
