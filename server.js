import "dotenv/config"
import express from "express"
import multer from "multer"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { leerPDF, OcrError } from "./ocr.js"
import { consultarHistoria } from "./chatService.js"

const app = express()

// Procesar solicitudes con contenido JSON
//Directorio donde desplegamos frontend
//Carpeta absoluta independiente Windows / Linux / Mac
const __dirname = path.dirname(fileURLToPath(import.meta.url))

//Puerto del servidor
const PORT = process.env.PORT || 3000

const MAX_FILE_MB = Number(process.env.MAX_FILE_MB) || 4

for(const nombre of ["DI_ENDPOINT", "DI_KEY"]){
  if(!process.env[nombre]){
    console.error(`Falta ${nombre}. Revisa tu archivo .env`)
    process.exit(1)
  }
} 

app.use(express.json({ limit: "10kb" }))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: MAX_FILE_MB * 1024 * 1024, files: 1},
  fileFilter(req, file, cb) {
    if(file.mimetype === 'application/pdf'){
      return cb(null, true)
    }
    cb(new OcrError("El archivo debe ser un PDF", 400))
  }
})

//Servir el fronted 
app.use(express.static(path.join(__dirname, "public")))

//Sugerencia: Colocar archivo de ruta, utilizar archivo "routes"

//Método POST para recibir archivos
app.post('/api/ocr', upload.single("archivo"), async(req, res, next) => {
  try{
    if (!req.file) throw new OcrError("Seleccione un PDF para continuar", 400)
    res.json(await leerPDF(req.file.buffer))
  }catch(e){
    next(e)
  }
})

// Método POST para consultar al asistente de Historia del Perú
app.post("/api/chat", async (req, res, next) => {

  try {

    const { pregunta } = req.body

    // Validar pregunta
    if (typeof pregunta !== "string" || !pregunta.trim()) {
      return res.status(400).json({
        error: "Debes escribir una pregunta"
      })
    }

    // Limitar longitud del mensaje
    if (pregunta.length > 2000) {
      return res.status(400).json({
        error: "La pregunta no puede superar los 2000 caracteres"
      })
    }

    // Consultar Azure AI Foundry
    const respuesta = await consultarHistoria(pregunta.trim())

    return res.json({
      respuesta
    })

  } catch (error) {
    next(error)
  }

})

//Manejo de errores centralizado
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError){
    const message = 
     err.code === 'LIMIT_FILE_SIZE'  
     ?'El pdf supera el limite permitido'
     : "No se pudo procesar el archivo"
  
     return res.status(400).json({error: message})
  }

  if (err instanceof OcrError){
    return res.status(err.status).json({error: err.message})
  }

  console.error(err)
  res.status(500).json({
    error: 'Error interno del servidor'
  })

})

app.listen(PORT, () =>{
  console.log(`Aplicacion ejecutandose en http://localhost:${PORT}`)
})
