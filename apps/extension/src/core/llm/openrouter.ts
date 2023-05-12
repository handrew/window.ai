import { type ChatMessage } from "window.ai"

import { getExternalConfigBaseURL } from "~core/utils/utils"
import { ModelID } from "~public-interface"

import type { ModelConfig, RequestOptions } from "./model"
import { Model } from "./model"

export enum OpenAIModelId {
  GPT3_5_Turbo = "gpt-3.5-turbo",
  GPT4 = "gpt-4"
}
export function init(
  config: Pick<ModelConfig, "debug"> &
    Partial<Pick<ModelConfig, "cacheGet" | "cacheSet">>,
  opts: RequestOptions
): Model {
  // Configurable to localhost in extension UI
  return new Model(
    {
      modelProvider: "openrouter",
      isStreamable: true,
      overrideModelParam: (req) =>
        req.model === ModelID.GPT3
          ? OpenAIModelId.GPT3_5_Turbo
          : req.model === ModelID.GPT4
          ? OpenAIModelId.GPT4
          : req.model,
      defaultBaseUrl: `${getExternalConfigBaseURL()}/api/v1`,
      getPath: () => "/chat/completions",
      debug: config.debug,
      endOfStreamSentinel: "[DONE]",
      cacheGet: config.cacheGet,
      cacheSet: config.cacheSet,
      transformForRequest: (req, meta) => {
        const {
          stop_sequences,
          num_generations,
          modelProvider,
          prompt,
          baseUrl,
          ...optsToSend
        } = req
        let messages = optsToSend.messages || []
        if (prompt) {
          messages = [
            ...messages,
            {
              role: "user",
              content: prompt
            }
          ]
        }
        return {
          ...optsToSend,
          messages,
          user: meta.user_identifier || undefined,
          stop: stop_sequences.length ? stop_sequences : undefined,
          n: num_generations
        }
      },
      transformResponse: (res) => {
        const anyRes = res as any
        if ("text" in anyRes["choices"][0]) {
          return anyRes["choices"].map((c: any) => c["text"])
        }
        const messages: Partial<ChatMessage>[] = anyRes["choices"].map(
          (c: any) => c["delta"] || c["message"]
        )
        // We default to "" since the "assistant" role is initially sent
        // with no content
        return messages.map((m) => m.content || "")
      }
    },
    opts
  )
}
