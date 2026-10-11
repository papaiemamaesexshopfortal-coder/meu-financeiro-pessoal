# Meu Financeiro Pessoal

Aplicativo de controle financeiro pessoal, leve e responsivo, em português do Brasil.

## Recursos
- Painel com receitas, despesas, saldo mensal e gráfico dos últimos seis meses.
- Lançamentos de receitas e despesas com data, categoria, conta e observações.
- Cadastro de contas com cálculo de saldo a partir do saldo inicial e dos lançamentos.
- Orçamentos por categoria, metas financeiras e relatórios mensais.
- Busca e filtros por tipo, categoria e conta.
- Exportação CSV, importação CSV e backup/restauração JSON.
- Dados armazenados localmente no navegador via `localStorage`; sem integração bancária e sem servidor de dados.
- Layout adaptável para computador e celular, sem dependências externas.

## Publicar no Vercel
O projeto é estático. Importe este repositório no Vercel com:
- Framework Preset: **Other**
- Root Directory: **./**
- Build Command: deixar em branco
- Output Directory: deixar em branco (ou `.` se solicitado)

Cada alteração enviada para a branch `main` pode disparar uma nova implantação quando o repositório estiver conectado ao Vercel.

## Uso local
Abra `index.html` no navegador. Os dados são salvos no navegador atual. Use **Configurações → Baixar backup JSON** para guardar uma cópia.

## Privacidade
Este aplicativo não pede credenciais bancárias. Os dados financeiros são armazenados no navegador local e não são enviados a um servidor por este código. Limpar os dados do navegador pode apagar o conteúdo; mantenha backups regulares.


### Categorias de despesas
O formulário de despesas inclui as categorias **Água**, **Energia** e **Internet**, além das categorias já existentes.
