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

// Railway用Webサーバー
const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("SC Senmon Bot is running!");
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`Web server started on port ${PORT}`);
  });

// 商品設定
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

// 購入情報を一時保存
const purchases = new Map();

client.once(Events.ClientReady, readyClient => {
  console.log(`Bot起動完了: ${readyClient.user.tag}`);
});

// 販売パネル
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

// ボタン処理
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  // 商品購入
  if (interaction.customId.startsWith("buy_")) {
    const productId = interaction.customId.replace("buy_", "");
    const product = products[productId];

    if (!product) return;

    const purchaseId = `${interaction.user.id}_${Date.now()}`;

    purchases.set(purchaseId, {
      userId: interaction.user.id,
      productId
    });

    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm_${purchaseId}`)
        .setLabel("入金確認・ロール付与")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({
      content:
        `🛒 **${product.name}**\n\n` +
        `料金：**${product.price.toLocaleString()}円**\n\n` +
        "購入希望を受け付けました。\n" +
        "入金後、管理者が確認すると自動でアクセス権が付与されます。",
      ephemeral: true
    });

    await interaction.channel.send({
      content:
        `📩 **購入申請**\n\n` +
        `購入者：<@${interaction.user.id}>\n` +
        `商品：**${product.name}**\n` +
        `料金：**${product.price.toLocaleString()}円**\n\n` +
        "管理者は入金確認後、下のボタンを押してください。",
      components: [confirmRow]
    });

    return;
  }

  // 管理者の入金確認
  if (interaction.customId.startsWith("confirm_")) {
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

    const purchaseId = interaction.customId.replace("confirm_", "");
    const purchase = purchases.get(purchaseId);

    if (!purchase) {
      return interaction.reply({
        content: "この購入情報は見つかりません。",
        ephemeral: true
      });
    }

    const product = products[purchase.productId];
    const member = await interaction.guild.members.fetch(purchase.userId);

    try {
      for (const roleName of product.roles) {
        const role = interaction.guild.roles.cache.find(
          r => r.name === roleName
        );

        if (!role) {
          return interaction.reply({
            content: `「${roleName}」ロールが見つかりません。`,
            ephemeral: true
          });
        }

        await member.roles.add(role);
      }

      purchases.delete(purchaseId);

      await interaction.update({
        content:
          `✅ **入金確認・ロール付与完了**\n\n` +
          `購入者：<@${member.id}>\n` +
          `商品：**${product.name}**\n` +
          `料金：**${product.price.toLocaleString()}円**\n\n` +
          `アクセス権を付与しました。`,
        components: []
      });
    } catch (error) {
      console.error(error);

      await interaction.reply({
        content:
          "ロール付与に失敗しました。Botの権限とロール順を確認してください。",
        ephemeral: true
      });
    }
  }
});

console.log(
  "DISCORD_TOKEN確認:",
  process.env.DISCORD_TOKEN
    ? `あり (${process.env.DISCORD_TOKEN.length}文字)`
    : "なし"
);

client.login(process.env.DISCORD_TOKEN);
