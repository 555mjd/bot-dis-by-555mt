require('dotenv').config();
const express = require('express'); // أضفنا مكتبة Express
const app = express();
const port = process.env.PORT || 3000;

// سيرفر ويب مصغر عشان يبقى البوت شغال وما ينام على Render
app.get('/', (req, res) => {
    res.send('Bot is alive and running!');
});

app.listen(port, () => {
    console.log(`🌐 Web server is listening on port ${port}`);
});

const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder,
    StringSelectMenuBuilder 
} = require('discord.js');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// استدعاء الموديولات المعتمدة فقط
const warningBot = require('./modules/warningBot');
const ticketBot = require('./modules/ticketBot'); 
const applyBot = require('./modules/applyBot');
const banbot = require('./modules/banBot');
const staffRequestBot = require('./modules/staffRequestBot');
const quickRolesBot = require('./modules/quickRolesBot');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// إعداد قاعدة البيانات وتوصيلها
(async () => {
    client.db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    await client.db.exec(`
        CREATE TABLE IF NOT EXISTS active_warnings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            role_id TEXT,
            expires_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS points (
            user_id TEXT PRIMARY KEY,
            ticket_points INTEGER DEFAULT 0,
            voice_points INTEGER DEFAULT 0
        );
    `);
})();

// تشغيل البوت والمؤقت التلقائي
client.once('ready', () => {
    console.log(`✅ تم تشغيل البوت بنجاح باسم: ${client.user.tag}`);
    
    setInterval(() => {
        if (warningBot && warningBot.checkExpiredWarnings) warningBot.checkExpiredWarnings(client);
        if (staffRequestBot && staffRequestBot.checkExpiredLeaves) staffRequestBot.checkExpiredLeaves(client);
    }, 60000);
});

// استقبال الأوامر والرسائل
client.on('messageCreate', async (message) => {
    if (ticketBot && ticketBot.handleMessage) {
        await ticketBot.handleMessage(message); 
    }

    // تمرير الرسائل إلى موديول الباند
    if (banbot && typeof banbot.handleMessage === 'function') {
        await banbot.handleMessage(message);
    }

    if (!message.content.startsWith('!') || message.author.bot) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'setup-warning') {
        const panelChannelId = process.env.WARNING_PANEL_CHANNEL_ID;
        const targetChannel = panelChannelId 
            ? message.guild.channels.cache.get(panelChannelId) || message.channel
            : message.channel;

        const embed = new EmbedBuilder()
            .setTitle('⚠️ لوحة إدارة الإنذارات والعقوبات')
            .setDescription('اختر نوع العقوبة أو الإجراء المطلوب من الأزرار أدناه:')
            .setColor('#8B0000');

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_warn_1').setLabel('Admin warn 1').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_warn_2').setLabel('Admin warn 2').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_warn_3').setLabel('Admin warn 3').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_warn_ban').setLabel('Dismissal').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_warn_bl').setLabel('BlackList').setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_exempt').setLabel('إعفاء').setStyle(ButtonStyle.Secondary)
        );

        await targetChannel.send({ embeds: [embed], components: [row1, row2] });

        if (targetChannel.id !== message.channel.id) {
            await message.reply(`✅ تم إرسال اللوحة بنجاح في الروم: <#${targetChannel.id}>`);
        }
    }

    if (command === 'setup-apply') {
        const embed = new EmbedBuilder()
            .setTitle('📝 التقديم على الطاقم الإداري')
            .setDescription('إذا كنت ترغب بالانضمام إلى الفريق الإداري وتتوفر لديك الشروط، اضغط على الزر أدناه لتعبئة نموذج التقديم.')
            .setColor('#2b2d31');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('apply_open')
                .setLabel('Apply')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📋'),
            new ButtonBuilder()
                .setCustomId('apply_toggle')
                .setLabel('Manage')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⚙')
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete().catch(() => {});
    }

    if (command === 'setup-req') {
        const embed = new EmbedBuilder()
            .setTitle('📋 نظام الطلبات والإجازات الإدارية')
            .setDescription('يرجى اختيار نوع الطلب من القائمة المنسدلة أدناه لتعبئة النموذج المخصص.')
            .setColor('#2b2d31');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_staff_request')
            .setPlaceholder('اختر نوع الطلب من هنا...')
            .addOptions([
                { label: 'طلب إجازة', description: 'تقديم طلب إجازة عن العمل الإداري', value: 'req_leave', emoji: '🌴' },
                { label: 'طلب كسر إجازة', description: 'العودة من الإجازة واستئناف المهام', value: 'req_break_leave', emoji: '⚡' },
                { label: 'طلب استقالة', description: 'تقديم طلب استقالة من الطاقم الإداري', value: 'req_resign', emoji: '🚪' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete().catch(() => {});
    }

    if (command === 'setup-tickets' || command === 'setup-ticket') {
        if (ticketBot && ticketBot.sendTicketPanel) await ticketBot.sendTicketPanel(message); 
    }

    if (command === 'setup-points') {
        if (ticketBot && ticketBot.sendPointsPanel) await ticketBot.sendPointsPanel(message); 
    }
});

// توجيه التفاعلات بالشكل الصحيح والسليم
client.on('interactionCreate', async (interaction) => {
    try {
        // 1. توجيه بوت التقديم أولاً وبشكل حصري ومطلق
        if (interaction.customId && (
            interaction.customId.startsWith('apply_') || 
            interaction.customId.startsWith('app_')
        )) {
            if (applyBot?.handleInteraction) await applyBot.handleInteraction(interaction);
        }
        // 2. توجيه الإنذارات
        else if (interaction.customId?.includes('warn') || interaction.customId === 'btn_exempt' || interaction.customId === 'modal_exempt') {
            await warningBot.handleInteraction(interaction);
        } 
        // 3. توجيه نظام الباندات (شامل المؤقت والنهائي Perm)
        else if (
            interaction.customId?.startsWith('ban_') || 
            interaction.customId?.startsWith('perm_') ||
            interaction.customId?.includes('modal_ban') ||
            interaction.customId === 'open_ban_modal' ||
            interaction.customId === 'open_perm_modal'
        ) {
            if (banbot && typeof banbot.handleMessage === 'function') {
                await banbot.handleInteraction(interaction);
            }
        }
        // 4. توجيه التذاكر والنقاط
        else if (
            interaction.customId?.includes('ticket') || 
            interaction.customId?.includes('modal_elite_ticket_') || 
            interaction.customId?.includes('modal_create_') ||
            interaction.customId?.includes('modal_sub_') ||
            interaction.customId?.includes('modal_points_action_') ||
            interaction.customId?.includes('pt_') ||
            interaction.customId === 'persistent_ticket_select_menu' ||
            interaction.customId === 'persistent_my_points_btn' ||
            interaction.customId === 'persistent_leaderboard_btn' ||
            interaction.customId === 'manage_points_list_btn' ||
            interaction.customId === 'admin_select_target_point' ||
            interaction.customId.startsWith('ticket_manage_')
        ) {
            if (ticketBot?.handleInteraction) {
                await ticketBot.handleInteraction(interaction); 
            }
        } 
        // 5. توجيه الرتب السريعة
        else if (interaction.customId?.includes('req_role')) {
            if (quickRolesBot?.handleInteraction) await quickRolesBot.handleInteraction(interaction);
        } 

        // نظام الإجازات والاستقالات
        if (
            interaction.customId === 'select_staff_request' || 
            interaction.customId === 'sreq_accept_leave' ||
            interaction.customId === 'sreq_reject_leave' ||
            interaction.customId === 'sreq_accept_break' ||
            interaction.customId === 'sreq_reject_break' ||
            interaction.customId === 'sreq_accept_resign' ||
            interaction.customId === 'sreq_reject_resign' ||
            interaction.customId?.startsWith('sreq_') || 
            interaction.customId?.startsWith('modal_sreq_') ||
            interaction.customId?.startsWith('modal_req_')
        ) {
            if (staffRequestBot?.handleInteraction) {
                return await staffRequestBot.handleInteraction(interaction);
            }
        }
    } catch (error) {
        console.error('خطأ في معالجة التفاعل:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ العمليات.', ephemeral: true }).catch(() => {});
        }
    }
});

// مراقبة الحركة الصوتية لنظام التذاكر والنقاط
client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        if (ticketBot && ticketBot.handleVoiceState) {
            await ticketBot.handleVoiceState(oldState, newState, client); 
        }
    } catch (error) {
        console.error('خطأ في معالجة الحالة الصوتية:', error);
    }
});

// تسجيل الدخول مع التقاط الأخطاء إن وجدت
client.login(process.env.DISCORD_TOKEN).then(() => {
    console.log('✅ تم إرسال أمر الاتصال بنجاح إلى ديسكورد');
}).catch((err) => {
    console.error('❌ خطأ في الاتصال بديسكورد:', err);
});