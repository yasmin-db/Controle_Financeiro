const makeWASocket = require("baileys").default;
const {
  Browsers,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
} = require("baileys");
const qrcode = require("qrcode-terminal");
const { Boom } = require("@hapi/boom");
const { logger } = require("./utils/logger");
const { getMessage } = require("./utils/message");
const MessageHandler = require("./handlers/message");

/**
 * A conexão com o número precisa de correção, mas implementei
 * aqui segundo as docs.
 */

const CONNECTION_TYPE = "QR"; // "NUMBER" (se quiser usar o número para login)
const PHONE_NUMBER = "5515992500307"; // +55 (15) 99250-0307 -> 5515992500307 (formato para número)
const USE_LASTEST_VERSION = true;

const initWASocket = async () => {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const { version, isLatest } = await fetchLatestWaWebVersion({});

  if (USE_LASTEST_VERSION) {
    logger.info(
      `Versão atual do WaWeb: ${version.join(".")} | ${
        isLatest ? "Versão mais recente" : "Está desatualizado"
      }`
    );
  }

  const sock = makeWASocket({
    auth: state,
    browser:
      CONNECTION_TYPE === "NUMBER"
        ? Browsers.ubuntu("Chrome")
        : Browsers.appropriate("Desktop"),
    printQRInTerminal: false,
    version: USE_LASTEST_VERSION ? version : undefined,
    defaultQueryTimeoutMs: 0,
  });

  if (CONNECTION_TYPE === "NUMBER" && !sock.authState.creds.registered) {
    try {
      const code = await sock.requestPairingCode(PHONE_NUMBER);
      logger.info(`Código de Pareamento: ${code}`);
    } catch (error) {
      logger.error("Erro ao obter o código.");
    }
  }

  sock.ev.on(
    "connection.update",
    async ({ connection, lastDisconnect, qr }) => {
      logger.info(
        `Socket Connection Update: ${connection || ""} ${lastDisconnect || ""}`
      );

      switch (connection) {
        case "close":
          logger.error("Conexão fechada");
          // Remover o bot/deletar dados se necessário
          const shouldReconnect =
            lastDisconnect?.error?.output?.statusCode !==
            DisconnectReason.loggedOut;

          if (shouldReconnect) {
            setTimeout(() => initWASocket(), 5000);  // Atraso de 5 segundos antes de reconectar
          }
          break;
        case "open":
          logger.info("Bot Conectado");
          break;
      }

      if (qr !== undefined && CONNECTION_TYPE === "QR") {
        qrcode.generate(qr, { small: true });
      }
    }
  );

  sock.ev.on("messages.upsert", ({ messages }) => {
    for (let index = 0; index < messages.length; index++) {
      const message = messages[index];

      const isGroup = message.key.remoteJid?.endsWith("@g.us");
      const isStatus = message.key.remoteJid === "status@broadcast";
      const isFromMe = Boolean(message.key.fromMe);

      if (isGroup || isStatus || isFromMe) {
        continue;
      }

      // Filtrar mensagens antigas (apenas processar mensagens de menos de 10 segundos)
      const messageTimestamp = Number(message.messageTimestamp || 0);
      const messageAge = messageTimestamp > 0 ? Date.now() / 1000 - messageTimestamp : 0;
      if (messageAge > 10) {
        logger.info(`[MessageHandler] Ignorando mensagem antiga (${Math.round(messageAge)}s)`);
        continue;
      }

      const formattedMessage = getMessage(message);
      if (formattedMessage !== undefined) {
        MessageHandler(sock, formattedMessage);
      }
    }
  });

  // Salvar as credenciais de autenticação
  sock.ev.on("creds.update", saveCreds);
};

// Inicializar o bot com tratamento de erro adequado
initWASocket().catch((error) => {
  logger.error("Erro fatal ao inicializar o bot:", error);
  process.exit(1);
});
