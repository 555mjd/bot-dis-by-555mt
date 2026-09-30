const { EmbedBuilder, AuditLogEvent, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');

// ==========================================
// 📌 الإعدادات الأساسية ورتب الإدارة والروقات
// ==========================================
const SUPPORT_STAFF_ROLE_ID = "1068839434952396824";

const WAITING_ROOM_ID = "1068839440555978805";
const POINTS_LOG_CHANNEL_ID = "1068839439146700802"; 
const VOICE_LOG_CHANNEL_ID = "1068839439146700802"; 
const TICKET_LOG_CHANNEL_ID = "1068839447728246840"; 
const HIGH_POINT_LOG_CHANNEL_ID = "1554649783551926302"; // 🟢 روم لوق الإدارة العليا الجديد

const TICKET_CATEGORIES = {
    'inquiry': { 
        categoryId: "1554482914295816253", 
        roleIds: ["1068839434952396824"], 
        name: "Ask Tickets | استفسارات" 
    },
    'unban': { 
        categoryId: "1554487835195871263", 
        roleIds: ["1068839435036282899"],  
        name: "Unban | طلب فك باند" 
    },
    'player_report': { 
        categoryId: "حط_آيدي_كاتيجوري_شكاوى_اللاعبين_هنا", 
        roleIds: ["حط_آيدي_رتبة_شكاوى_اللاعبين_هنا"], 
        name: "Player Report | شكوى لاعب" 
    },
    'staff_report': { 
        categoryId: "حط_آيدي_كاتيجوري_شكاوى_الإداريين_هنا", 
        roleIds: ["حط_آيدي_رتبة_شكاوى_الإداريين_هنا"], 
        name: "Staff Report | شكوى إداري" 
    },
    'store': { 
        categoryId: "حط_آيدي_كاتيجوري_المتجر_هنا", 
        roleIds: ["حط_آيدي_رتبة_المتجر_هنا"], 
        name: "Store | تكت المتجر" 
    }
};

const claimedTickets = new Map();
const ticketMetaData = new Map();

function getMinutesAgo(startTimestamp) {
    return `<t:${startTimestamp}:R>`;
}

async function getNextTicketNumber(db) {
    await db.run(`CREATE TABLE IF NOT EXISTS ticket_counter (id INTEGER PRIMARY KEY, current_num INTEGER)`);
    let row = await db.get(`SELECT current_num FROM ticket_counter WHERE id = 1`);
    let nextNum = 1;
    if (!row) {
        await db.run(`INSERT INTO ticket_counter (id, current_num) VALUES (1, 1)`);
    } else {
        nextNum = row.current_num + 1;
        await db.run(`UPDATE ticket_counter SET current_num = ? WHERE id = 1`, [nextNum]);
    }
    return nextNum;
}

module.exports = {
    WAITING_ROOM_ID,
    POINTS_LOG_CHANNEL_ID,
    VOICE_LOG_CHANNEL_ID,
    TICKET_LOG_CHANNEL_ID,
    HIGH_POINT_LOG_CHANNEL_ID,

    async sendTicketPanel(message) {
        const embed = new EmbedBuilder()
            .setTitle("Low Fights Tickets")
            .setDescription(
                "### **قوانين التذاكر الأساسية**\n" +
                "• الاحترام وعدم التلفظ نهائياً داخل التكت\n" +
                "• يمنع منشن الإدارة أو الأعضاء منعاً باتاً\n" +
                "• ادخل بموضوعك بشكل مباشر فور فتح التكت ولا تنتظر رد الإداري\n" +
                "• لا يحق لك الشكوى أو الاعتراض بعد مرور 24 ساعة من الحدث\n" +
                "• تجنب السبام أو الإشارة المتكررة لضمان سرعة خدمتك\n\n" +
                "**يجب تعبئة البيانات المطلوبة بدقة كاملة عند فتح التذكرة، وإلا يحق للإدارة إغلاقها مباشرة.**\n\n" +
                "اختر نوع التذكرة المناسب لطلبك من القائمة أدناه:"
            )
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setColor(0x2f3136)
            .setFooter({ text: "Dev By @555mt" });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('persistent_ticket_select_menu')
            .setPlaceholder('Ask Tickets | اختر نوع التذكرة')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('استفسارات (Inquiry)').setDescription('لتقديم استفساراتك العامة ومساعدتك').setValue('inquiry').setEmoji('💬'),
                new StringSelectMenuOptionBuilder().setLabel('اعتراض على باند (Unban)').setDescription('إذا تم حظرك وتريد تقديم طلب استئناف').setValue('unban').setEmoji('🔓'),
                new StringSelectMenuOptionBuilder().setLabel('شكوى على لاعب (Player Report)').setDescription('للتبليغ عن مشكلة أو مخالفة لاعب').setValue('player_report').setEmoji('⚔'),
                new StringSelectMenuOptionBuilder().setLabel('شكوى على إداري (Staff Report)').setDescription('للتبليغ عن تجاوز أو شكوى تخص الإدارة').setValue('staff_report').setEmoji('🛡'),
                new StringSelectMenuOptionBuilder().setLabel('تكت متجر (Store)').setDescription('بخصوص عمليات الشراء والدعم المالي').setValue('store').setEmoji('🛒')
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete().catch(() => {});
    },

    async sendPointsPanel(message) {
        const embed = new EmbedBuilder()
            .setTitle("🌟 Show Your Points")
            .setDescription(
                "### **لوحة متابعة نقاط الإداريين**\n\n" +
                "**🔹 آلية احتساب النقاط:**\n" +
                "• الصوتي: تُحتسب نقطة تلقائياً فور سحب العضو من روم الويتنق إلى روم سبورت.\n" +
                "• التذاكر: تُحتسب نقطة تلقائياً عند الضغط على زر استلاستلام التكت.\n\n" +
                "اختر أحد الأزرار أدناه لعرض رصيدك أو قائمة المتصدرين:"
            )
            .setColor(0x2f3136)
            .setFooter({ text: "Dev By @555mt" });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('persistent_my_points_btn').setLabel('نقاطي (Points)').setStyle(ButtonStyle.Success).setEmoji('📊'),
            new ButtonBuilder().setCustomId('persistent_leaderboard_btn').setLabel('المتصدّرين (Top)').setStyle(ButtonStyle.Primary).setEmoji('🏆')
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete().catch(() => {});
    },

    async handleMessage(message) {
        if (message.author.bot || !message.guild) return;

        if (message.content.startsWith('!تصفير')) {
            const hasRole = message.member.roles.cache.has(SUPPORT_STAFF_ROLE_ID) || message.member.permissions.has(PermissionFlagsBits.Administrator);
            if (!hasRole) {
                return message.reply({ content: "❌ عذراً، هذا الأمر مخصص للإدارة فقط!" });
            }

            const embed = new EmbedBuilder()
                .setTitle("⚙️ إدارة وتصفير نقاط الإدارة")
                .setDescription(
                    "### **لوحة التحكم في نقاط المشرفين**\n\n" +
                    "• مخصصة لإدارة الجرد، الترقيات، وتعديل أرصدة المشرفين.\n" +
                    "• اضغط على الزر أدناه لعرض قائمة جميع المشرفين والتحكم بنقاطهم.\n"
                )
                .setColor(0x2f3136)
                .setFooter({ text: "Dev By @555mt" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('manage_points_list_btn')
                    .setLabel('عرض وتعديل نقاط الإدارة')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🛠️')
            );

            await message.channel.send({ embeds: [embed], components: [row] });
            await message.delete().catch(() => {});
        }
    },

    async handleInteraction(interaction) {
        const { client, guild, member, channel, customId } = interaction;

        if (interaction.isStringSelectMenu() && customId === 'persistent_ticket_select_menu') {
            const ticketType = interaction.values[0];

            if (ticketType === 'inquiry') {
                const modal = new ModalBuilder().setCustomId('modal_create_inquiry').setTitle('تكتات الاستفسار | نموذج');
                const q1 = new TextInputBuilder().setCustomId('inquiry_question').setLabel('وش استفسارك؟ *').setPlaceholder('اكتب استفسارك بوضوح').setStyle(TextInputStyle.Paragraph).setRequired(true);
                const q2 = new TextInputBuilder().setCustomId('inquiry_extra').setLabel('معلومات إضافية (اختياري)').setPlaceholder('أي تفاصيل تساعدنا').setStyle(TextInputStyle.Short).setRequired(false);
                modal.addComponents(new ActionRowBuilder().addComponents(q1), new ActionRowBuilder().addComponents(q2));
                return await interaction.showModal(modal);
            } 
            else if (ticketType === 'unban') {
                const modal = new ModalBuilder().setCustomId('modal_create_unban').setTitle('اعتراض على باند | نموذج');
                const q1 = new TextInputBuilder().setCustomId('unban_id').setLabel('ايدي الباند *').setPlaceholder('ايدي الباند').setStyle(TextInputStyle.Short).setRequired(true);
                const q2 = new TextInputBuilder().setCustomId('unban_reason').setLabel('ليش تعتقد الباند خطأ؟ *').setPlaceholder('اشرح باختصار ووضوح').setStyle(TextInputStyle.Paragraph).setRequired(true);
                const q3 = new TextInputBuilder().setCustomId('unban_time').setLabel('متى صار الباند؟').setPlaceholder('تقريباً').setStyle(TextInputStyle.Short).setRequired(false);
                const q4 = new TextInputBuilder().setCustomId('unban_proof').setLabel('أي أدلة (اختياري)').setPlaceholder('روابط/صور').setStyle(TextInputStyle.Short).setRequired(false);
                modal.addComponents(new ActionRowBuilder().addComponents(q1), new ActionRowBuilder().addComponents(q2), new ActionRowBuilder().addComponents(q3), new ActionRowBuilder().addComponents(q4));
                return await interaction.showModal(modal);
            }
            else if (ticketType === 'player_report') {
                const modal = new ModalBuilder().setCustomId('modal_create_player_report').setTitle('شكوى على لاعب | نموذج');
                const q1 = new TextInputBuilder().setCustomId('pr_target').setLabel('اللاعب / ID / الاسم *').setPlaceholder('معلومات اللاعب المخالف').setStyle(TextInputStyle.Short).setRequired(true);
                const q2 = new TextInputBuilder().setCustomId('pr_reason').setLabel('سبب الشكوى *').setPlaceholder('اشرح اللي صار بالتفصيل').setStyle(TextInputStyle.Paragraph).setRequired(true);
                const q3 = new TextInputBuilder().setCustomId('pr_time').setLabel('متى صار؟').setPlaceholder('اليوم / الساعة').setStyle(TextInputStyle.Short).setRequired(false);
                const q4 = new TextInputBuilder().setCustomId('pr_proof').setLabel('روابط الأدلة (اختياري)').setPlaceholder('روابط فقط').setStyle(TextInputStyle.Short).setRequired(false);
                modal.addComponents(new ActionRowBuilder().addComponents(q1), new ActionRowBuilder().addComponents(q2), new ActionRowBuilder().addComponents(q3), new ActionRowBuilder().addComponents(q4));
                return await interaction.showModal(modal);
            }
            else if (ticketType === 'staff_report') {
                const modal = new ModalBuilder().setCustomId('modal_create_staff_report').setTitle('شكوى على إداري | نموذج');
                const q1 = new TextInputBuilder().setCustomId('sr_target').setLabel('الإداري / ID / الاسم *').setPlaceholder('اسم أو ايدي الإداري').setStyle(TextInputStyle.Short).setRequired(true);
                const q2 = new TextInputBuilder().setCustomId('sr_reason').setLabel('سبب الشكوى *').setPlaceholder('تفاصيل التجاوز').setStyle(TextInputStyle.Paragraph).setRequired(true);
                const q3 = new TextInputBuilder().setCustomId('sr_time').setLabel('متى صار؟').setPlaceholder('اليوم / الساعة').setStyle(TextInputStyle.Short).setRequired(false);
                const q4 = new TextInputBuilder().setCustomId('sr_proof').setLabel('روابط الأدلة (اختياري)').setPlaceholder('روابط فقط').setStyle(TextInputStyle.Short).setRequired(false);
                modal.addComponents(new ActionRowBuilder().addComponents(q1), new ActionRowBuilder().addComponents(q2), new ActionRowBuilder().addComponents(q3), new ActionRowBuilder().addComponents(q4));
                return await interaction.showModal(modal);
            }
            else if (ticketType === 'store') {
                const modal = new ModalBuilder().setCustomId('modal_create_store').setTitle('تكت متجر | نموذج');
                const q1 = new TextInputBuilder().setCustomId('store_item').setLabel('اسم المنتج المطلوب *').setPlaceholder('مثال: حزمة البوس، فك باند...').setStyle(TextInputStyle.Short).setRequired(true);
                const q2 = new TextInputBuilder().setCustomId('store_payment').setLabel('طريقة الدفع المفضلة (اختياري)').setPlaceholder('مثال: تحويل، ستور...').setStyle(TextInputStyle.Paragraph).setRequired(false);
                modal.addComponents(new ActionRowBuilder().addComponents(q1), new ActionRowBuilder().addComponents(q2));
                return await interaction.showModal(modal);
            }
        }

        if (interaction.isModalSubmit() && customId.startsWith('modal_create_')) {
            await interaction.deferReply({ ephemeral: true });
            
            const subType = customId.replace('modal_create_', '');
            const currentConfig = TICKET_CATEGORIES[subType] || TICKET_CATEGORIES['inquiry'];
            const typeName = currentConfig.name;
            const targetCategoryId = currentConfig.categoryId;
            const targetRoleIds = currentConfig.roleIds || [];

            let formFields = [];
            if (subType === 'inquiry') {
                formFields = [
                    { name: `📌 | وش استفسارك؟`, value: `${interaction.fields.getTextInputValue('inquiry_question')}`, inline: false },
                    { name: `📌 | معلومات إضافية (اختياري)`, value: `${interaction.fields.getTextInputValue('inquiry_extra') || 'لا يوجد'}`, inline: false }
                ];
            } else if (subType === 'unban') {
                formFields = [
                    { name: `🆔 | ايدي الباند`, value: `\`${interaction.fields.getTextInputValue('unban_id')}\``, inline: false },
                    { name: `❓ | ليش تعتقد الباند خطأ؟`, value: `${interaction.fields.getTextInputValue('unban_reason')}`, inline: false },
                    { name: `🕒 | متى صار الباند؟`, value: `${interaction.fields.getTextInputValue('unban_time') || 'غير محدد'}`, inline: false },
                    { name: `📎 | أي أدلة (اختياري)`, value: `${interaction.fields.getTextInputValue('unban_proof') || 'لا يوجد'}`, inline: false }
                ];
            } else if (subType === 'player_report') {
                formFields = [
                    { name: `👤 | اللاعب / ID / الاسم`, value: `\`${interaction.fields.getTextInputValue('pr_target')}\``, inline: false },
                    { name: `📝 | سبب الشكوى`, value: `${interaction.fields.getTextInputValue('pr_reason')}`, inline: false },
                    { name: `🕒 | متى صار؟`, value: `${interaction.fields.getTextInputValue('pr_time') || 'غير محدد'}`, inline: false },
                    { name: `📎 | روابط الأدلة (اختياري)`, value: `${interaction.fields.getTextInputValue('pr_proof') || 'لا يوجد'}`, inline: false }
                ];
            } else if (subType === 'staff_report') {
                formFields = [
                    { name: `🛡️ | الإداري / ID / الاسم`, value: `\`${interaction.fields.getTextInputValue('sr_target')}\``, inline: false },
                    { name: `📝 | سبب الشكوى`, value: `${interaction.fields.getTextInputValue('sr_reason')}`, inline: false },
                    { name: `🕒 | متى صار؟`, value: `${interaction.fields.getTextInputValue('sr_time') || 'غير محدد'}`, inline: false },
                    { name: `📎 | روابط الأدلة (اختياري)`, value: `${interaction.fields.getTextInputValue('sr_proof') || 'لا يوجد'}`, inline: false }
                ];
            } else if (subType === 'store') {
                formFields = [
                    { name: `🛒 | اسم المنتج المطلوب`, value: `${interaction.fields.getTextInputValue('store_item')}`, inline: false },
                    { name: `💳 | طريقة الدفع المفضلة`, value: `${interaction.fields.getTextInputValue('store_payment') || 'غير محددة'}`, inline: false }
                ];
            }

            const category = guild.channels.cache.get(targetCategoryId);
            const currentTicketNum = await getNextTicketNumber(client.db);
            const cleanUserName = member.user.username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'user';
            const initialChannelName = `🟢-Lo-${cleanUserName}-${currentTicketNum}`;

            const overwrites = [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
            ];

            const ticketChannel = await guild.channels.create({
                name: initialChannelName,
                type: 0,
                parent: category ? category.id : null,
                permissionOverwrites: overwrites
            });

            const creationTimeSeconds = Math.floor(Date.now() / 1000);
            const joinedTimestamp = Math.floor(member.joinedTimestamp / 1000);
            const createdTimestamp = Math.floor(member.user.createdTimestamp / 1000);

            ticketMetaData.set(ticketChannel.id, {
                opener: member,
                openedAt: creationTimeSeconds,
                claimer: null,
                claimedAt: null,
                closer: null,
                closedAt: null,
                ticketNumber: currentTicketNum,
                ticketType: typeName
            });

            const mainEmbed = new EmbedBuilder()
                .setAuthor({ name: `LO | Ticket Team`, iconURL: guild.iconURL() })
                .setTitle(`🎫 ${typeName}`)
                .addFields(
                    { name: `👤 | Member Info :`, value: `${member}`, inline: true },
                    { name: `🕒 | Joined Server :`, value: `<t:${joinedTimestamp}:R>`, inline: true },
                    { name: `⏱ | Account Created :`, value: `<t:${createdTimestamp}:R>`, inline: true },
                    { name: `🎫 | Ticket Info :`, value: `\u200b`, inline: false },
                    { name: `📁 | Ticket Type :`, value: `[ ${typeName} ]`, inline: false },
                    { name: `🕒 | Ticket Created Since :`, value: `<t:${creationTimeSeconds}:R>`, inline: false },
                    { name: `🔢 | Ticket Number :`, value: `[ ${currentTicketNum} ]`, inline: false }
                )
                .setColor(0x2f3136)
                .setFooter({ text: "Dev By @555mt" })
                .setTimestamp();

            const formEmbed = new EmbedBuilder()
                .setAuthor({ name: `بيانات التذكرة 📝`, iconURL: guild.iconURL() })
                .setDescription(`**تم تعبئة البيانات التالية بواسطة العضو:**`)
                .addFields(formFields)
                .setColor(0x2f3136)
                .setFooter({ text: "Dev By @555mt" })
                .setTimestamp();

            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_close_btn').setLabel('Close Ticket').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('ticket_admin_options_btn').setLabel('Admin Options').setStyle(ButtonStyle.Secondary)
            );

            const rolesMentionText = targetRoleIds.map(id => `<@&${id}>`).join(" ");

            await ticketChannel.send({ 
                content: `${member}${rolesMentionText}`, 
                embeds: [mainEmbed, formEmbed], 
                components: [actionRow] 
            });

            return await interaction.editReply({ content: `✅ تم إنشاء روم التكت الخاص بك بنجاح: ${ticketChannel}` });
        }

        if (interaction.isButton() && customId === 'ticket_admin_options_btn') {
            const hasRole = member.roles.cache.has(TICKET_CATEGORIES['inquiry'].roleIds[0]) || member.permissions.has(PermissionFlagsBits.Administrator);
            if (!hasRole) {
                return interaction.reply({ content: "❌ عذراً، هذه الخيارات مخصصة للإدارة فقط!", ephemeral: true });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`ticket_manage_${channel.id}`)
                .setPlaceholder('⚙ لوحة التحكم الإدارية...')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('استلاستلام التكت (Claim)').setDescription('استلاستلام التكت وتسجيل نقطة لحسابك').setValue('claim').setEmoji('🎫'),
                    new StringSelectMenuOptionBuilder().setLabel('إضافة شخص (Add Member)').setDescription('منح عضو صلاحية رؤية التكت والكتابة فيه').setValue('add').setEmoji('➕'),
                    new StringSelectMenuOptionBuilder().setLabel('إزالة شخص (Remove Member)').setDescription('إزالة صلاحيات العضو من هذا التكت').setValue('remove').setEmoji('➖')
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.reply({ content: "⚙️ خيارات الإدارة:", components: [row], ephemeral: true });
        }

        if (interaction.isStringSelectMenu() && customId.startsWith('ticket_manage_')) {
            const hasRole = member.roles.cache.has(TICKET_CATEGORIES['inquiry'].roleIds[0]) || member.permissions.has(PermissionFlagsBits.Administrator);
            if (!hasRole) {
                return interaction.reply({ content: "❌ عذراً، هذه القائمة مخصصة للإدارة فقط!", ephemeral: true });
            }

            const choice = interaction.values[0];
            const channelId = channel.id;

            if (choice === 'claim') {
                const existingClaimerId = claimedTickets.get(channelId);
                if (existingClaimerId) {
                    return interaction.reply({ 
                        content: `❌ لقد تم استلام هذا التكت مسبقاً بواسطة المشرف <@${existingClaimerId}>!`, 
                        ephemeral: true 
                    });
                }

                claimedTickets.set(channelId, member.id);

                const claimTimestamp = Math.floor(Date.now() / 1000);
                let meta = ticketMetaData.get(channelId);
                if (meta) {
                    meta.claimer = member;
                    meta.claimedAt = claimTimestamp;
                }

                await client.db.run(
                    `INSERT INTO points (user_id, ticket_points, voice_points) VALUES (?, 1, 0) ON CONFLICT(user_id) DO UPDATE SET ticket_points = ticket_points + 1`,
                    [member.id]
                );

                const rowData = await client.db.get(`SELECT * FROM points WHERE user_id = ?`, [member.id]);
                const v_pts = rowData ? rowData.voice_points : 0;
                const t_pts = rowData ? rowData.ticket_points : 0;
                const total = v_pts + t_pts;

                const pointsLogChannel = guild.channels.cache.get(POINTS_LOG_CHANNEL_ID);
                if (pointsLogChannel) {
                    const ticketOwnerText = meta && meta.opener ? `${meta.opener} (\`${meta.opener.user.tag}\`)` : 'غير معروف';
                    const ticketTypeName = meta ? meta.ticketType : 'تذكرة دعم';

                    const pointEmbed = new EmbedBuilder()
                        .setTitle("🎫 [تسجيل نقطة] — استلاستلام تذكرة")
                        .setColor(0x3498DB)
                        .setDescription(
                            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                            `**🛡️ الإداري الحاصل على النقطة:**\n${member} (\`${member.user.tag}\`)\n\n` +
                            `**👤 العضو صاحب التكت:**\n${ticketOwnerText}\n\n` +
                            `**📁 النوع والروم:** ${ticketTypeName} (\`${channel.name}\`)\n` +
                            `**⏰ وقت الاحتساب:** ${getMinutesAgo(claimTimestamp)}\n\n` +
                            `**📊 الرصيد المحدث:** تذاكر: \`${t_pts}\` | صوتي: \`${v_pts}\` | المجموع: \`${total}\``
                        )
                        .setTimestamp()
                        .setFooter({ text: "Dev By @555mt" });
                    await pointsLogChannel.send({ embeds: [pointEmbed] });
                }

                try {
                    const currentParts = channel.name.split('-');
                    const ticketNum = currentParts[currentParts.length - 1];
                    const adminName = member.user.username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'admin';
                    await channel.setName(`🟡-Lo-${adminName}-${ticketNum}`);
                } catch (e) {
                    console.error("Failed to update channel name:", e);
                }

                try {
                    const messages = await channel.messages.fetch({ limit: 10 });
                    const botMsg = messages.find(m => m.embeds.length >= 2);
                    if (botMsg) {
                        const oldMainEmbed = botMsg.embeds[0];
                        const oldFormEmbed = botMsg.embeds[1];
                        const updatedFields = [...oldMainEmbed.fields];
                        updatedFields.push({ name: `🟢 تم الاستلام بواسطة :`, value: `${member}`, inline: false });
                        
                        const updatedMainEmbed = EmbedBuilder.from(oldMainEmbed).setFields(updatedFields);
                        await botMsg.edit({ embeds: [updatedMainEmbed, oldFormEmbed] });
                    }
                } catch (e) {
                    console.error(e);
                }

                const claimEmbed = new EmbedBuilder()
                    .setDescription(`### **🟡 التذكرة مُستلمة الآن وسيتابعها معك الإداري ${member}**`)
                    .setColor(0x2f3136)
                    .setFooter({ text: "Dev By @555mt" });

                await channel.send({ embeds: [claimEmbed] });
                
                return interaction.reply({ 
                    content: `✅ تم استلاستلام التكت بنجاح وتم منحك نقطة تذاكر واحدة!`, 
                    ephemeral: true  
                });
            } 
            else if (choice === 'add' || choice === 'remove') {
                const modal = new ModalBuilder()
                    .setCustomId(`modal_sub_${choice}_${channelId}`)
                    .setTitle(choice === 'add' ? 'إضافة شخص (Add Member)' : 'إزالة شخص (Remove Member)');

                const idInput = new TextInputBuilder()
                    .setCustomId('target_user_id')
                    .setLabel('آيدي العضو (User ID)')
                    .setPlaceholder('مثال: 123456789012345678')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(25);

                modal.addComponents(new ActionRowBuilder().addComponents(idInput));
                await interaction.showModal(modal);
            }
        }

        if (interaction.isModalSubmit() && (interaction.customId.startsWith('modal_sub_add_') || interaction.customId.startsWith('modal_sub_remove_'))) {
            const isAdd = interaction.customId.startsWith('modal_sub_add_');
            const targetId = interaction.fields.getTextInputValue('target_user_id').trim();
            
            let targetMember;
            try {
                targetMember = await guild.members.fetch(targetId);
            } catch (error) {
                return interaction.reply({ content: "❌ لم يتم العثور على هذا العضو في السيرفر!", ephemeral: true });
            }

            if (isAdd) {
                await channel.permissionOverwrites.edit(targetMember, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });
                await interaction.reply({ content: `✅ تمت إضافة العضو ${targetMember} إلى التكت بنجاح!`, ephemeral: true });
            } else {
                await channel.permissionOverwrites.delete(targetMember);
                await interaction.reply({ content: "🔒 تم إزالة صلاحيات العضو من هذا التكت.", ephemeral: true });
            }
        }

        if (interaction.isButton() && customId === 'ticket_close_btn') {
            const confirmEmbed = new EmbedBuilder()
                .setDescription(`### **🔴 ${member} يريد إغلاق التذكرة — هل أنت متأكد؟**`)
                .setColor(0xED4245);

            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_confirm_close').setLabel('تأكيد الإغلاق').setStyle(ButtonStyle.Danger).setEmoji('✔'),
                new ButtonBuilder().setCustomId('ticket_cancel_close').setLabel('إلغاء').setStyle(ButtonStyle.Secondary).setEmoji('✖')
            );

            await interaction.reply({
                embeds: [confirmEmbed],
                components: [confirmRow],
                ephemeral: false 
            });
        }

        if (interaction.isButton() && customId === 'ticket_confirm_close') {
            try {
                await interaction.deferUpdate();
            } catch (e) {}

            const closeTimestamp = Math.floor(Date.now() / 1000);
            let meta = ticketMetaData.get(channel.id);
            if (meta) {
                meta.closer = member;
                meta.closedAt = closeTimestamp;
            }

            try {
                const currentName = channel.name;
                const newName = currentName.replace(/^[🟢🟡🔴]/, '🔴');
                await channel.setName(newName);
            } catch (e) {
                console.error("Failed to update channel name to red:", e);
            }

            for (const [targetId] of channel.permissionOverwrites.cache) {
                if (targetId !== guild.id && targetId !== client.user.id) {
                    const cachedMember = guild.members.cache.get(targetId);
                    const isStaff = cachedMember && cachedMember.permissions.has(PermissionFlagsBits.Administrator);
                    
                    if (!isStaff) {
                        await channel.permissionOverwrites.edit(targetId, { ViewChannel: false }).catch(() => {});
                    } else {
                        await channel.permissionOverwrites.edit(targetId, { SendMessages: false }).catch(() => {});
                    }
                }
            }

            const ticketLogChannel = guild.channels.cache.get(TICKET_LOG_CHANNEL_ID);
            if (ticketLogChannel && meta) {
                const openerText = meta.opener ? `${meta.opener} (\`${meta.opener.user.tag}\`)` : 'غير معروف';
                const openedTimeText = getMinutesAgo(meta.openedAt);
                
                const claimerText = meta.claimer ? `${meta.claimer} (\`${meta.claimer.user.tag}\`)` : 'لم يتم الاستلام';
                const claimedTimeText = meta.claimedAt ? getMinutesAgo(meta.claimedAt) : '---';

                const closerText = meta.closer ? `${meta.closer} (\`${meta.closer.user.tag}\`)` : `${member} (\`${member.user.tag}\`)`;
                const closedTimeText = getMinutesAgo(meta.closedAt);

                const logEmbed = new EmbedBuilder()
                    .setTitle(`📁 سجل إغلاق تكت رقم #${meta.ticketNumber}`)
                    .setColor(0xED4245)
                    .setDescription(
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `**📌 نوع التكت:** ${meta.ticketType}\n\n` +
                        `**👤 فتح التكت:** ${openerText} — (${openedTimeText})\n\n` +
                        `**🎫 استلام التكت:** ${claimerText} — (${claimedTimeText})\n\n` +
                        `**🔒 إغلاق التكت:** ${closerText} — (${closedTimeText})\n\n` +
                        `**📌 اسم الروم:** \`${channel.name}\``
                    )
                    .setTimestamp()
                    .setFooter({ text: "Dev By @555mt" });

                await ticketLogChannel.send({ embeds: [logEmbed] });
            }

            const deleteRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('delete_ticket_btn').setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🗑')
            );

            await interaction.message.delete().catch(() => {});
            await channel.send({
                content: `### **🔒 تم إغلاق هذه التذكرة بنجاح.**`,
                components: [deleteRow]
            });
        }

        if (interaction.isButton() && customId === 'ticket_cancel_close') {
            await interaction.message.delete().catch(() => {});
            await interaction.reply({ content: "❌ تم إلغاء عملية إغلاق التكت.", ephemeral: true });
        }

        if (interaction.isButton() && customId === 'delete_ticket_btn') {
            const hasRole = member.permissions.has(PermissionFlagsBits.Administrator);
            if (!hasRole) {
                return interaction.reply({ content: "❌ عذراً، زر الحذف النهائي مخصص للإدارة العليا فقط!", ephemeral: true });
            }

            await interaction.reply({ content: "🗑 جاري حذف التذكرة...", ephemeral: true });
            setTimeout(() => {
                claimedTickets.delete(channel.id);
                ticketMetaData.delete(channel.id);
                channel.delete().catch(() => {});
            }, 3000);
        }

        if (interaction.isButton() && customId === 'persistent_my_points_btn') {
            const rowData = await client.db.get(`SELECT * FROM points WHERE user_id = ?`, [member.id]) || { voice_points: 0, ticket_points: 0 };
            const total = rowData.voice_points + rowData.ticket_points;

            const embed = new EmbedBuilder()
                .setTitle(`📊 Points — ${member.user.username}`)
                .setDescription(
                    `### **✨ رصيدك الإجمالي من النقاط**\n` +
                    `### **${total} نقطة**\n\n` +
                    `**🎟 نقاط التذاكر:** \`${rowData.ticket_points}\`\n` +
                    `**🎙 نقاط الصوتي:** \`${rowData.voice_points}\``
                )
                .setColor(0x2f3136)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: "Dev By @555mt" });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (interaction.isButton() && customId === 'persistent_leaderboard_btn') {
            const rows = await client.db.all(`SELECT * FROM points`);
            if (!rows || rows.length === 0) {
                return interaction.reply({ content: "📌 لا توجد أي نقاط مسجلة حتى الآن في السيرفر!", ephemeral: true });
            }

            rows.sort((a, b) => (b.voice_points + b.ticket_points) - (a.voice_points + a.ticket_points));

            let embedsArray = [];

            for (let index = 0; index < Math.min(rows.length, 10); index++) {
                const data = rows[index];
                const total = data.voice_points + data.ticket_points;
                
                let memberObj;
                try {
                    memberObj = await guild.members.fetch(data.user_id);
                } catch {
                    memberObj = null;
                }

                const username = memberObj ? memberObj.user.username : `مشرف مغادر`;
                const userMention = memberObj ? `${memberObj}` : `(مغادر)`;
                const userAvatar = memberObj ? memberObj.user.displayAvatarURL({ dynamic: true, size: 512 }) : guild.iconURL();

                let rankBadge = `\` #${index + 1} \``;
                if (index === 0) rankBadge = "🥇";
                if (index === 1) rankBadge = "🥈";
                if (index === 2) rankBadge = "🥉";

                const userEmbed = new EmbedBuilder()
                    .setColor(0x2f3136)
                    .setTitle(`${rankBadge}${username}`)
                    .setDescription(
                        `👤 المستخدم: ${userMention}\n` +
                        `✨ المجموع: **${total}** نقطة\n\n` +
                        `🎟 تذاكر: \`${data.ticket_points}\` | 🎙 صوتي: \`${data.voice_points}\``
                    )
                    .setThumbnail(userAvatar);

                embedsArray.push(userEmbed);
            }

            await interaction.reply({ embeds: embedsArray, ephemeral: true });
        }

        if (interaction.isButton() && customId === 'manage_points_list_btn') {
            const hasRole = member.roles.cache.has(SUPPORT_STAFF_ROLE_ID) || member.permissions.has(PermissionFlagsBits.Administrator);
            if (!hasRole) {
                return interaction.reply({ content: "❌ عذراً، هذه اللوحة مخصصة للإدارة فقط!", ephemeral: true });
            }

            const rows = await client.db.all(`SELECT * FROM points`);
            if (!rows || rows.length === 0) {
                return interaction.reply({ content: "📌 لا توجد أي نقاط مسجلة حتى الآن في السيرفر!", ephemeral: true });
            }

            rows.sort((a, b) => (b.voice_points + b.ticket_points) - (a.voice_points + a.ticket_points));

            let descriptionText = "### **🛠️ لوحة إدارة وتحكم نقاط المشرفين**\n\nاختر المشرف من القائمة أدناه لتعديل أو تصفير نقاطه:\n\n";
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('admin_select_target_point')
                .setPlaceholder('اختر المشرف للتعديل على نقاطه...');

            let optionsCount = 0;
            for (let index = 0; index < rows.length && optionsCount < 25; index++) {
                const data = rows[index];
                let memberObj;
                try {
                    memberObj = await guild.members.fetch(data.user_id);
                } catch {
                    memberObj = null;
                }

                const username = memberObj ? memberObj.user.username : `مشرف مغادر (${data.user_id})`;
                const total = data.voice_points + data.ticket_points;

                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(username.substring(0, 25))
                        .setDescription(`المجموع: ${total} | تذاكر: ${data.ticket_points} \vert{} صوتي: ${data.voice_points}`)
                        .setValue(`pt_target_${data.user_id}`)
                );
                optionsCount++;
            }

            const row = new ActionRowBuilder().addComponents(selectMenu);

            return await interaction.reply({ 
                content: descriptionText, 
                components: [row], 
                ephemeral: true 
            });
        }

        if (interaction.isStringSelectMenu() && customId === 'admin_select_target_point') {
            const hasRole = member.roles.cache.has(SUPPORT_STAFF_ROLE_ID) || member.permissions.has(PermissionFlagsBits.Administrator);
            if (!hasRole) {
                return interaction.reply({ content: "❌ عذراً، هذه القائمة مخصصة للإدارة فقط!", ephemeral: true });
            }

            const targetUserId = interaction.values[0].replace('pt_target_', '');
            let targetMember;
            try {
                targetMember = await guild.members.fetch(targetUserId);
            } catch {
                targetMember = null;
            }

            const rowData = await client.db.get(`SELECT * FROM points WHERE user_id = ?`, [targetUserId]) || { voice_points: 0, ticket_points: 0 };
            const total = rowData.voice_points + rowData.ticket_points;
            const username = targetMember ? targetMember.user.tag : targetUserId;

            const controlRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`pt_act_reset_${targetUserId}`).setLabel('تصفير النقاط').setStyle(ButtonStyle.Danger).setEmoji('🔄'),
                new ButtonBuilder().setCustomId(`pt_modal_add_${targetUserId}`).setLabel('إضافة نقاط').setStyle(ButtonStyle.Success).setEmoji('➕'),
                new ButtonBuilder().setCustomId(`pt_modal_remove_${targetUserId}`).setLabel('إزالة نقاط').setStyle(ButtonStyle.Secondary).setEmoji('➖')
            );

            return await interaction.reply({
                content: `⚙️ **التحكم بنقاط العضو:** \`${username}\`\n📊 **الرصيد الحالي:** مجموع (\`${total}\`) | تذاكر (\`${rowData.ticket_points}\`) | صوتي (\`${rowData.voice_points}\`)`,
                components: [controlRow],
                ephemeral: true
            });
        }

        if (interaction.isButton() && (customId.startsWith('pt_modal_add_') || customId.startsWith('pt_modal_remove_'))) {
            const hasRole = member.roles.cache.has(SUPPORT_STAFF_ROLE_ID) || member.permissions.has(PermissionFlagsBits.Administrator);
            if (!hasRole) {
                return interaction.reply({ content: "❌ عذراً، صلاحيات التعديل للمشرفين فقط!", ephemeral: true });
            }

            const parts = customId.split('_');
            const actionType = parts[2];
            const targetUserId = parts[3];

            const modal = new ModalBuilder()
                .setCustomId(`modal_points_action_${actionType}_${targetUserId}`)
                .setTitle(actionType === 'add' ? 'إضافة نقاط للمشرف' : 'إزالة نقاط من المشرف');

            const amountInput = new TextInputBuilder()
                .setCustomId('points_amount')
                .setLabel('عدد النقاط المطلوب')
                .setPlaceholder('اكتب الرقم هنا (مثال: 5)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(5);

            const reasonInput = new TextInputBuilder()
                .setCustomId('points_reason')
                .setLabel('السبب (إجباري)')
                .setPlaceholder('اكتب سبب الإضافة أو الإزالة بالتفصيل...')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(250);

            modal.addComponents(new ActionRowBuilder().addComponents(amountInput), new ActionRowBuilder().addComponents(reasonInput));
            return await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_points_action_')) {
            const parts = interaction.customId.split('_');
            const actionType = parts[3];
            const targetUserId = parts[4];

            const amountStr = interaction.fields.getTextInputValue('points_amount').trim();
            const reason = interaction.fields.getTextInputValue('points_reason').trim();
            const amount = parseInt(amountStr);

            if (isNaN(amount) || amount <= 0) {
                return interaction.reply({ content: "❌ الرجاء إدخال رقم صحيح أكبر من الصفر في خانة عدد النقاط!", ephemeral: true });
            }

            const currentData = await client.db.get(`SELECT * FROM points WHERE user_id = ?`, [targetUserId]) || { ticket_points: 0, voice_points: 0 };
            
            if (actionType === 'add') {
                await client.db.run(
                    `INSERT INTO points (user_id, ticket_points, voice_points) VALUES (?, ?, 0) ON CONFLICT(user_id) DO UPDATE SET ticket_points = ticket_points + ?`,
                    [targetUserId, amount, amount]
                );
            } else if (actionType === 'remove') {
                let tPts = currentData.ticket_points;
                let vPts = currentData.voice_points;
                
                if (tPts >= amount) {
                    tPts -= amount;
                } else {
                    const remainder = amount - tPts;
                    tPts = 0;
                    vPts = Math.max(0, vPts - remainder);
                }

                await client.db.run(`UPDATE points SET ticket_points = ?, voice_points = ? WHERE user_id = ?`, [tPts, vPts, targetUserId]);
            }

            const updatedData = await client.db.get(`SELECT * FROM points WHERE user_id = ?`, [targetUserId]) || { voice_points: 0, ticket_points: 0 };
            const newTotal = updatedData.voice_points + updatedData.ticket_points;

            let targetMember;
            try {
                targetMember = await guild.members.fetch(targetUserId);
            } catch {
                targetMember = null;
            }
            const username = targetMember ? targetMember.user.tag : targetUserId;

            const highPointLogChannel = guild.channels.cache.get(HIGH_POINT_LOG_CHANNEL_ID);
            if (highPointLogChannel) {
                const actionTitle = actionType === 'add' ? '➕ [سجل هاي بوينت] — إضافة نقاط إدارية' : '➖ [سجل هاي بوينت] — إزالة نقاط إدارية';
                const actionColor = actionType === 'add' ? 0x2ECC71 : 0xE74C3C;
                const timestampNow = Math.floor(Date.now() / 1000);

                const highPointEmbed = new EmbedBuilder()
                    .setTitle(actionTitle)
                    .setColor(actionColor)
                    .setDescription(
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `**🛡 الإداري المسؤول (الذي أعطى/سحب):**\n${member} (\`${member.user.tag}\`)\n\n` +
                        `**👤 العضو المستهدف (المشرف):**\n${targetMember || username} (\`${username}\`)\n\n` +
                        `**🔢 الكمية المعدلة:** \`${amount}\` نقطة\n` +
                        `**📝 السبب:** ${reason}\n` +
                        `**⏰ وقت العملية:** <t:${timestampNow}:R>\n\n` +
                        `**📊 الرصيد الجديد للمشرف:** مجموع (\`${newTotal}\`) | تذاكر: \`${updatedData.ticket_points}\` | صوتي: \`${updatedData.voice_points}\``
                    )
                    .setTimestamp()
                    .setFooter({ text: "Dev By @555mt - High Point Log" });
                await highPointLogChannel.send({ embeds: [highPointEmbed] });
            }

            return await interaction.reply({
                content: `✅ **تم ${actionType === 'add' ? 'إضافة' : 'إزالة'} ${amount} نقطة بنجاح!**\n👤 **العضو:** \`${username}\`\n📝 **السبب:** ${reason}\n📊 **الرصيد الجديد:** مجموع (\`${newTotal}\`) | تذاكر (\`${updatedData.ticket_points}\`) | صوتي (\`${updatedData.voice_points}\`)`,
                ephemeral: true
            });
        }

        if (interaction.isButton() && customId.startsWith('pt_act_reset_')) {
            const hasRole = member.roles.cache.has(SUPPORT_STAFF_ROLE_ID) || member.permissions.has(PermissionFlagsBits.Administrator);
            if (!hasRole) {
                return interaction.reply({ content: "❌ عذراً، صلاحيات التصفير للمشرفين فقط!", ephemeral: true });
            }

            const targetUserId = customId.replace('pt_act_reset_', '');
            
            const oldData = await client.db.get(`SELECT * FROM points WHERE user_id = ?`, [targetUserId]) || { ticket_points: 0, voice_points: 0 };
            const oldTotal = oldData.voice_points + oldData.ticket_points;

            await client.db.run(`UPDATE points SET ticket_points = 0, voice_points = 0 WHERE user_id = ?`, [targetUserId]);

            let targetMember;
            try {
                targetMember = await guild.members.fetch(targetUserId);
            } catch {
                targetMember = null;
            }
            const username = targetMember ? targetMember.user.tag : targetUserId;

            const highPointLogChannel = guild.channels.cache.get(HIGH_POINT_LOG_CHANNEL_ID);
            if (highPointLogChannel) {
                const timestampNow = Math.floor(Date.now() / 1000);
                const resetEmbed = new EmbedBuilder()
                    .setTitle('🔄 [سجل هاي بوينت] — تصفير نقاط مشرف')
                    .setColor(0xE67E22)
                    .setDescription(
                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `**🛡️ الإداري المسؤول (الذي صفّر):**\n${member} (\`${member.user.tag}\`)\n\n` +
                        `**👤 العضو المستهدف (المشرف):**\n${targetMember || username} (\`${username}\`)\n\n` +
                        `**📊 الرصيد السابق قبل التصفير:** \`${oldTotal}\` نقطة\n` +
                        `**🔄 العملية:** تصفير شامل للأرصدة (\`0\`)\n` +
                        `**⏰ وقت العملية:** <t:${timestampNow}:R>`
                    )
                    .setTimestamp()
                    .setFooter({ text: "Dev By @555mt - High Point Log" });
                await highPointLogChannel.send({ embeds: [resetEmbed] });
            }

            return await interaction.update({
                content: `✅ **تم تصفير نقاط العضو بنجاح 🔄**\n👤 **العضو:** \`${username}\`\n📊 **الرصيد الجديد:** \`0\` نقطة`,
                components: []
            });
        }
    },

    async handleVoiceState(oldState, newState, client) {
        if (oldState.channelId !== newState.channelId && newState.channelId !== null) {
            if (oldState.channelId === WAITING_ROOM_ID) {
                const supportChannel = newState.channel;
                const channelNameLower = supportChannel.name.toLowerCase();
                const isSupportRoom = channelNameLower.includes("support") || channelNameLower.includes("دعم") || channelNameLower.includes("سبورت");

                if (isSupportRoom) {
                    let eligibleAdmin = null;
                    
                    for (const [mId, m] of supportChannel.members) {
                        if (mId !== newState.member.id && !m.user.bot) {
                            if (m.roles.cache.has(SUPPORT_STAFF_ROLE_ID)) {
                                eligibleAdmin = m;
                                break;
                            }
                        }
                    }

                    if (eligibleAdmin) {
                        await client.db.run(
                            `INSERT INTO points (user_id, ticket_points, voice_points) VALUES (?, 0, 1) ON CONFLICT(user_id) DO UPDATE SET voice_points = voice_points + 1`,
                            [eligibleAdmin.id]
                        );

                        const rowData = await client.db.get(`SELECT * FROM points WHERE user_id = ?`, [eligibleAdmin.id]);
                        const v_pts = rowData.voice_points;
                        const t_pts = rowData.ticket_points;
                        const total = v_pts + t_pts;
                        const pullTimestamp = Math.floor(Date.now() / 1000);

                        const pointsLogChannel = newState.guild.channels.cache.get(POINTS_LOG_CHANNEL_ID);
                        if (pointsLogChannel) {
                            const pointEmbed = new EmbedBuilder()
                                .setTitle("🎙 [تسجيل نقطة] — سحب صوتي")
                                .setColor(0x2ECC71)
                                .setDescription(
                                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                    `**🛡 الإداري الحاصل على النقطة:**\n${eligibleAdmin} (\`${eligibleAdmin.user.tag}\`)\n\n` +
                                    `**👤 العضو المسحوب:**\n${newState.member} (\`${newState.member.user.tag}\`)\n\n` +
                                    `**📁 روم السبورت:** ${supportChannel.name}\n` +
                                    `**⏰ وقت الاحتساب:** ${getMinutesAgo(pullTimestamp)}\n\n` +
                                    `**📊 الرصيد المحدث:** صوتي: \`${v_pts}\` | تذاكر: \`${t_pts}\` | المجموع: \`${total}\``
                                )
                                .setTimestamp()
                                .setFooter({ text: "Dev By @555mt" });
                            await pointsLogChannel.send({ embeds: [pointEmbed] });
                        }
                    }
                }
            }
        }
    }
};