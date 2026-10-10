# Configuração do Supabase — Obsidian Chess

## O que já foi preparado
- Área de login/cadastro, perfil, busca por nome exato, pedidos/remoção de amizade e top 20 global.
- SQL para perfis, ELO separado (campos IA/online), amizades e regras RLS básicas.
- Skins, GOD MODE e o multiplayer PeerJS da versão anterior foram mantidos.

## Configuração obrigatória
1. Entre em https://supabase.com e crie um projeto.
2. No painel do projeto, abra **SQL Editor → New query**, cole `supabase-schema.sql` e execute.
3. Abra **Project Settings → API** (ou Connect) e copie a Project URL e a chave **anon/public**.
4. Edite `supabase-config.js`: substitua `COLE_A_URL_DO_PROJETO` e `COLE_A_CHAVE_ANON_PUBLIC` pelos valores copiados.
5. Em **Authentication → URL Configuration**, adicione o endereço publicado no Netlify como Site URL e Redirect URL.
6. Em **Authentication → Providers → Email**, escolha se a confirmação por e-mail fica ativada. Se ativada, o jogador deve confirmar antes de entrar.
7. Publique todos os arquivos desta pasta no Netlify, substituindo os antigos. Não publique a chave `service_role` — use somente a chave anon/public no site.
8. Teste com duas contas em navegadores/dispositivos diferentes: criar conta, entrar, pesquisar nome exato, enviar/aceitar pedido, remover amizade e ver ranking.

## Limitações importantes
- Esta é uma integração inicial de perfis/amigos/ranking de leitura; ainda não há fluxo seguro de fim de partida para premiar ELO online. O SQL deliberadamente não permite que o navegador altere `elo_online` livremente.
- Para completar o ELO online real, precisa criar uma **Supabase Edge Function** que valide a partida concluída (participantes, resultado, jogo não duplicado) e atualize os dois ratings atomicamente. O multiplayer atual transmite jogadas via PeerJS, mas não é por si só uma autoridade confiável para resultados competitivos.
- O ELO da IA continua local no dispositivo no código anterior; o campo `elo_ai` foi criado no banco para a futura sincronização, mas ainda não é atualizado automaticamente.
- O GOD MODE não deve contar para partidas ranqueadas. Recomenda-se desabilitar modo ranqueado quando GOD MODE estiver ativo.
- A integração não foi testada contra um projeto Supabase real porque exige suas credenciais e publicação. Nunca coloque a chave `service_role` em arquivos do site.


## Configuração já preenchida nesta cópia
A URL do projeto e a chave Publishable informadas foram colocadas em `supabase-config.js`. A URL foi normalizada para a raiz do projeto (sem `/rest/v1/`). Não use chaves `secret` ou `service_role` no navegador.
