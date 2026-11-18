import OpenAI from "openai";
import fs from "node:fs"
import "dotenv/config";

/*
Analisis  de archivo utilizando modelo chatgpt 5.4 mini
*/

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const deploymentName = process.env.AZURE_OPENAI_MODEL;
const apiKey = process.env.AZURE_OPENAI_API_KEY;

const openai = new OpenAI({
  baseURL: endpoint,
  apiKey : apiKey
})

const imagenBase64 = fs.readFileSync("factura.jpg").toString("base64")

const pregunta = "¿Qué dice este documento?, retorna los datos del cliente y el total de la factura"

const res = await openai.responses.create({
  model: deploymentName,
  instructions: "Responde siempre en español",
  input: [
    {
      role: "user",
      content: [{
        type: "input_text",
        text: pregunta
      },
      {
        type: "input_image", 
        image_url: `data:image/png;base64,${imagenBase64}`
      }]
    }
  ]
})

console.log(res.output_text)