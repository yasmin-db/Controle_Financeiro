# WhatsApp Bot Template

Um template pronto para uso para criação de bots de WhatsApp utilizando a biblioteca **Baileys**. Este projeto foi desenvolvido com **TypeScript**.

---

## Funcionalidades

- **Estrutura Modular**: Handlers separados para mensagens, facilitando a escalabilidade.
- **Fluxo Financeiro (MVP)**: Coleta descricao, categoria, valor, data e forma de pagamento com confirmacao e edicao.

---

## Tecnologias Principais

- [Node.js](https://nodejs.org/) (v16+)
- [TypeScript](https://www.typescriptlang.org/)
- [Baileys](https://github.com/WhiskeySockets/Baileys)

---

## Como Começar

### Pré-requisitos

Certifique-se de ter o **Node.js** e o **npm** (ou yarn) instalados em sua máquina.

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/luarrekcah/WhatsApp-bot-template.git
cd WhatsApp-bot-template
```

2. Instale as dependências:
```bash
npm install
```

### Uso

#### Desenvolvimento
Para rodar em modo de desenvolvimento com auto-reload:
```bash
npm run dev
```

#### Produção
Para compilar e rodar em produção:
```bash
npm start
```

---

## Configuração

Você pode configurar o método de conexão editando o arquivo `src/index.js`:

- `CONNECTION_TYPE`: Mude para `"QR"` ou `"NUMBER"`.
- `PHONE_NUMBER`: Se usar `"NUMBER"`, insira o número com DDI e DDD (ex: `55689...`).

---

## Fluxo Financeiro (Sem Banco)

O fluxo inicial de controle financeiro ja esta implementado no handler de mensagens.

### Como funciona

1. O usuario envia uma frase de gasto (exemplo: `Almoco alimentacao 32,50`).
2. O bot tenta extrair automaticamente os campos.
3. Se faltar algo, o bot pergunta campo por campo.
4. Ao final, envia um resumo de confirmacao.
5. O usuario responde `sim` para confirmar ou `nao` para editar.
6. Em caso de edicao, o usuario escolhe o campo por numero (1 a 5).

### Campos do gasto

- Descricao
- Categoria: alimentacao, transporte, moradia, saude, lazer, educacao, contas, outros
- Valor (R$)
- Data (`DD/MM/AAAA`, `hoje` ou `ontem`)
- Forma de pagamento: dinheiro, debito, credito, pix, boleto, outros

### Comandos de suporte

- `ajuda`: mostra orientacoes de uso
- `cancelar`: cancela a sessao atual

### Observacoes

- Nesta fase, os dados sao apenas confirmados em conversa (sem persistencia em banco).
- Timeout de sessao: 15 minutos sem interacao.

---

## Estrutura do Projeto

```text
src/
├── handlers/    # Manipuladores de eventos (mensagens, chamadas, etc.)
├── utils/       # Funções utilitárias e configurações globais
└── index.ts     # Ponto de entrada e configuração do socket
```

---

## Termux (Android)

Para rodar diretamente no Android via Termux:

```bash
pkg install git nodejs && git clone https://github.com/luarrekcah/WhatsApp-bot-template.git && cd WhatsApp-bot-template && npm install && npm run dev
```

---

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir uma **Issue** ou enviar um **Pull Request**.

---

## 📄 Licença

Este projeto está sob a licença [ISC](LICENSE).

---

Desenvolvido por [DevLuar](https://devluar.com)
Solicite seu orçamento aqui: https://devluar.com