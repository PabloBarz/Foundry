
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const chatMessages = document.getElementById("chatMessages");
const sendButton = document.getElementById("sendButton");
const errorMessage = document.getElementById("errorMessage");

// Mostrar mensajes en pantalla
function mostrarMensaje(texto, tipo) {
    const message = document.createElement("div");

    message.classList.add("message", `${tipo}-message`);

    const avatar = document.createElement("div");
    avatar.classList.add("message-avatar");
    avatar.textContent = tipo === "user" ? "👤" : "🏛️";

    const content = document.createElement("div");
    content.classList.add("message-content");

    // textContent evita interpretar respuestas como HTML
    content.innerHTML = DOMPurify.sanitize(
      marked.parse(texto)
    );

    message.append(avatar, content);

    chatMessages.appendChild(message);

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Enviar pregunta al backend
chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const pregunta = messageInput.value.trim();

    if (!pregunta) return;

    errorMessage.textContent = "";

    mostrarMensaje(pregunta, "user");

    messageInput.value = "";

    sendButton.disabled = true;
    sendButton.textContent = "Enviando...";

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ pregunta })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "No se pudo obtener una respuesta.");
        }

        mostrarMensaje(data.respuesta, "bot");

    } catch (error) {
        errorMessage.textContent = error.message;
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = "Enviar";
        messageInput.focus();
    }
});

// Enviar con Enter y permitir saltos de línea con Shift + Enter
messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        chatForm.requestSubmit();
    }
});
