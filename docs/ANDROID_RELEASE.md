# Android: compilação e assinatura

O build automático gera APK debug. A homologação em aparelho e os pagamentos continuam pendentes; o workflow de release não os aprova automaticamente.

## Exportação

- Plugins oficiais Capacitor Filesystem 8.1.4 e Share 8.0.3.
- CSV e backup JSON são gravados no cache privado, em UTF-8, e compartilhados pelo destino escolhido pelo usuário na interface Android.
- Nenhuma permissão de acesso amplo aos arquivos é solicitada para esse fluxo.
- O cache pode ser removido pelo sistema; o usuário precisa salvar seu backup no destino desejado. Dados financeiros persistentes continuam no armazenamento do aplicativo e no Supabase.
- Validar salvar/compartilhar, cancelamento e leitura do arquivo em aparelho real.

## Release assinada

1. Usar a chave de upload/assinatura existente, se o aplicativo já tiver uma publicação. Preservar uma cópia protegida do keystore e suas senhas.
2. No GitHub, configurar o ambiente `android-release` com acesso restrito a `main` e revisão para uso de credenciais de publicação.
3. Cadastrar diretamente nesse ambiente os secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` e `ANDROID_KEY_PASSWORD`. Não colocar os valores em mensagens, arquivos do projeto ou artefatos de CI.
4. Atualizar `package.json` com a versão comercial, se necessário. Executar manualmente `Build signed Android release` em `main`, informando um `version_code` maior que os releases anteriores.
5. O workflow executa testes, gera APK e AAB assinados e remove a cópia temporária do keystore. Sem os quatro secrets, a compilação de release falha em vez de produzir um arquivo sem assinatura anunciado como release.
6. Validar a assinatura, instalação, atualização e preservação dos dados em aparelho; depois preparar a distribuição na conta de desenvolvedor do responsável.

APK debug de runners diferentes pode usar certificados distintos. Antes de substituir qualquer instalação de teste, guardar o backup e conferir a assinatura. Não desinstalar uma versão contendo dados sem backup.

O workflow não cria contas, não envia para a Google Play e não ativa pagamentos. A chave privada é acessível apenas nas etapas de assinatura; os artefatos incluem somente APK e AAB.
