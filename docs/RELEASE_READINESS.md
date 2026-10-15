# Entrega técnica — 13/10/2026

## Continuidade — 15/10/2026

### Revisão de segurança para comercialização — 15/10/2026

- Aplicada no Supabase a migração `20261015111307_billing_minimum_access`: removeu privilégios diretos `anon`/`authenticated` nas quatro tabelas internas de cobrança; `service_role` manteve leitura e as rotinas do servidor. Ajustou as políticas de titularidade de `subscriptions` e `user_categories` para avaliar `auth.uid()` uma vez por consulta e criou o índice de `subscriptions.plan_id`. Sem operações em dados financeiros existentes.
- Verificação posterior confirmou: privilégios diretos dos clientes negados e do serviço mantidos; políticas continuam limitadas ao dono; índice registrado. O advisor deixou de apontar os dois problemas de custo das políticas e a FK sem índice. Os apontamentos `RLS enabled without policy` são informativos e intencionais nas tabelas fechadas por ACL.
- Suíte final local: 37 testes aprovados, TypeScript/build aprovados, `npm audit` reportou zero vulnerabilidades. A regra testada bloqueia billing em production até mesmo com a flag de sandbox ligada.
- Bloqueio remanescente: o Supabase Advisor informa que a proteção de senha vazada está desligada. A documentação do Supabase limita esse controle ao plano Pro ou superior; o plano atual autorizado permanece sem custo mensal. Não alterei o plano nem gerei custo.
- Comercialização de assinaturas continua bloqueada: não há homologação real no Asaas Sandbox (API key exclusiva, cliente/assinatura de teste, eventos webhook, cancelamento e reconciliação); produção segue hard-blocked no código e nenhum webhook de cobrança foi habilitado. O conector Vercel não permitiu consultar metadados dos environment variables (404), então não confirmei se as variáveis atuais e flags de produção correspondem ao bloqueio.
- Também faltam informações do responsável para publicar termos, aviso de privacidade, canal de atendimento e política de reembolso; nenhum texto ou contato legal foi inventado. O artigo 9º da LGPD prevê informações claras, adequadas e ostensivas sobre o tratamento (https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm). A homologação Asaas deve usar exclusivamente chave e URL de Sandbox e testar recebimento de webhook conforme a documentação oficial (https://docs.asaas.com/docs/sandbox, https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook).


### Instalação em cinco sistemas

- Commit 79d9087a0c1f75d609ffdbc9bcb86e5f28675a67 publicado com sucesso na Vercel. HTML, installation.js, manifesto e quatro ícones retornaram HTTP 200 e coincidem byte a byte com o build local. Ajuda dos cinco sistemas aberta e conferida no navegador em produção.
- 37 testes passaram localmente. Instalação limpa, build, TypeScript, todos os testes e cópia web passaram no Windows, Linux e macOS pelo Actions 38722858204.
- PWA com ícones PNG, ícone maskable, Apple touch icon, escopo e identidade; instruções disponíveis antes do login e nas configurações. iOS/iPadOS pelo Safari; Windows/Linux/macOS por navegador compatível. Ver docs/PLATFORMS.md.
- iOS compilado com sucesso no Xcode 26.3, Actions 38722858028; artefato de simulador 11966852593. iPhone/iPad, plugins Filesystem/Share, ícone e manifesto de privacidade preparados. Não foi executado em aparelho físico.
- APK atualizado compilado com sucesso, Actions 38722858063, job 116381445409, artefato 11966792765. HTML, scripts e módulos conferidos byte a byte; ícones e plugins nativos presentes. SHA256: 881d27f4318c5e2ab238aa8caf5a69c850576fcfae75825a27727e5ebd000ff4 (4.622.772 bytes). Continua sendo debug para testes.
- Auditoria completa de dependências, incluindo desenvolvimento: zero vulnerabilidades reportadas.
- Commit de segurança 17e1a1a81ea4f25d7531d9b822c5015c4d8d18b2: Vercel READY; CI Windows/Linux/macOS verde (38726047938), APK debug recompilado com sucesso (38726047982).
- APK é exclusivo do Android. Não há pacote universal nem executáveis de desktop. iOS nativo exige assinatura Apple e homologação em aparelho; compilação para simulador não é IPA para distribuição.


- 35 testes locais passaram, TypeScript/build passaram e auditoria de dependências não reportou vulnerabilidades.
- Catálogo público e permissões agora expõem somente recursos implementados; recursos planejados ficam identificados como planejados e emissão fiscal tem limite público zero. Plano desativado não concede acesso.
- Erros de limite de contas, documento inválido e sessão sem permissão são diferenciados de indisponibilidade de rede. A conexão restabelecida tenta retomar a sincronização respeitando a revisão.
- CSV neutraliza fórmulas em campos textuais e preserva separadores, aspas e quebras de linha ao importar. Exportação Android usa Filesystem/Share nativos para CSV e JSON.
- Interface extraída para app.js, com política CSP de scripts locais, proteção contra framing, atributos executáveis e vazamento de Referer.
- Workflow manual de APK/AAB assinados preparado, com keystore e senhas restritos a secrets e sem publicação automática. Não foi executado com credenciais reais. Ver docs/ANDROID_RELEASE.md.
- Publicação READY confirmada no commit e3df376370f408f8f3b13d919bee4ad574e1f62b; HTTP confirmou CSP, catálogo, assets íntegros, configuração pública 200, sessão ausente 401 e webhook bloqueado 503. JavaScript da interface executou no navegador com 13 meses inicializados e sem erros do aplicativo.
- Novo APK debug compilado no GitHub Actions, execução 38720995976, job 116375221415. Assets conferidos byte a byte, plugins Filesystem/Share presentes e logging nativo desativado. SHA256: 7113c80a18b6045786ac6aa91e1d09f9413594918bf1d8f66f338a0d420961f7 (4.476.164 bytes).
- Não houve nova migração, cobrança real nem alteração de dados financeiros nesta continuidade. Testes reais do Asaas Sandbox e homologação do APK em aparelho continuam pendentes.

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
