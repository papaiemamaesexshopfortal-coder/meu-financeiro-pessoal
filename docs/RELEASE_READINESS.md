# Validação para comercialização — 13/10/2026

## Verificado

- Repositório acessível com permissão de escrita; base auditada: `b1472754104bb78a6d5d95ddcdadae9a36349384`.
- Supabase `mjiopkegmtmqwvvikxih`: ACTIVE_HEALTHY; RLS habilitada nas seis tabelas públicas auditadas.
- Dados financeiros e categorias possuem políticas por proprietário. Assinaturas permitem leitura própria; dados internos de billing não possuem políticas de cliente, por projeto.
- API pública de planos retorna R$ 0, R$ 39,90 e R$ 249,90.
- Onze testes locais cobrem cache, bloqueio de produção, conflitos, sessão antiga, login/logout em interface com mocks, persistência e atributos HTML de dados importados.
- Limite de contas e documento inválido validados no banco em transação com tabela temporária e ROLLBACK; dados de clientes não modificados.
- `npm audit` após correções: zero vulnerabilidades reportadas (produção e ferramentas), com versões fixadas e lockfile.
- APK debug compilado com sucesso pelo GitHub Actions, execução `38447164284`, commit `e0e3a92e2d836c378c48a409f809547d46ffddfa`. Assets de login e sincronização conferidos dentro do APK. Isso não comprova funcionamento no aparelho.

## Bloqueios de lançamento

1. **Asaas:** sem conector/credencial sandbox acessível nesta sessão. Checkout precisa de reserva transacional para evitar clientes e assinaturas duplicados em requisições concorrentes, reconciliação de falhas parciais, documento CPF/CNPJ validado, cancelamento e retomada de pagamento pendente.
2. **Webhook:** código inicial autentica o token e reconhece duplicações sequenciais, mas ainda precisa de processamento transacional, proteção contra concorrência, eventos fora de ordem, validação independente do valor/cliente/período no Asaas, expiração de acesso e reconciliação de reembolso/cancelamento. Eventos de assinatura desconhecida agora retornam erro recuperável, evitando confirmação silenciosa.
3. **Plano pago:** integrações bancária, IA, emissão fiscal e Pix/boleto para clientes não implementadas. O demonstrativo gerencial não equivale a DRE contábil. Não comercializar prometendo esses recursos.
4. **Autenticação real:** testar dois usuários isolados, confirmação, recuperação, renovação de token, sessões simultâneas, reconexão e conflito entre aparelhos. Testes atuais de interface utilizam mocks e não substituem esse fluxo.
5. **Vercel:** a primeira prévia falhou por exigir diretório `public`. `vercel.json` agora define explicitamente build e saída `www`. A nova prévia está READY (commit `5ca4acffdca61da1acd951cb4c07edb95266dbc6`), mas os testes autenticados ainda estão pendentes. o conector lista apenas `ph-service-fortal` na equipe PROJETOS; embora `get_project` retorne Meu Financeiro Pessoal, a leitura de metadados de ambiente funcionou sem escopo explícito, mas acesso à prévia protegida retorna 403 e logs retornam 404. As seis variáveis existentes estão apenas em produção; o ambiente preview não está configurado. Nenhum valor secreto foi lido. Endpoints públicos podem ser testados via HTTP. Necessário acesso efetivo ao projeto para revisar configuração, logs e ambientes.
6. **Senhas:** advisor indica proteção contra senhas vazadas desativada. Validar disponibilidade do recurso no plano Supabase e configurar via acesso autorizado; não foi alterada.
7. **Android:** validar APK em aparelho, anexos/downloads, links de autenticação e rede offline; preparar assinatura de release e distribuição. O pipeline gera debug, não release comercial.
8. **Operação:** definir política de privacidade e termos com os dados do responsável, suporte, recuperação de backups, monitoramento e procedimentos de reembolso/cancelamento. Não inventar identidade jurídica.

## Critérios mínimos para liberar cobrança

- Todos os testes sandbox de criação, pagamento, atraso, duplicação, cancelamento e reembolso concluídos com evidência.
- Nenhum pagamento pendente concede acesso; acesso expira no período correto.
- Repetições/concorrrência não geram cobrança nem assinatura duplicada.
- Regras de planos impostas no servidor, com isolamento de usuários.
- Versão web e Android aprovadas em testes reais; nenhum segredo em assets/repositório.
- Configuração de produção revisada e liberação explícita registrada após a validação.

A verificação visual em Chromium local foi bloqueada porque o download do navegador retornou 403 por restrição de rede; testes DOM não substituem a revisão visual em aparelho.

Nenhuma cobrança real, webhook do Asaas ou exclusão de dados existentes foi executada nesta sessão.

Assinaturas pagas sem período de acesso (`expires_at`) não concedem acesso na nova consulta de permissões. A implementação do webhook deverá estabelecer esse período após reconciliar o pagamento.

A migração de limite ainda NÃO foi aplicada ao banco de produção; a versão está em PR, sem merge em main até concluir a validação do acesso protegido.

Consulta de planos e permissões usa chave pública e JWT validado, respeitando RLS; service role fica restrita às rotinas administrativas de billing.
