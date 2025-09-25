/**
 * Este módulo garante que o pino-pretty esteja carregado e inicializado
 * antes de qualquer log ser gerado.
 *
 * Importar este módulo no início da aplicação ajuda a evitar
 * logs não formatados durante a inicialização.
 */

// Garante que o pino-pretty seja carregado
import "pino-pretty"

// Configura uma variável de ambiente para indicar que o logger foi pré-carregado
process.env.PINO_PRETTY_PRELOADED = "true"

export const isPrettyLoggerPreloaded = (): boolean => {
  return process.env.PINO_PRETTY_PRELOADED === "true"
}
