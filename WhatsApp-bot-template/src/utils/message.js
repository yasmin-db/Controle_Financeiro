const { logger } = require("./logger");

const getMessage = (message) => {
  try {
    const content = message.message?.conversation || message.message?.extendedTextMessage?.text;
    const formattedMsg = {
      key: message.key,
      messageTimestamp: message.messageTimestamp,
      pushName: message.pushName,
      content: content || null,
    };
    logger.info(`Mensagem recebida de ${message.pushName}: "${content}"`);
    return formattedMsg;
  } catch (error) {
    logger.error("Erro ao processar mensagem:", error);
    return undefined;
  }
};

module.exports = { getMessage };
