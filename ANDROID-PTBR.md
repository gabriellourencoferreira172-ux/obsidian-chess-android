# Obsidian Chess para Android — instruções em português

Este pacote contém os arquivos web do jogo e a configuração Capacitor. **Ele ainda não é um APK instalado/compilado.** A compilação Android exige Android SDK/Gradle; este pacote pode ser compilado no GitHub Actions ou Android Studio.

## Jeito recomendado para gerar APK sem computador (GitHub Actions)
1. Entre/crie uma conta em https://github.com/ pelo celular.
2. Crie um repositório novo, por exemplo `obsidian-chess-android`.
3. Envie o conteúdo desta pasta `android-app` para a raiz do repositório. É mais fácil usar o site do GitHub no navegador em modo computador ou o app GitHub.
4. Depois que os arquivos estiverem no repositório, abra a aba **Actions** e rode o workflow **Build Android APK** (se o GitHub pedir, habilite Actions).
5. Quando terminar com sucesso, abra a execução e baixe o artefato `obsidian-chess-debug-apk`.
6. Extraia o ZIP do artefato e instale `app-debug.apk` no Android. Talvez seja necessário permitir instalação desta fonte nas configurações do Android.

## Compilar com Android Studio
Requer Node.js, JDK 17 e Android SDK. Na pasta deste projeto:
```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```
No Android Studio, gere APK de teste por **Build > Build APK(s)**.

## Publicar para outras pessoas
Para testes, compartilhe o APK debug apenas com pessoas de confiança. Para Google Play, gere um **Android App Bundle (AAB) assinado** com uma chave de assinatura própria, complete a ficha da loja, política de privacidade, classificação etária e os requisitos de testes da conta. Não envie um APK debug para a Play Store.

## Importante
- Este pacote não confirma que login, amizades, partidas online ou ELO funcionam no backend. Eles precisam ser testados com o projeto Supabase e políticas seguras.
- A chave `sb_publishable` pode estar no cliente; nunca inclua `service_role`/`sb_secret` no app.
- Antes de lançar publicamente, corrija as permissões de `profiles`: o usuário não deve poder alterar `elo_online`, vitórias ou derrotas diretamente.
