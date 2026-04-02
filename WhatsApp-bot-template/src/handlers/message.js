const { logger } = require("../utils/logger");

const sessions = new Map();
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

const CATEGORIES = [
    "alimentacao",
    "transporte",
    "moradia",
    "saude",
    "lazer",
    "educacao",
    "contas",
    "outros",
];

const PAYMENT_METHODS = ["dinheiro", "debito", "credito", "pix", "boleto", "outros"];

const FIELD_LABELS = {
    description: "Descricao",
    category: "Categoria",
    amount: "Valor",
    date: "Data",
    paymentMethod: "Forma de pagamento",
};

const EDIT_FIELD_BY_INDEX = {
    "1": "description",
    "2": "category",
    "3": "amount",
    "4": "date",
    "5": "paymentMethod",
};

const normalizeText = (value) =>
    value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const parseAmount = (text) => {
    const normalized = normalizeText(text).replace(/r\$/g, "").replace(/\s+/g, "");
    const match = normalized.match(/(\d+[\.,]?\d{0,2})/);

    if (!match) {
        return null;
    }

    const parsed = Number(match[1].replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
};

const formatAmount = (amount) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(amount);

const parseCategory = (text) => {
    const normalized = normalizeText(text);
    return CATEGORIES.find((category) => normalized.includes(category)) || null;
};

const parsePaymentMethod = (text) => {
    const normalized = normalizeText(text);
    return PAYMENT_METHODS.find((method) => normalized.includes(method)) || null;
};

const parseDate = (text) => {
    const normalized = normalizeText(text);

    if (normalized === "hoje") {
        return formatDate(new Date());
    }

    if (normalized === "ontem") {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return formatDate(date);
    }

    const match = normalized.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/);
    if (!match) {
        return null;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = match[3] ? Number(match[3]) : new Date().getFullYear();

    if (year < 100) {
        year = 2000 + year;
    }

    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
    }

    return formatDate(date);
};

const createSession = () => ({
    state: "collecting",
    awaitingField: null,
    lastInteractionAt: Date.now(),
    data: {
        description: null,
        category: null,
        amount: null,
        date: null,
        paymentMethod: null,
    },
});

const getMissingFields = (session) => {
    const order = ["description", "category", "amount", "date", "paymentMethod"];
    return order.filter((field) => !session.data[field]);
};

const getQuestionForField = (field) => {
    switch (field) {
        case "description":
            return "Qual foi a descricao do gasto?";
        case "category":
            return `Qual foi a categoria? Opcoes: ${CATEGORIES.join(", ")}.`;
        case "amount":
            return "Qual foi o valor? Exemplo: 59,90";
        case "date":
            return "Qual foi a data? Use DD/MM/AAAA (ou 'hoje'/'ontem').";
        case "paymentMethod":
            return `Qual foi a forma de pagamento? Opcoes: ${PAYMENT_METHODS.join(", ")}.`;
        default:
            return "Pode me informar novamente?";
    }
};

const buildConfirmationText = (session) =>
    [
        "Confere os dados do gasto:",
        `1. ${FIELD_LABELS.description}: ${session.data.description}`,
        `2. ${FIELD_LABELS.category}: ${session.data.category}`,
        `3. ${FIELD_LABELS.amount}: ${formatAmount(session.data.amount)}`,
        `4. ${FIELD_LABELS.date}: ${session.data.date}`,
        `5. ${FIELD_LABELS.paymentMethod}: ${session.data.paymentMethod}`,
        "",
        "Responda com 'sim' para confirmar ou 'nao' para editar.",
    ].join("\n");

const seedSessionWithInitialMessage = (session, text) => {
    session.data.description = text.trim() || null;
    session.data.category = parseCategory(text);
    session.data.amount = parseAmount(text);
    session.data.date = parseDate(text);
    session.data.paymentMethod = parsePaymentMethod(text);
};

const updateField = (session, field, text) => {
    switch (field) {
        case "description": {
            const trimmed = text.trim();
            if (!trimmed) {
                return { ok: false, error: "Descricao nao pode ficar vazia." };
            }
            session.data.description = trimmed;
            return { ok: true };
        }
        case "category": {
            const category = parseCategory(text);
            if (!category) {
                return { ok: false, error: `Categoria invalida. Opcoes: ${CATEGORIES.join(", ")}.` };
            }
            session.data.category = category;
            return { ok: true };
        }
        case "amount": {
            const amount = parseAmount(text);
            if (!amount) {
                return { ok: false, error: "Valor invalido. Exemplo: 59,90" };
            }
            session.data.amount = amount;
            return { ok: true };
        }
        case "date": {
            const date = parseDate(text);
            if (!date) {
                return { ok: false, error: "Data invalida. Use DD/MM/AAAA (ou 'hoje'/'ontem')." };
            }
            session.data.date = date;
            return { ok: true };
        }
        case "paymentMethod": {
            const method = parsePaymentMethod(text);
            if (!method) {
                return {
                    ok: false,
                    error: `Forma de pagamento invalida. Opcoes: ${PAYMENT_METHODS.join(", ")}.`,
                };
            }
            session.data.paymentMethod = method;
            return { ok: true };
        }
        default:
            return { ok: false, error: "Campo invalido para edicao." };
    }
};

const calculateTypingDelay = (text) => {
    // 1 caractere = 80ms
    return text.length * 80;
};

const sendMessageWithDelay = async (bot, chatId, messageObj) => {
    const text = messageObj.text || "";
    const delay = calculateTypingDelay(text);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return bot.sendMessage(chatId, messageObj);
};

const MessageHandler = async (bot, message) => {
    try {
        if (message?.key?.fromMe) {
            return;
        }

        logger.info(`[MessageHandler] Conteudo recebido: "${message.content}"`);
        logger.info(`[MessageHandler] Chat ID: ${message.key.remoteJid}`);

        if (!message.content) {
            logger.warn("[MessageHandler] Mensagem vazia, ignorando");
            return;
        }

        const chatId = message.key.remoteJid;
        const rawContent = message.content.trim();
        const content = normalizeText(rawContent);

        let session = sessions.get(chatId);

        if (session && Date.now() - session.lastInteractionAt > SESSION_TIMEOUT_MS) {
            sessions.delete(chatId);
            session = null;
            await sendMessageWithDelay(bot, chatId, {
                text: "Sua sessao expirou por inatividade. Envie um novo gasto para recomecar.",
            });
        }

        if (content === "cancelar") {
            sessions.delete(chatId);
            await sendMessageWithDelay(bot, chatId, {
                text: "Operacao cancelada. Quando quiser, envie um novo gasto para recomecar.",
            });
            return;
        }

        if (!session) {
            if (content === "oi" || content === "oi!" || content === "ola") {
                await sendMessageWithDelay(bot, chatId, {
                    text: "Ola! Envie uma mensagem com o gasto (descricao, categoria e valor) para comecar.",
                });
                return;
            }

            if (content === "ajuda") {
                await sendMessageWithDelay(bot, chatId, {
                    text: [
                        "Como usar:",
                        "1. Envie o gasto em texto livre.",
                        "2. Eu pego os dados e peco confirmacao.",
                        "3. Responda 'sim' para confirmar ou 'nao' para editar.",
                        "",
                        "Comandos:",
                        "- ajuda",
                        "- cancelar",
                    ].join("\n"),
                });
                return;
            }

            const amount = parseAmount(rawContent);
            if (!amount) {
                await sendMessageWithDelay(bot, chatId, {
                    text: "Nao identifiquei um gasto. Envie algo como: 'Almoco alimentacao 32,50'.",
                });
                return;
            }

            session = createSession();
            seedSessionWithInitialMessage(session, rawContent);
            sessions.set(chatId, session);
        }

        session.lastInteractionAt = Date.now();

        if (session.state === "confirming") {
            const isYes = ["sim", "s", "ok", "confirmar", "confirmo"].includes(content);
            const isNo = ["nao", "não", "n", "editar"].includes(content);

            if (isYes) {
                sessions.delete(chatId);
                await sendMessageWithDelay(bot, chatId, {
                    text: "Perfeito! Gasto confirmado. Na proxima fase eu salvo no banco automaticamente.",
                });
                return;
            }

            if (isNo) {
                session.state = "editing";
                await sendMessageWithDelay(bot, chatId, {
                    text: [
                        "Qual campo deseja editar?",
                        "1 - Descricao",
                        "2 - Categoria",
                        "3 - Valor",
                        "4 - Data",
                        "5 - Forma de pagamento",
                    ].join("\n"),
                });
                return;
            }

            await sendMessageWithDelay(bot, chatId, {
                text: "Responda apenas com 'sim' para confirmar ou 'nao' para editar.",
            });
            return;
        }

        if (session.state === "editing") {
            const selectedField = EDIT_FIELD_BY_INDEX[content];
            if (!selectedField) {
                await sendMessageWithDelay(bot, chatId, {
                    text: "Opcao invalida. Responda com um numero de 1 a 5.",
                });
                return;
            }

            session.awaitingField = selectedField;
            session.state = "collecting";
            await sendMessageWithDelay(bot, chatId, {
                text: getQuestionForField(selectedField),
            });
            return;
        }

        if (session.awaitingField) {
            const result = updateField(session, session.awaitingField, rawContent);
            if (!result.ok) {
                await sendMessageWithDelay(bot, chatId, { text: result.error });
                await sendMessageWithDelay(bot, chatId, {
                    text: getQuestionForField(session.awaitingField),
                });
                return;
            }

            session.awaitingField = null;
        }

        const missingFields = getMissingFields(session);
        if (missingFields.length > 0) {
            const nextField = missingFields[0];
            session.awaitingField = nextField;
            await sendMessageWithDelay(bot, chatId, {
                text: getQuestionForField(nextField),
            });
            return;
        }

        session.state = "confirming";
        await sendMessageWithDelay(bot, chatId, {
            text: buildConfirmationText(session),
        });
    } catch (error) {
        logger.error("[MessageHandler] Erro ao processar mensagem:", error);
    }
};

module.exports = MessageHandler;
