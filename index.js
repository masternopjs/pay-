const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require("discord.js");

const http = require("http");

// ==============================
// Discord Bot
// ==============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ==============================
// Railway用 Webサーバー
// ==============================
const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("SC Senmon Bot is running!");
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`Web server started on port ${PORT}`);
  });

// ==============================
// 商品設定
// ==============================
const products = {
  normal: {
    name: "普通倉庫",
    price: 2500,
    roles: ["普通倉庫"]
  },

  special: {
    name: "特倉庫",
    price: 3500,
    roles: ["特倉庫"]
  },

  k: {
    name: "K倉庫",
    price: 2500,
    roles: ["K倉庫"]
  },

  normal_special: {
    name: "普通&特倉庫",
    price: 5500,
    roles: ["普通倉庫", "特倉庫"]
  },

  normal_k: {
    name: "普通&K倉庫",
    price: 4500,
    roles: ["普通倉庫", "K倉庫"]
  },

  special_k: {
    name: "特&K倉庫",
    price: 5500,
    roles: ["特倉庫", "K倉庫"]
  },

  all: {
    name: "全ての倉庫",
    price: 7500,
    roles: ["普通倉庫", "特倉庫", "K倉庫"]
  }
};

// ==============================
// Bot起動
// ==============================
client.once(Events.ClientReady, readyClient => {
  console.log(`Bot起動完了: ${readyClient.user.tag}`);
});

// ==============================
// !販売パネル
// ==============================
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  if (message.content === "!販売パネル") {
    // 管理者のみ
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return message.reply("このコマンドは管理者専用です。");
    }

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buy_normal")
        .setLabel("普通倉庫 2,500円")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("buy_special")
        .setLabel("特倉庫 3,500円")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("buy_k")
        .setLabel("K倉庫 2,500円")
        .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buy_normal_special")
        .setLabel("普通&特 5,500円")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("buy_normal_k")
        .setLabel("普通&K 4,500円")
        .setStyle(ButtonStyle.Success)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buy_special_k")
        .setLabel("特&K 5,500円")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("buy_all")
        .setLabel("全て 7,500円")
        .setStyle(ButtonStyle.Danger)
    );

    await message.channel.send({
      content:
        "## 🛒 倉庫購入\n\n" +
        "購入したい倉庫を選択してください。\n\n" +
        "普通倉庫：2,500円\n" +
        "特倉庫：3,500円\n" +
        "K倉庫：2,500円\n" +
        "普通&特倉庫：5,500円\n" +
        "普通&K倉庫：4,500円\n" +
        "特&K倉庫：5,500円\n" +
        "全ての倉庫：7,500円",
      components: [row1, row2, row3]
    });
  }

  // ==============================
  // !付与
  //
  // 例:
  // !付与 @ユーザー 普通倉庫
  // ==============================
  if (message.content.startsWith("!付与")) {
    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return message.reply("このコマンドは管理者専用です。");
    }

    const member = message.mentions.members.first();

    if (!member) {
      return message.reply(
        "ユーザーをメンションしてください。\n例：`!付与 @ユーザー 普通倉庫`"
      );
    }

    const text = message.content;

    let selectedProduct = null;

    // 長い商品名から判定
    const productList = Object.values(products).sort(
      (a, b) => b.name.length - a.name.length
    );

    for (const product of productList) {
      if (text.includes(product.name)) {
        selectedProduct = product;
        break;
      }
    }

    if (!selectedProduct) {
      return message.reply(
        "商品名が見つかりません。\n\n" +
        "普通倉庫\n" +
        "特倉庫\n" +
        "K倉庫\n" +
        "普通&特倉庫\n" +
        "普通&K倉庫\n" +
        "特&K倉庫\n" +
        "全ての倉庫"
      );
    }

    try {
      for (const roleName of selectedProduct.roles) {
        const role = message.guild.roles.cache.find(
          r => r.name === roleName
        );

        if (!role) {
          return message.reply(
            `「${roleName}」というロールが見つかりません。`
          );
        }

        await member.roles.add(role);
      }

      await message.reply(
        `✅ ${member} に **${selectedProduct.name}** を付与しました。`
      );
    } catch (error) {
      console.error(error);

      await message.reply(
        "ロール付与に失敗しました。Botの権限とロールの順番を確認してください。"
      );
    }
  }
});

// ==============================
// 商品ボタン
// ==============================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  if (!interaction.customId.startsWith("buy_")) return;

  const productId = interaction.customId.replace("buy_", "");
  const product = products[productId];

  if (!product) return;

  await interaction.reply({
    content:
      `🛒 **${product.name}**\n\n` +
      `料金：**${product.price.toLocaleString()}円**\n\n` +
      "購入希望を受け付けました。\n" +
      "入金確認後、管理者から倉庫へのアクセス権が付与されます。",
    ephemeral: true
  });
});

// ==============================
// Discordログイン
// ==============================
console.log(
  "DISCORD_TOKEN確認:",
  process.env.DISCORD_TOKEN
    ? `あり (${process.env.DISCORD_TOKEN.length}文字)`
    : "なし"
);

client.login(process.env.DISCORD_TOKEN);
