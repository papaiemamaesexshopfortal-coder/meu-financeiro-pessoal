# Plataformas e instalação

O mesmo endereço e a mesma conta atendem Android, iPhone/iPad, Windows, Linux e macOS:
https://meu-financeiro-pessoal-five.vercel.app/

- Android: APK nativo ou instalação pelo Chrome/Edge.
- iPhone/iPad: Safari → Compartilhar → Adicionar à Tela de Início. O projeto nativo Capacitor também tem compilação para simulador no GitHub Actions.
- Windows/Linux: Chrome ou Edge → menu → Instalar aplicativo.
- macOS: Safari compatível → Arquivo → Adicionar ao Dock; Chrome/Edge → Instalar aplicativo.

A tela de entrada e as configurações incluem ajuda de instalação. A disponibilidade do comando depende do navegador e de sua versão. A PWA é instalada pelo navegador; não há executáveis MSI/EXE, DEB/RPM ou DMG nesta entrega.

## Desenvolvimento iOS

Em macOS com Xcode 26.3, Node 24 e ferramentas de linha de comando instaladas:

```sh
npm ci
npm run build
npm run copy:web
npx cap add ios
npm run ios:sync
npx cap open ios
```

`ios/` é gerado pelo Capacitor e não é versionado. O script `configure-ios.js` prepara ícone, suporte iPhone/iPad e manifesto de privacidade da API de arquivos. Executá-lo novamente não duplica recursos. A configuração usa Swift Package Manager.

O workflow `build-ios.yml` gera somente um aplicativo para simulador, sem assinatura. Instalar em aparelhos, usar TestFlight ou publicar na App Store exige conta Apple Developer, certificados, provisionamento, revisão das declarações de privacidade e validação em aparelhos. Não há IPA de distribuição nesta etapa.

## Validação automatizada

`test-platforms.yml` executa instalação limpa, build, TypeScript, testes e cópia de assets em Windows, Linux e macOS. `build-ios.yml` compila para simulador iOS. `build-android.yml` gera o APK de teste. Esses checks não substituem testes de instalação, sincronização e compartilhamento em aparelhos físicos.

Dados financeiros exigem autenticação e conexão ao Supabase para sincronização. Instalar em outro dispositivo usa a mesma conta; dados locais ainda pendentes não são transferidos automaticamente sem sincronizar.
