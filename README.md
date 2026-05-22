# Painel_integraNexti

Painel web para acompanhar integrações do IntegraNexti/MsNexti entre o banco intermediário, Protheus/Senior e a API Nexti.

## Intuito do projeto

O objetivo do **Painel_integraNexti** é centralizar a visão operacional das integrações, facilitando a análise de:

- total de registros recebidos;
- registros concluídos, pendentes e com erro;
- logs consolidados por entidade/tabela;
- rotinas de integração ativas, inativas e atrasadas;
- detalhes de payload, retorno e erro;
- reprocessamento visual/operacional de registros permitidos;
- acesso por perfil, separando cliente e admin Maxsystem.

O projeto foi construído para começar como MVP e evoluir para um painel operacional real conectado ao SQL Server.

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Componentes reutilizáveis
- Dados mockados locais

## Como rodar o projeto

Este projeto agora usa uma API backend local para consultar o SQL Server. As credenciais ficam em `.env.local`, que nao deve ser versionado.

```bash
npm install
npm run dev
```

Esse comando sobe dois processos:

- API local em `http://localhost:3001`
- painel Vite em `http://localhost:5173`

Depois acesse a URL exibida pelo Vite, normalmente `http://localhost:5173`.

Também é possível rodar separadamente:

```bash
npm run dev:api
npm run dev:web
```

## Publicar a API no Render

O repositório possui um `render.yaml` para facilitar o deploy da API Express.

No Render:

1. Crie um novo **Web Service**.
2. Conecte este repositório do GitHub.
3. Use:
   - Build Command: `npm install`
   - Start Command: `npm run start:api`
4. Configure as variáveis de ambiente:

```env
DB_HOST=ip-ou-host-do-sql-server
DB_PORT=1433
DB_NAME=nome_do_banco
DB_USER=usuario
DB_PASSWORD=senha
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
CORS_ORIGIN=https://url-do-painel-na-vercel.vercel.app
ADMIN_EMAIL=admin@maxsystem.com.br
ADMIN_INITIAL_PASSWORD=senha-inicial-segura
```

O Render define a variável `PORT` automaticamente. A API usa `PORT` em produção e `API_PORT` somente para desenvolvimento local.

Depois do deploy, teste:

```text
https://sua-api.onrender.com/api/health
```

Essa rota exige sessão nas rotas `/api`, então para testar fluxo real use o login do painel apontando para a URL da API.

## Publicar o frontend na Vercel

No Vercel use:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Configure:

```env
VITE_API_BASE_URL=https://sua-api.onrender.com
VITE_USE_MOCKS=false
```

Login inicial de desenvolvimento:

- Email: `admin@maxsystem.com.br`
- Senha inicial: configurada no backend por `ADMIN_INITIAL_PASSWORD`; se a variável não existir, o seed local usa `Teste123@`.

O arquivo `server/auth-store.json` é criado localmente com hashes de senha e não deve ser versionado.

## Estrutura

- `src/data/mockLogs.ts`: logs mockados.
- `src/data/mockExecutions.ts`: execuções mockadas.
- `src/data/msNextiOperations.ts`: operações extraídas do Swagger MsNexti.
- `src/services/logRepository.ts`: contrato de dados usado pela aplicação.
- `server/index.mjs`: API local que consulta o SQL Server.
- `server/auth.mjs`: autenticação provisória server-side para desenvolvimento, com hash/salt de senha e sessões em memória.
- `src/components/ui`: componentes base no padrão shadcn/ui usados pelo login e gestão.
- `server/logMappings.mjs`: mapeamento das tabelas reais de integração para o formato de logs do painel.
- `.env.example`: exemplo das variáveis de ambiente necessárias.
- `src/types.ts`: tipos principais de logs, execuções e filtros.
- `src/components`: componentes reutilizáveis de cards, gráficos, filtros, tabelas, badges e detalhe lateral.
- `src/utils`: funções de formatação, filtros e métricas.

## Como trocar mocks por dados reais

O app consome dados pela interface `LogRepository` em `src/services/logRepository.ts`.

O Swagger MsNexti encontrado no portal expõe operações de envio de entidades, todas como `POST`. Ele não expõe, no contrato consultado, um endpoint específico de logs. Por isso, o painel usa as operações do Swagger como catálogo/filtro, mas os dados reais de sucesso, erro, pendência, payload e resposta precisam vir de uma tabela/API de logs.

No banco informado, as tabelas `dbo.Log` e `dbo.LogIntMarcVPL` existem, mas estavam vazias no momento da inspeção. Por isso, o MVP passou a derivar logs das tabelas reais de integração, usando campos como:

- `*_IdNexti`: indica integração com Nexti quando preenchido com valor diferente de `0`.
- `*_Erro`: mensagem de erro registrada no banco intermediário.
- `*_AcaoErro`: quando preenchido com `E`, indica erro.
- `*_DataAcaoPend` e campos equivalentes: usados como data do registro quando existem.

Hoje o `App.tsx` usa:

```ts
mockLogRepository.listLogs()
mockLogRepository.listExecutions()
mockLogRepository.listOperations()
```

Para conectar a uma API real, crie uma implementação com o mesmo contrato:

```ts
export const apiLogRepository: LogRepository = {
  async listLogs() {
    const response = await fetch("/api/integranexti/logs");
    if (!response.ok) throw new Error("Falha ao buscar logs");
    return response.json();
  },
  async listExecutions() {
    const response = await fetch("/api/integranexti/executions");
    if (!response.ok) throw new Error("Falha ao buscar execucoes");
    return response.json();
  },
  async listOperations() {
    const response = await fetch("/api/integranexti/operations");
    if (!response.ok) throw new Error("Falha ao buscar operacoes");
    return response.json();
  },
};
```

Depois substitua a importação no `App.tsx`. Para Supabase, SQL Server ou uma API própria, mantenha o formato retornado compatível com `IntegrationLog` e `Execution` em `src/types.ts`.

## Campos esperados

Operações MsNexti mapeadas do Swagger:

- Cargos
- Bairros
- Cidades
- Empresas
- Unidade Negócio
- Escalas
- Escalas - Protheus
- Horários
- Horários Escala
- Sindicatos
- Turmas
- Turmas - Protheus
- Postos de Trabalho
- Tomadores
- Colaboradores
- Caracteristica Postos
- Troca Escala
- Troca Posto
- Lista Ausência
- Colaborador - Protheus
- Dependentes - Protheus
- Situações
- Histórico Sindicato - Protheus
- Lista Ausência - Protheus
- Posto Trabalho e Caracteristica - Protheus
- Tomador - Protheus
- Horários - Protheus
- Horários Escalas - Protheus
- Marcação Horários - Protheus
- Troca Posto - Protheus
- Troca Escala - Protheus

Logs:

- data
- cliente
- ambiente
- entidade
- operação
- ID de origem
- ID no Nexti
- status
- código HTTP
- mensagem
- tentativas
- payload enviado
- resposta da API

Execuções:

- início
- fim
- cliente
- ambiente
- status
- total processado
- total sucesso
- total erro
- total pendente

## Segurança

Este MVP não integra com a API Nexti. Ao conectar dados reais, mantenha credenciais em variáveis de ambiente e nunca exponha tokens ou senhas no frontend.

A autenticação atual é provisória para desenvolvimento:

- Senhas ficam com hash/salt no arquivo server-side `server/auth-store.json`.
- Tokens de sessão ficam em memória no backend e no `sessionStorage` do navegador.
- Antes de produção, migrar usuários/sessões para banco de dados, cookies `HttpOnly`/`Secure`, política de expiração, rotação de senha e auditoria.

## Regras de exibição

O painel apenas lê dados do SQL Server. Ele não remove, atualiza ou apaga registros do banco.

- Bancos com `Engibras` no nome usam a tabela `ParametroGeral`.
- Quando `ParametroGeral.ParTipo = 20` e `Par001 = 1`, o painel prioriza as entidades Protheus quando existir uma dupla equivalente, como `Colaboradores` e `Colaborador - Protheus`.
- Quando `Par001 = 0`, o painel prioriza Senior.
- Bancos sem `Engibras` no nome ocultam entidades Protheus na exibição.
- Entidades `Bairros` e `Cidades` ficam ocultas no painel.
- Essas regras são somente filtros de visualização.
