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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ==============================
// Render / Railway 用Webサーバー
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
    roles: ["普通倉庫"],
    paymentUrl: process.env.PAYMENT_URL_NORMAL
  },

  special: {
    name: "特倉庫",
    price: 3500,
    roles: ["特倉庫"],
    paymentUrl: process.env.PAYMENT_URL_SPECIAL
  },

  k: {
    name: "K倉庫",
    price: 2500,
    roles: ["K倉庫"],
    paymentUrl: process.env.PAYMENT_URL_K
  },

  normal_special: {
    name: "普通&特倉庫",
    price: 5500,
    roles: ["普通倉庫", "特倉庫"],
    paymentUrl: process.env.PAYMENT_URL_NORMAL_SPECIAL
  },

  normal_k: {
    name: "普通&K倉庫",
    price: 4500,
    roles: ["普通倉庫", "K倉庫"],
    paymentUrl: process.env.PAYMENT_URL_NORMAL_K
  },

  special_k: {
    name: "特&K倉庫",
    price: 5500,
    roles: ["特倉庫", "K倉庫"],
    paymentUrl: process.env.PAYMENT_URL_SPECIAL_K
  },

  all: {
    name: "全ての倉庫",
    price: 7500,
    roles: ["普通倉庫", "特倉庫", "K倉庫"],
    paymentUrl: process.env.PAYMENT_URL_ALL
  }
};

// ==============================
// Bot起動
// ==============================
client.once(Events.ClientReady, readyClient => {
  console.log(`Bot起動完了: ${readyClient.user.tag}`);
});

// ==============================
// 販売パネル
// ==============================
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  if (message.content === "!販売パネル") {
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
});

// ==============================
// ボタン処理
// ==============================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  // ============================
  // 商品購入
  // ============================
  if (interaction.customId.startsWith("buy_")) {
    const productId = interaction.customId.replace("buy_", "");
    const product = products[productId];

    if (!product) return;

    if (!product.paymentUrl) {
      return interaction.reply({
        content:
          "この商品の支払いリンクが設定されていません。管理者に連絡してください。",
        ephemeral: true
      });
    }

    // ============================
    // 支払いボタン
    // ============================
    const paymentRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("💳 支払いはこちら")
        .setStyle(ButtonStyle.Link)
        .setURL(product.paymentUrl)
    );

    // ============================
    // 承認ボタン
    // ============================
    const confirmCustomId =
      `confirm|${interaction.user.id}|${productId}`;

    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(confirmCustomId)
        .setLabel("入金確認・ロール付与")
        .setStyle(ButtonStyle.Success)
    );

    // ============================
    // 購入者本人だけに支払いリンク表示
    // ============================
    await interaction.reply({
      content:
        `🛒 **${product.name}**\n\n` +
        `お支払い金額：**${product.price.toLocaleString()}円**\n\n` +
        "下のボタンから支払いをお願いします。\n" +
        "支払い後、管理者の入金確認までお待ちください。",
      components: [paymentRow],
      ephemeral: true
    });

    // ============================
    // 承認チャンネルへ購入申請
    // ============================
    try {
      const adminChannel =
        await interaction.guild.channels.fetch(
          process.env.ADMIN_CHANNEL_ID
        );

      if (!adminChannel || !adminChannel.isTextBased()) {
        console.error("承認チャンネルが見つかりません。");

        return interaction.followUp({
          content:
            "購入申請の送信先チャンネルが見つかりません。管理者に連絡してください。",
          ephemeral: true
        });
      }

      await adminChannel.send({
        content:
          `📩 **購入申請**\n\n` +
          `購入者：<@${interaction.user.id}>\n` +
          `商品：**${product.name}**\n` +
          `料金：**${product.price.toLocaleString()}円**\n\n` +
          "入金を確認したら、下のボタンを押してください。",
        components: [confirmRow]
      });

    } catch (error) {
      console.error(
        "承認チャンネルへの送信エラー:",
        error
      );

      return interaction.followUp({
        content:
          "購入申請の送信に失敗しました。管理者に連絡してください。",
        ephemeral: true
      });
    }

    return;
  }

  // ============================
  // 入金確認・ロール付与
  // ============================
  if (interaction.customId.startsWith("confirm|")) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return interaction.reply({
        content: "このボタンは管理者専用です。",
        ephemeral: true
      });
    }

    const parts = interaction.customId.split("|");

    const userId = parts[1];
    const productId = parts[2];

    if (!userId || !productId) {
      return interaction.reply({
        content:
          "購入情報の読み込みに失敗しました。",
        ephemeral: true
      });
    }

    const product = products[productId];

    if (!product) {
      return interaction.reply({
        content:
          "商品情報が見つかりません。",
        ephemeral: true
      });
    }

    try {
      const member =
        await interaction.guild.members.fetch(userId);

      // ============================
      // ロール付与
      // ============================
      for (const roleName of product.roles) {
        const role =
          interaction.guild.roles.cache.find(
            r => r.name === roleName
          );

        if (!role) {
          return interaction.reply({
            content:
              `「${roleName}」ロールが見つかりません。`,
            ephemeral: true
          });
        }

        await member.roles.add(role);
      }

      // ============================
      // 完了表示
      // ============================
      await interaction.update({
        content:
          `✅ **入金確認・ロール付与完了**\n\n` +
          `購入者：<@${member.id}>\n` +
          `商品：**${product.name}**\n` +
          `料金：**${product.price.toLocaleString()}円**\n\n` +
          "アクセス権を付与しました。",
        components: []
      });

    } catch (error) {
      console.error(
        "ロール付与エラー:",
        error
      );

      if (!interaction.replied) {
        await interaction.reply({
          content:
            "ロール付与に失敗しました。Botの権限とロール順を確認してください。",
          ephemeral: true
        });
      }
    }
  }
});

// ==============================
// 環境変数確認
// ==============================
console.log(
  "DISCORD_TOKEN確認:",
  process.env.DISCORD_TOKEN ? "あり" : "なし"
);

console.log(
  "ADMIN_CHANNEL_ID確認:",
  process.env.ADMIN_CHANNEL_ID ? "あり" : "なし"
);

console.log(
  "PAYMENT_URL_NORMAL確認:",
  process.env.PAYMENT_URL_NORMAL ? "あり" : "なし"
);

console.log(
  "PAYMENT_URL_SPECIAL確認:",
  process.env.PAYMENT_URL_SPECIAL ? "あり" : "なし"
);

console.log(
  "PAYMENT_URL_K確認:",
  process.env.PAYMENT_URL_K ? "あり" : "なし"
);

console.log(
  "PAYMENT_URL_NORMAL_SPECIAL確認:",
  process.env.PAYMENT_URL_NORMAL_SPECIAL ? "あり" : "なし"
);

console.log(
  "PAYMENT_URL_NORMAL_K確認:",
  process.env.PAYMENT_URL_NORMAL_K ? "あり" : "なし"
);

console.log(
  "PAYMENT_URL_SPECIAL_K確認:",
  process.env.PAYMENT_URL_SPECIAL_K ? "あり" : "なし"
);

console.log(
  "PAYMENT_URL_ALL確認:",
  process.env.PAYMENT_URL_ALL ? "あり" : "なし"
);

// ==============================
// Discordログイン
// ==============================
client.login(process.env.DISCORD_TOKEN);
