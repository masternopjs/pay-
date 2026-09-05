const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Render用Webサーバー
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Discord VIP Bot is running!");
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Web server started on port ${PORT}`);
});

// Discord Bot起動
client.once("ready", () => {
  console.log(`Bot起動完了：${client.user.tag}`);
});
console.log(
  "DISCORD_TOKEN確認:",
  process.env.DISCORD_TOKEN ? `あり（${process.env.DISCORD_TOKEN.length}文字）` : "なし"
);
client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log("Discordへのログイン処理成功"))
  .catch(error => console.error("Discordログインエラー:", error));

client.on("error", error => {
  console.error("Discord Client Error:", error);
});
