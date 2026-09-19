# Plano de Projeto Avançado: Todo App Dashboard

Este documento define a arquitetura, o design e o roteiro de implementação para o aplicativo de gerenciamento de tarefas (To-Do App).

---

## 1. Arquitetura do Sistema e Stack Tecnológica

Optamos por uma arquitetura separada (Client/Server) para garantir escalabilidade e uma melhor experiência de desenvolvimento.

### Frontend (Client)
- **Framework:** React 18 + Vite (TypeScript).
- **Roteamento:** React Router v6.
- **Gerenciamento de Estado:**
  - **Server State:** `@tanstack/react-query` (Para cache, fetching e sincronização com o backend).
  - **Client State:** `zustand` (Leve, para controles de UI como modais e temas).
- **Estilização e UI:**
  - **CSS:** Tailwind CSS v3/v4.
  - **Componentes:** shadcn/ui (Radix UI) para componentes acessíveis e customizáveis.
  - **Animações:** Framer Motion (para transições suaves e micro-animações).
  - **Ícones:** Lucide React.

### Backend (Server)
- **Ambiente:** Node.js + Express (TypeScript).
- **Validação de Dados:** Zod (Validação de schemas no backend e frontend).
- **Autenticação:** JWT (JSON Web Tokens) guardados em cookies HttpOnly (maior segurança) ou LocalStorage.
- **Banco de Dados:** SQLite.
- **ORM:** Prisma ORM (Tipagem forte e facilidade em migrações).

---

## 2. Design System & UI/UX

O objetivo é criar uma tela inicial ("Painel de Controle") que gere o fator "Wow", sentindo-se premium e viva.

- **Estética Visual:** 
  - **Tema:** Dark mode elegante por padrão, com opção de Light mode.
  - **Efeitos:** Glassmorphism sutil nos cards principais, bordas com leve opacidade.
  - **Cores (Paleta Sugerida):** 
    - Fundo: `#09090b` (Zinco escuro).
    - Primária: `#6366f1` (Indigo vibrante) para botões de ação e destaques.
    - Sucesso: `#22c55e` (Verde esmeralda) para tarefas concluídas.
    - Perigo/Atrasado: `#ef4444` (Vermelho coral).
    - Aviso/Média Prioridade: `#f59e0b` (Âmbar).
- **Tipografia:** `Inter` ou `Outfit` via Google Fonts.
- **Animações (Micro-interações):**
  - Hover states suaves nos botões.
  - Transições de entrada (`fadeIn`, `slideUp`) ao carregar listas de tarefas.
  - Feedback visual imediato (Optimistic UI) ao marcar uma tarefa como concluída.

### Estrutura do Dashboard (Tela Inicial)
1. **Sidebar (Barra Lateral):** Navegação entre "Meu Dia", "Tarefas", "Calendário", e filtros por "Categoria" e "Tags".
2. **Header (Cabeçalho):** Saudação ao usuário, barra de pesquisa, botão de Nova Tarefa em destaque e toggle de tema.
3. **Painel de Resumo (Cards Superiores):**
   - Total de tarefas ativas.
   - Tarefas concluídas hoje (com barra de progresso).
   - Tarefas atrasadas (em destaque de urgência).
4. **Área Principal:** Lista de tarefas dividida por seções ou ordenação inteligente (Atrasadas primeiro, seguidas de prioridade Alta, etc.).

---

## 3. Modelagem de Dados (Prisma Schema)

Abaixo, a estrutura proposta do banco de dados (SQLite via Prisma):

```prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  tasks     Task[]
  createdAt DateTime @default(now())
}

model Task {
  id          String    @id @default(uuid())
  title       String
  description String?
  dueDate     DateTime?
  priority    Priority  @default(MEDIUM)
  status      Status    @default(TODO)
  
  user        User      @relation(fields: [userId], references: [id])
  userId      String
  
  category    Category? @relation(fields: [categoryId], references: [id])
  categoryId  String?

  tags        Tag[]     @relation("TaskTags")
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Category {
  id     String  @id @default(uuid())
  name   String  @unique
  color  String  // Hex color code for UI dot
  tasks  Task[]
}

model Tag {
  id    String @id @default(uuid())
  name  String @unique
  tasks Task[] @relation("TaskTags")
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum Status {
  TODO
  IN_PROGRESS
  DONE
}
```

---

## 4. Fases de Implementação (Checklist de Ação)

### Fase 1: Setup do Monorepo e Backend Core
- [ ] Inicializar pasta do projeto com subdiretórios `client` e `server`.
- [ ] **Backend:** Iniciar projeto Node com TypeScript, Express e Cors.
- [ ] Configurar o Prisma com SQLite e rodar migração inicial.
- [ ] Implementar sistema de Autenticação (Rotas: `/auth/register`, `/auth/login`, Middleware JWT).
- [ ] Implementar rotas CRUD completas para Tasks (com relacionamentos para Category e Tags).
- [ ] Implementar endpoint de **Analytics/Dashboard** (cálculo de total, concluídas hoje e atrasadas no backend).

### Fase 2: Frontend Foundation & Design System
- [ ] **Frontend:** Inicializar Vite + React + TypeScript.
- [ ] Configurar Tailwind CSS, Google Fonts e shadcn/ui.
- [ ] Configurar React Router (rotas `/login`, `/register`, `/dashboard`).
- [ ] Implementar Contexto/Store de Autenticação (Zustand) para proteger as rotas privadas.
- [ ] Configurar cliente do React Query para chamadas à API.

### Fase 3: Desenvolvimento do Painel de Controle (Dashboard UI)
- [ ] Construir Layout Base (Sidebar responsiva, Header moderno).
- [ ] Criar componentes de Cartões Estatísticos (Kpis de progresso da vida/tarefas do usuário).
- [ ] Integrar dados reais usando React Query no painel estatístico.

### Fase 4: Gerenciamento de Tarefas (UX Avançado)
- [ ] Implementar formulário/modal interativo para Nova Tarefa.
  - DatePicker para `dueDate`.
  - Dropdown com cores para `priority` e `category`.
  - Input iterativo de `tags`.
- [ ] Desenvolver lista de tarefas dinâmica (List Item com animações Framer Motion).
- [ ] Implementar funcionalidade de `Check` (Optimistic Update) para feedback instantâneo.
- [ ] Implementar filtros de Categorias e Tags pela Sidebar.

### Fase 5: Refinamento e Polimento
- [ ] Testes de fluxo (registro -> login -> criar tarefa -> dashboard).
- [ ] Refinamento de cores e dark mode.
- [ ] Tratamento de erros globais (Toasts informativos com shadcn/sonner).

---

> **Aviso de Revisão:** 
> O plano agora contempla tecnologias robustas para garantir que a aplicação possa crescer (TypeScript, Prisma, React Query). 
> Quando estiver pronto para começar, basta enviar o comando **`/create`** ou dizer **"Pode iniciar a Fase 1"**.
