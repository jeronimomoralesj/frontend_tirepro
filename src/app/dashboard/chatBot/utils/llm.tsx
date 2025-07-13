// utils/llm.ts

export const callLLM = async (prompt: string): Promise<string> => {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer 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`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free", // Or any other model you want
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant with expertise in tire data. Respond in Spanish if the user speaks Spanish."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });

    const data = await res.json();

    if (!res.ok || !data.choices || !data.choices[0]?.message?.content) {
      console.error("LLM error response:", data);
      return "Hubo un problema al obtener la respuesta de la IA.";
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error calling LLM:", error);
    return "Lo siento, no pude procesar tu solicitud.";
  }
};
