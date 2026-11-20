/*
 * CHAT INTERACTIVO PARA CONSULTAR DEUDAS
 *
 * Azure AI Foundry + Function Calling
 * Interacción mediante terminal
 */

import OpenAI from "openai";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import "dotenv/config";

// ==========================================
// 1. CONFIGURACIÓN DE AZURE
// ==========================================

const CONFIG = {
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  deploymentName: process.env.AZURE_OPENAI_MODEL,
};

for (const [nombre, valor] of Object.entries(CONFIG)) {
  if (!valor) {
    throw new Error(`Falta configurar ${nombre} en .env`);
  }
}

const openai = new OpenAI({
  baseURL: CONFIG.endpoint,
  apiKey: CONFIG.apiKey,
});

// ==========================================
// 2. BASE DE DATOS SIMULADA
// ==========================================

// Arreglo de objetos que reemplaza temporalmente
// a una base de datos MySQL.

const clientes = [
  {
    dni: "12345678",
    nombre: "Carlos",
    deuda: 250.5,
  },
  {
    dni: "87654321",
    nombre: "María",
    deuda: 0,
  },
  {
    dni: "77420150",
    nombre: "Roberto Pablo Barzola Claudio",
    deuda: 80.0,
  },
];

// ==========================================
// 3. ESTADO DE LA CONVERSACIÓN
// ==========================================

let clienteActual = null;
let pagoPendiente = null;
let ultimaRespuestaId = null;

// ==========================================
// 4. FUNCIONES LOCALES
// ==========================================

// Identificar cliente mediante DNI
function identificarCliente({ dni }) {
  // Validar formato del DNI
  if (!/^\d{8}$/.test(dni)) {
    return {
      exito: false,
      mensaje: "El DNI debe contener exactamente 8 dígitos numéricos.",
    };
  }

  // Buscar cliente
  const cliente = clientes.find((c) => c.dni === dni);

  if (!cliente) {
    clienteActual = null;

    return {
      exito: false,
      mensaje: "No existe un cliente registrado con ese DNI.",
    };
  }

  clienteActual = cliente;
  pagoPendiente = null;

  return {
    exito: true,
    mensaje: `Cliente identificado correctamente. Bienvenido, ${cliente.nombre}.`,
    nombre: cliente.nombre,
  };
}

// Consultar deuda actual
function consultarDeuda() {
  if (!clienteActual) {
    return {
      exito: false,
      mensaje: "Primero debes identificarte con tu DNI.",
    };
  }

  return {
    exito: true,
    cliente: clienteActual.nombre,
    deudaActual: clienteActual.deuda,
    mensaje:
      clienteActual.deuda === 0
        ? "Tu deuda ya fue cancelada."
        : `Tu deuda actual es S/ ${clienteActual.deuda.toFixed(2)}.`,
  };
}

// Preparar un pago
function prepararPago({ monto }) {
  if (!clienteActual) {
    return {
      exito: false,
      mensaje: "Primero debes identificarte.",
    };
  }

  // No permitir pagar cuando no existe deuda
  if (clienteActual.deuda <= 0) {
    return {
      exito: false,
      mensaje: "Tu deuda ya fue cancelada. No necesitas realizar otro pago.",
    };
  }

  // Validar monto
  if (typeof monto !== "number" || !Number.isFinite(monto)) {
    return {
      exito: false,
      mensaje: "El monto debe ser un número válido.",
    };
  }

  if (monto <= 0) {
    return {
      exito: false,
      mensaje: "El monto debe ser mayor que cero.",
    };
  }

  // Trabajar con céntimos para evitar errores decimales
  const montoCentimos = Math.round(monto * 100);
  const deudaCentimos = Math.round(clienteActual.deuda * 100);

  if (montoCentimos > deudaCentimos) {
    return {
      exito: false,
      mensaje: `No puedes pagar más de tu deuda actual de S/ ${clienteActual.deuda.toFixed(2)}.`,
    };
  }

  // Guardar pago pendiente sin modificar todavía la deuda
  pagoPendiente = montoCentimos;

  return {
    exito: true,
    monto: (montoCentimos / 100).toFixed(2),
    deudaActual: clienteActual.deuda.toFixed(2),
    mensaje: `Vas a realizar un pago de S/ ${(montoCentimos / 100).toFixed(2)}. ¿Confirmas la operación?`,
  };
}

// Confirmar y ejecutar el pago
function confirmarPago({ confirmar }) {
  if (!clienteActual) {
    return {
      exito: false,
      mensaje: "No hay un cliente identificado.",
    };
  }

  if (pagoPendiente === null) {
    return {
      exito: false,
      mensaje: "No tienes ningún pago pendiente de confirmación.",
    };
  }

  if (confirmar !== true) {
    pagoPendiente = null;

    return {
      exito: false,
      mensaje: "El pago fue cancelado. Tu deuda no ha sido modificada.",
    };
  }

  const deudaCentimos = Math.round(clienteActual.deuda * 100);

  // Comprobar nuevamente antes de modificar
  if (pagoPendiente <= 0 || pagoPendiente > deudaCentimos) {
    pagoPendiente = null;

    return {
      exito: false,
      mensaje: "No se pudo realizar el pago. Verifica el monto.",
    };
  }

  // Descontar el pago de la deuda
  const montoPagado = pagoPendiente;

  const deudaRestante = deudaCentimos - montoPagado;

  clienteActual.deuda = deudaRestante / 100;

  pagoPendiente = null;

  return {
    exito: true,
    montoPagado: (montoPagado / 100).toFixed(2),
    deudaRestante: clienteActual.deuda.toFixed(2),
    mensaje:
      clienteActual.deuda === 0
        ? "¡Excelente! Tu deuda ha sido cancelada completamente."
        : `Pago registrado correctamente. Tu deuda restante es S/ ${clienteActual.deuda.toFixed(2)}.`,
  };
}

// ==========================================
// 5. FUNCIONES DISPONIBLES PARA LA IA
// ==========================================

const funciones = {
  identificarCliente,
  consultarDeuda,
  prepararPago,
  confirmarPago,
};

// ==========================================
// 6. DEFINICIÓN DE TOOLS
// ==========================================

const tools = [
  {
    type: "function",
    name: "identificarCliente",
    description:
      "Identifica al cliente mediante su DNI de 8 dígitos. Debe ejecutarse antes de consultar o pagar una deuda.",
    parameters: {
      type: "object",
      properties: {
        dni: {
          type: "string",
          description: "DNI del cliente, exactamente 8 dígitos.",
        },
      },
      required: ["dni"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "consultarDeuda",
    description:
      "Consulta la deuda actual del cliente previamente identificado.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "prepararPago",
    description:
      "Valida y prepara un pago. Nunca modifica la deuda. Solicita confirmación al cliente antes de ejecutar confirmarPago.",
    parameters: {
      type: "object",
      properties: {
        monto: {
          type: "number",
          description: "Monto que el cliente desea pagar, expresado en soles.",
        },
      },
      required: ["monto"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "confirmarPago",
    description:
      "Ejecuta el pago previamente preparado únicamente cuando el cliente haya confirmado expresamente la operación.",
    parameters: {
      type: "object",
      properties: {
        confirmar: {
          type: "boolean",
          description:
            "True si el cliente confirmó el pago; false si lo rechazó.",
        },
      },
      required: ["confirmar"],
      additionalProperties: false,
    },
    strict: true,
  },
];

// ==========================================
// 7. INSTRUCCIONES DEL ASISTENTE
// ==========================================

const INSTRUCCIONES = `
Eres un asistente virtual de una tienda comercial.

Tu función es ayudar a los clientes a consultar
y pagar sus deudas.

REGLAS:

1. Siempre solicita el DNI del cliente al iniciar.
2. El DNI debe tener exactamente 8 dígitos numéricos.
3. Identifica al cliente utilizando identificarCliente.
4. Si el DNI es incorrecto o el cliente no existe,
   solicita nuevamente su identificación.
5. Después de identificarlo, ofrece dos opciones:

   1. Consultar el estado de su deuda.
   2. Pagar su deuda.

6. Utiliza siempre las funciones locales para consultar
   o modificar la información de los clientes.
7. Nunca inventes nombres, deudas ni pagos.
8. Para consultar la deuda utiliza consultarDeuda.
9. Para pagar, solicita primero el monto.
10. Utiliza prepararPago para validar el monto.
11. Si el monto es inválido, informa el motivo.
12. Si el monto es válido, solicita confirmación.
13. Solo ejecuta confirmarPago cuando el cliente
    haya confirmado expresamente.
14. Nunca permitas pagos negativos, iguales a cero
    o superiores a la deuda.
15. Si la deuda es cero, informa que ya fue cancelada.
16. No permitas realizar nuevos pagos si no existe deuda.
17. Responde siempre en español, de manera breve y amable.

No inventes resultados de las funciones.
`;

// 8. CICLO DE CONVERSACIÓN Y FUNCTION CALLING


async function preguntar(textoUsuario) {
  let inputActual = [
    {
      role: "user",
      content: textoUsuario,
    },
  ];

  // Prevenir ciclos infinitos de llamadas
  for (let vuelta = 0; vuelta < 5; vuelta++) {
    const response = await openai.responses.create({
      model: CONFIG.deploymentName,

      instructions: INSTRUCCIONES,

      input: inputActual,

      tools,

      previous_response_id: ultimaRespuestaId ?? undefined,

      max_output_tokens: 500,

      reasoning: {
        effort: "low",
      },
    });

    ultimaRespuestaId = response.id;

    // Buscar llamadas a funciones
    const llamadas = response.output.filter(
      (item) => item.type === "function_call",
    );

    // Si no hay llamadas, devolver respuesta
    if (llamadas.length === 0) {
      return response.output_text;
    }

    // Ejecutar funciones locales
    inputActual = llamadas.map((llamada) => {
      const args = JSON.parse(llamada.arguments);

      console.log(`\n[Función local] ${llamada.name}`);

      let resultado;

      try {
        const funcion = funciones[llamada.name];

        if (!funcion) {
          throw new Error("Función no disponible.");
        }

        resultado = funcion(args);
      } catch (error) {
        resultado = {
          exito: false,
          mensaje: error.message,
        };
      }

      console.log("[Resultado]", JSON.stringify(resultado));

      return {
        type: "function_call_output",
        call_id: llamada.call_id,
        output: JSON.stringify(resultado),
      };
    });
  }

  return "No pude completar la operación. Intenta nuevamente.";
}

// ==========================================
// 9. INICIAR CHAT EN TERMINAL
// ==========================================

const rl = readline.createInterface({
  input,
  output,
});

console.log("\n======================================");
console.log("       TIENDA - ASISTENTE VIRTUAL");
console.log("======================================");
console.log("Escribe 'salir' para finalizar.\n");

while (true) {
  const texto = await rl.question("Tu: ");

  if (texto.trim().toLowerCase() === "salir") {
    break;
  }

  if (!texto.trim()) {
    continue;
  }

  try {
    const respuesta = await preguntar(texto);

    console.log(`\nIA: ${respuesta}\n`);
  } catch (error) {
    console.error("\nError:", error.message);
  }
}

rl.close();

console.log("\nChat finalizado.");
