import OpenAI from "openai";
import "dotenv/config";

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const deploymentName = process.env.AZURE_OPENAI_MODEL;
const apiKey = process.env.AZURE_OPENAI_API_KEY;

const openai = new OpenAI({
  baseURL: endpoint,
  apiKey : apiKey
})

async function main() {
  //La respuesta se sirve de manera fraccionada
  //instructions: contexto 
  const runner = openai.responses.stream({
    model: deploymentName,
    instructions: "Eres un asistente útil. Reponde en español de forma clara y breve",
    input: "¿Cómo me llamo?",
    max_output_tokens: 1500,
    text: { verbosity: "low"},
    reasoning: { effort: "low" }
  }).on("response.output_text.delta", (diff) => process.stdout.write(diff.delta))

  const result = await runner.finalResponse()
  console.log(`\nToken utilizados: `, result.usage)
}

main()