const classificationForm = document.getElementById("classificationForm");
const textInput = document.getElementById("textInput");
const classifyButton = document.getElementById("classifyButton");
const charCount = document.getElementById("charCount");
const statusMessage = document.getElementById("statusMessage");
const results = document.getElementById("results");


textInput.addEventListener("input", () => {

    charCount.textContent =
        `${textInput.value.length} / 12000 caracteres`;

});


function mostrarResultados(data) {

    document.getElementById("categoryResult").textContent =
        data.categoria;

    document.getElementById("sentimentResult").textContent =
        data.sentimiento;

    document.getElementById("intentionResult").textContent =
        data.intencion;

    document.getElementById("summaryResult").textContent =
        data.resumen;

    document.getElementById("explanationResult").textContent =
        data.explicacion;

    // Mostrar emociones

    const emotionsContainer =
        document.getElementById("emotionsResult");

    emotionsContainer.replaceChildren();

    if (data.emociones.length === 0) {

        emotionsContainer.textContent = "No se identificaron emociones";

    } else {

        data.emociones.forEach(emocion => {

            const tag = document.createElement("span");
            tag.classList.add("emotion-tag");
            tag.textContent = emocion;
            emotionsContainer.appendChild(tag);

        });

    }

    results.classList.remove("hidden");

}


classificationForm.addEventListener("submit", async (event) => {

    event.preventDefault();
    const texto = textInput.value.trim();

    // Validar texto vacío

    if (!texto) {

        statusMessage.textContent =
            "Escribe un texto para continuar.";

        statusMessage.className = "status-message error";
        return;

    }

    // Limpiar resultados anteriores

    results.classList.add("hidden");
    statusMessage.textContent = "Analizando texto con GPT-6-Luna...";
    statusMessage.className = "status-message loading";
    classifyButton.disabled = true;
    classifyButton.textContent = "Clasificando...";

    try {

        const response = await fetch("/api/clasificar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ texto })

        });

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.error || "No se pudo clasificar el texto"
            );

        }

        mostrarResultados(data.clasificacion);
        console.log(data)
        statusMessage.textContent =
            "Clasificación realizada correctamente.";

        statusMessage.className = "status-message";

    } catch (error) {

        statusMessage.textContent = error.message;
        statusMessage.className = "status-message error";

    } finally {

        classifyButton.disabled = false;
        classifyButton.textContent = "Clasificar texto";

    }

});
