# 🔒 Contractus — Portal Seguro de Contratos

O **Contractus** é um portal web corporativo de alta segurança projetado para o armazenamento, distribuição, consulta e auditoria de contratos de eventos e comissões de caixas. O sistema oferece uma interface premium e responsiva no estilo Dark Mode, integrando-se nativamente com a nuvem do Firebase ou operando de forma autônoma em Modo de Simulação Local.

---

## 🚀 Recursos Principais

### 🔒 Controle de Acesso por Função (RBAC)
*   **Administrador:** Acesso irrestrito a todos os contratos do sistema, visualização e limpeza de logs de auditoria detalhados, envio de novos contratos e atribuição dos mesmos a usuários específicos.
*   **Usuário Padrão:** Acesso exclusivo à consulta e download dos contratos que foram explicitamente atribuídos a ele. Não possui acesso ao Painel de Auditoria nem aos contratos de terceiros.

### 📂 Gestão de Contratos e Metadados
*   Suporte a upload de arquivos PDF e Word (.docx, .doc) de até 25 MB.
*   Associação de metadados ricos em cada contrato:
    *   Cidade de origem do contrato.
    *   Cidade de realização do evento (Fashion Day).
    *   Valor do pagamento associado.
    *   Identificação do caixa de comissão destinatário.
    *   Usuário encarregado e data de envio.

### 👁️ Confirmação de Leitura e Download
*   Rastreamento automático: Assim que um usuário baixa seu contrato atribuído, o sistema altera seu status de visualização para **Visualizado** (Lido), fornecendo aos gestores maior previsibilidade e controle sobre a comunicação de termos comerciais.

### 🛡️ Painel de Auditoria Avançado
*   Geração automática de logs para todas as ações cruciais no portal: logins, logouts, envios, downloads e exclusões de contratos.
*   Permite a administradores filtrar eventos e validar quem realizou cada ação, quando e sob quais condições.

### 🎚️ Controles de Acessibilidade
*   Suporte a redimensionamento em tempo real da interface (fator de escala de zoom de 100% a 150%) para melhor usabilidade em diferentes dispositivos e condições visuais, persistido no navegador.

### ⚡ Modo de Simulação Local (Mock Mode)
*   Se o aplicativo for iniciado sem configurações de ambiente do Firebase, ele ativa automaticamente o Modo de Simulação Local.
*   Utiliza o `localStorage` e o `sessionStorage` para emular o banco de dados NoSQL e o estado de autenticação, facilitando apresentações de demonstração e o desenvolvimento ágil offline.

---

## 🛠️ Tecnologias e Design System

*   **Framework Principal:** React 19 (JavaScript) + Vite 8
*   **Estilização:** Vanilla CSS estruturado modularmente, focado em alta fidelidade visual, com suporte nativo a variáveis CSS para redimensionamento de interface.
*   **Pacote de Ícones:** Lucide React
*   **Design & Tipografia:**
    *   Paleta Dark Mode sofisticada com tons de Slate (#0b0f19, #111827) e destaques em Indigo/Violet (#5f5af6) para uma atmosfera de segurança corporativa.
    *   Fontes modernas do Google Fonts: **Outfit** (títulos) e **Inter** (corpo de texto).
*   **Infraestrutura de Nuvem (Opcional):** Firebase Suite:
    *   **Firebase Authentication:** Login seguro.
    *   **Cloud Firestore:** Banco de dados NoSQL para metadados e logs de auditoria.
    *   **Cloud Storage:** Armazenamento seguro de arquivos binários com regras de restrição de escrita e leitura.
    *   **Firebase Hosting:** Hospedagem global escalável.

---

## 📦 Estrutura do Projeto

*   `src/firebase.js`: Camada unificada de dados. Contém os adaptadores para o Firebase real e a simulação offline de banco de dados baseada em `localStorage`.
*   `src/App.jsx`: Componente raiz que orquestra os estados globais do sistema, autenticação, escala de zoom de acessibilidade e alternância de abas.
*   `src/components/`:
    *   `Login.jsx`: Tela de autenticação corporativa com vidro translúcido (glassmorphism) e feedbacks de erro.
    *   `Navbar.jsx`: Menu superior adaptável com botões de logout, escala de zoom e abas de administração (se aplicável).
    *   `Dashboard.jsx`: Grade interativa exibindo estatísticas rápidas, barra de buscas por cidades ou arquivos, e a tabela de contratos com ações de download e exclusão.
    *   `UploadModal.jsx`: Formulário com validações de arquivo (formato e tamanho) e campos específicos de metadados para envio.
    *   `AuditPanel.jsx`: Lista tabular de logs de auditoria com detalhes técnicos em JSON para administradores.
    *   `AccessibilityControls.jsx`: Componente dinâmico para controle de tamanho da fonte.

---

## 🚀 Como Iniciar

### Pré-requisitos
*   [Node.js](https://nodejs.org/) instalado em sua máquina.

### Passos para Execução
1.  Clone este repositório ou navegue até o diretório do projeto:
    ```bash
    git clone https://github.com/ItMeMario/Contractus.git
    cd Contractus
    ```
2.  Instale as dependências necessárias:
    ```bash
    npm install
    ```
3.  Inicie o servidor de desenvolvimento local:
    ```bash
    npm run dev
    ```
4.  Abra o navegador no endereço exibido no terminal (geralmente `http://localhost:5173`).

---

## 🧪 Modo de Simulação (Credenciais de Teste)

Quando executado localmente sem as chaves do Firebase preenchidas no arquivo `.env.local`, você pode utilizar as seguintes credenciais padrão para acessar as contas simuladas:

| E-mail | Senha | Função (Role) | Descrição |
| :--- | :--- | :--- | :--- |
| `admin@contractus.com` | `admin123` | **admin** | Acesso total a painéis, upload, exclusão e auditoria. |
| `user@contractus.com` | `user123` | **user** | Usuário de consulta genérico. |
| `fulano@contractus.com` | `fulano123` | **user** | Associado aos contratos de Belo Horizonte. |
| `deltrano@contractus.com` | `deltrano123` | **user** | Associado aos contratos do Rio de Janeiro. |

---

## 🌐 Configuração do Firebase (Produção)

Para conectar o projeto ao seu projeto real no console do Firebase, preencha o arquivo `.env.local` na raiz com as chaves geradas em suas configurações de app web:

```env
VITE_FIREBASE_API_KEY="SUA_API_KEY"
VITE_FIREBASE_AUTH_DOMAIN="SEU_DOMINIO_AUTH"
VITE_FIREBASE_PROJECT_ID="SEU_ID_DO_PROJETO"
VITE_FIREBASE_STORAGE_BUCKET="SEU_BUCKET_STORAGE"
VITE_FIREBASE_MESSAGING_SENDER_ID="SEU_SENDER_ID"
VITE_FIREBASE_APP_ID="SEU_APP_ID"
```

*Nota: Garanta que as regras de segurança do Firestore (`firestore.rules`) e do Cloud Storage (`storage.rules`) enviadas ao Firebase estejam atualizadas de acordo com os arquivos presentes no repositório.*

---