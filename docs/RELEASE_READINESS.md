# Entrega técnica — 13/10/2026

## Publicado e verificado

- PR #1 integrada em main; versão completa publicada pela Vercel.
- Correção de execução das APIs: compilação NodeNext, compatível com Node. A falha FUNCTION_INVOCATION_FAILED encontrada no teste HTTP foi corrigida. Teste de carga dos módulos compilados incorporado à suíte.
- 26 testes automatizados passaram, além de TypeScript/build. Última auditoria de dependências: zero vulnerabilidades reportadas.
- Em produção: /api/plans e /api/auth/config retornam 200; assinatura, autorização, checkout e cancelamento sem sessão retornam 401; webhook bloqueado retorna 503 BILLING_VALIDATION_REQUIRED.
- Login real concluído no navegador, sessão recuperada após recarregar e segunda aba autenticada automaticamente. Interface atualizada mostra Dados sincronizados e o plano Gratuito.
- Gravação pela interface confirmada no Supabase: revisão avançou e o fingerprint do conteúdo permaneceu igual. Nenhum lançamento ou categoria de teste adicionado aos dados existentes.
- Teste real com duas abas: a segunda gravação com revisão antiga foi bloqueada, mostrou conflito e preservou dados. Retomada pelo botão de sincronização concluída.
- Migrações enforce_finance_account_limits e transactional_billing aplicadas após testes em transações desfeitas. Um documento financeiro existente preservado.
- Teste no banco usando o papel authenticated: leitura/gravação própria, revisão de servidor, limite de contas e isolamento de outra identidade passaram, com ROLLBACK.
- RLS habilitada nas tabelas internas novas; cliente autenticado não pode executar checkout administrativo nem ler inbox. Service role pode executar RPC de checkout.
- Catálogo: Gratuito R$ 0 (1 conta), Premium R$ 39,90/mês (5 contas), Pro R$ 249,90/mês (10 contas). Contas antigas acima do limite são preservadas.
- Premium oferece comparação mensal; Pro oferece demonstrativo gerencial por regime de caixa. DRE contábil, Open Finance, IA, emissão fiscal e cobranças para clientes não estão liberados.
- APK debug compilado com sucesso no Actions (execução 38452072966, commit 013dfa870cfee9c863efddcbc1a5ef6b155e5445). Assets completos conferidos. SHA256: d8d857829601170879f1540345708159210256b5c905ff0796e21b20884270a9.

## Pendências para comercialização

1. **Asaas Sandbox real:** falta acesso efetivo à conta de testes e configuração segura de credenciais exclusivas. A conta Sandbox é separada da produção. Nenhuma requisição de cobrança real executada.
2. **Homologação de billing:** implementação e testes locais cobrem reserva única, retomada sem repetir POST após resultado incerto, CPF/CNPJ válido, leases, eventos repetidos, reconciliação canônica, pagamento/expiração, cancelamento e reembolso. Faltam evidências end-to-end contra a API real do Sandbox e seu webhook.
3. **Autenticação completa:** confirmação e recuperação de e-mail, renovação prolongada de token e duas contas reais precisam de homologação específica. Os testes já realizados não substituem esses cenários.
4. **Offline e aparelhos:** testar perda de rede, recuperação entre aparelhos e o APK em Android real, incluindo exportação/downloads e links de autenticação. O APK é debug; não é release comercial assinada nem publicação na Play Store.
5. **Operação:** definir identidade jurídica, termos/privacidade, suporte, backups recuperáveis, monitoramento e procedimento de reembolso. Não inventar dados do responsável.
6. **Proteção de senhas:** advisor Supabase indicou proteção contra senhas vazadas desativada. Validar disponibilidade e ativação no plano contratado.
7. **Infraestrutura de homologação:** preparar ambiente isolado sem reutilizar chaves de produção no Sandbox. Preview ainda não tem configuração completa; o conector Vercel não fornece valores sensíveis existentes e a API de logs retorna acesso negado. A publicação funciona por GitHub; o acesso completo ao painel continua sem confirmação.

## Critério de liberação

**A versão web está publicada para uso e validação; venda de assinaturas permanece bloqueada.** Não ativar cobrança real somente para cumprir prazo.

Para liberar pagamentos, concluir os cenários reais de criação, confirmação, atraso, repetição/concorrrência, eventos fora de ordem, cancelamento e reembolso no Sandbox; conferir concessão/revogação de acesso; aprovar web e Android em testes reais; revisar a configuração de produção e registrar a liberação após homologação.

Nenhuma chave secreta exposta, cobrança real ou exclusão de dados existentes executada. A gravação de teste preservou exatamente o conteúdo financeiro. O novo cache exclui APIs, autorização e respostas de terceiros; a interface antiga em cache foi superada carregando a versão atualizada.

Teste SQL de billing reproduzível: node scripts/build-billing-db-test.js > /tmp/billing-db-test.sql, executar em sessão PostgreSQL com tabelas-base. Usa tabelas/funções temporárias e ROLLBACK.
