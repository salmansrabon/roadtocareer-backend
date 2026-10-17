// One OpenAI chat call that must answer with JSON matching a strict schema. Shared
// by every AI review feature (assignment Evaluate and chat, exam evaluation) so the
// model, timeout and token budget are set in one place.
const EVALUATION_MODEL = process.env.OPENAI_EVALUATION_MODEL || "gpt-6-luna";
const OPENAI_TIMEOUT_MS = 90000;

// Raw OpenAI chat call that returns the parsed JSON answer. `messages` is the full
// message list; `schema` is the strict JSON schema the answer must follow.
const callOpenAI = async ({ messages, schemaName, schema }) => {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EVALUATION_MODEL,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: { name: schemaName, strict: true, schema },
      },
      // gpt-6-luna is a reasoning model: hidden reasoning tokens count against this
      // budget, and on large multi-source submissions 2000 was all spent on
      // reasoning (finish_reason=length, empty answer). Unused budget is not billed.
      max_completion_tokens: 12000,
    }),
    signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  if (!content) {
    throw new Error(`OpenAI returned an empty response (finish_reason=${choice?.finish_reason}, usage=${JSON.stringify(data.usage)})`);
  }
  return JSON.parse(content);
};

module.exports = { EVALUATION_MODEL, callOpenAI };
