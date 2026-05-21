// register-commands.js
// Ejecuta este archivo UNA SOLA VEZ para registrar los comandos en Discord
// node register-commands.js

const APP_ID = process.env.DISCORD_APP_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const commands = [
  {
    name: "wikipedia",
    description: "Busca información en Wikipedia",
    options: [
      {
        name: "busqueda",
        description: "¿Qué quieres buscar?",
        type: 3, // STRING
        required: true,
      },
    ],
  },
];

async function registerCommands() {
  const res = await fetch(
    `https://discord.com/api/v10/applications/${APP_ID}/commands`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    }
  );

  if (res.ok) {
    console.log("✅ Comandos registrados correctamente!");
  } else {
    const error = await res.json();
    console.error("❌ Error:", error);
  }
}

registerCommands();
