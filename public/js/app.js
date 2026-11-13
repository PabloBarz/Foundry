/* FRONTEND */

const formulario = document.querySelector("#formulario")
const archivo = document.querySelector("#archivo")
const estado  = document.querySelector("#estado")
const resultado = document.querySelector("#resultados")

formulario.addEventListener("submit", async (e) => {
  e.preventDefault()

  const mostrarResultado = (json) => {
    console.log(json)
  }
  
  const archivoPDF = archivo.files[0]
  if (!archivoPDF) return

  estado.innerText = 'Analizando documento'

  const datos = new FormData() //Podemos enviar binario PDF + campos form
  datos.append("archivo", archivoPDF)

  try{
    const respuesta = await fetch("/api/ocr", {
      method: "POST",
      body: datos
    })

   const json = await respuesta.json().catch(() => ({}))

    if (!respuesta.ok) throw new Error(json.error || "No se pudo analizar el PDF")
    mostrarResultado(json)

  }catch(e){
    console.error(e)
  }
})
