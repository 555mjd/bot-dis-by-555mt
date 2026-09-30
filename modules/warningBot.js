const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    EmbedBuilder,
    PermissionsBitField 
} = require('discord.js');

module.exports = {
    async handleInteraction(interaction) {
        // 1. تحقق من صلاحيات الإدارة للأزرار
        if (interaction.isButton() && (interaction.customId.startsWith('btn_warn_') || interaction.customId === 'btn_exempt')) {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && 
                !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return await interaction.reply({ 
                    content: '❌ لا تمتلك الصلاحيات الإدارية الكافية لاستخدام هذه اللوحة.', 
                    ephemeral: true 
                });
            }

            // زر الإعفاءات
            if (interaction.customId === 'btn_exempt') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_exempt')
                    .setTitle('إصدار إعفاء إداري');

                const userInput = new TextInputBuilder()
                    .setCustomId('target_user_id')
                    .setLabel('آيدي العضو (User ID)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('ضع آيدي العضو المُراد إعفاؤه...')
                    .setRequired(true);

                const actionTypeInput = new TextInputBuilder()
                    .setCustomId('exempt_action')
                    .setLabel('العقوبة المعفي منها (إنذار 1، فصل...)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('مثال: إنذار أول / فصل / بلاك ليست')
                    .setRequired(true);

                const reasonInput = new TextInputBuilder()
                    .setCustomId('exempt_reason')
                    .setLabel('سبب الإعفاء')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('اكتب سبب الإعفاء...')
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(userInput),
                    new ActionRowBuilder().addComponents(actionTypeInput),
                    new ActionRowBuilder().addComponents(reasonInput)
                );

                return await interaction.showModal(modal);
            }

            // أزرار العقوبات (إنذارات / فصل / بلاك ليست)
            const warnType = interaction.customId; 
            const modal = new ModalBuilder()
                .setCustomId(`modal_${warnType}`)
                .setTitle('إصدار عقوبة إدارية');

            const userInput = new TextInputBuilder()
                .setCustomId('target_user_id')
                .setLabel('آيدي العضو (User ID)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('ضع آيدي الشخص هنا...')
                .setRequired(true);

            const reasonInput = new TextInputBuilder()
                .setCustomId('warn_reason')
                .setLabel('سبب العقوبة')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('اكتب سبب العقوبة بالتفصيل...')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(userInput),
                new ActionRowBuilder().addComponents(reasonInput)
            );

            return await interaction.showModal(modal);
        }

        // 2. معالجة الإعفاءات
        if (interaction.isModalSubmit() && interaction.customId === 'modal_exempt') {
            await interaction.deferReply({ ephemeral: true });

            const targetId = interaction.fields.getTextInputValue('target_user_id');
            const actionText = interaction.fields.getTextInputValue('exempt_action');
            const reason = interaction.fields.getTextInputValue('exempt_reason');

            const member = await interaction.guild.members.fetch(targetId).catch(() => null);
            if (!member) return await interaction.editReply({ content: '❌ تعذر العثور على العضو.' });

            // إزالة رتب العقوبات إن وجدت
            const rolesToRemove = [
                process.env.WARN_ROLE_1, 
                process.env.WARN_ROLE_2, 
                process.env.WARN_ROLE_3, 
                process.env.BAN_ROLE, 
                process.env.BLACKLIST_ROLE
            ].filter(Boolean);

            for (const rId of rolesToRemove) {
                if (member.roles.cache.has(rId)) {
                    await member.roles.remove(rId).catch(() => {});
                }
            }

            const darkRed = '#8B0000';

            // إرسال تقرير الإعفاء
            const reportChannel = interaction.guild.channels.cache.get(process.env.REPORT_LOG_CHANNEL_ID);
            if (reportChannel) {
                const exemptEmbed = new EmbedBuilder()
                    .setTitle('🕊️ قرار إعفاء إداري')
                    .setColor(darkRed)
                    .addFields(
                        { name: '👤 العضو المعفى:', value: `${member}\n\`${member.id}\``, inline: false },
                        { name: '🛡️ الإداري المنفذ:', value: `${interaction.user}\n\`${interaction.user.id}\``, inline: false },
                        { name: '📋 الفعل المعفى عنه:', value: `**${actionText}**`, inline: false },
                        { name: '📝 سبب الإعفاء:', value: `\`\`\`${reason}\`\`\``, inline: false }
                    )
                    .setTimestamp();

                await reportChannel.send({ embeds: [exemptEmbed] }).catch(() => {});
            }

            return await interaction.editReply({ content: `✅ تم إصدار الإعفاء للعضو ${member} وتسجيل التقرير.` });
        }

        // 3. معالجة العقوبات التلقائية (إنذارات 1,2,3 - فصل - بلاك ليست)
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_btn_warn_')) {
            await interaction.deferReply({ ephemeral: true });

            const targetId = interaction.fields.getTextInputValue('target_user_id');
            const reason = interaction.fields.getTextInputValue('warn_reason');

            const member = await interaction.guild.members.fetch(targetId).catch(() => null);
            if (!member) return await interaction.editReply({ content: '❌ تعذر العثور على العضو في السيرفر.' });

            let roleId = null;
            let warnTitle = '';
            let days = 0;
            let isDemotion = false;
            let demotionDisplay = '';
            const darkRed = '#8B0000'; // أحمر داكن

            if (interaction.customId === 'modal_btn_warn_1') {
                roleId = process.env.WARN_ROLE_1;
                warnTitle = 'إنذار أول (Warning 1)';
                days = 4; // 4 أيام
            } else if (interaction.customId === 'modal_btn_warn_2') {
                roleId = process.env.WARN_ROLE_2;
                warnTitle = 'إنذار ثاني (Warning 2)';
                days = 8; // 8 أيام
            } else if (interaction.customId === 'modal_btn_warn_3') {
                warnTitle = 'إنذار ثالث (كسر رتبة)';
                isDemotion = true; // كسر رتبة
            } else if (interaction.customId === 'modal_btn_warn_ban') {
                roleId = process.env.BAN_ROLE;
                warnTitle = 'فصل إداري';
            } else if (interaction.customId === 'modal_btn_warn_bl') {
                roleId = process.env.BLACKLIST_ROLE;
                warnTitle = '(Blacklist)';
            }

            // تطبيق كسر الرتبة مع تحديث دقيق للهيكل
            if (isDemotion) {
                // تحديث وقراءة كافّة رتب السيرفر للحصول على الترتيب الأصلي الدقيق من ديسكورد
                const fetchedRoles = await interaction.guild.roles.fetch();
                
                // تصفية رتب السيرفر المرتبة من الأعلى للأسفل (استبعاد رتبة الجميع ورتب البوتات التلقائية)
                const guildRolesSorted = Array.from(fetchedRoles.values())
                    .filter(r => r.id !== interaction.guild.id && !r.managed)
                    .sort((a, b) => b.position - a.position);

                // تحديد أعلى رتبة يمتلكها العضو حالياً
                const highestUserRole = member.roles.cache
                    .filter(r => r.id !== interaction.guild.id && !r.managed)
                    .sort((a, b) => b.position - a.position)
                    .first();

                if (highestUserRole) {
                    // إيجاد مكان الرتبة الحالية ضمن ترتيب السيرفر الكامل
                    const currentRoleIndex = guildRolesSorted.findIndex(r => r.id === highestUserRole.id);
                    
                    // اختيار الرتبة الشاغرة التالية أسفلها مباشرة
                    const nextLowerRole = guildRolesSorted[currentRoleIndex + 1];

                    // سحب أعلى رتبة يمتلكها العضو
                    await member.roles.remove(highestUserRole).catch(() => {});

                    // منح العضو الرتبة التالية مباشرة في الترتيب
                    if (nextLowerRole) {
                        await member.roles.add(nextLowerRole).catch(() => {});
                        demotionDisplay = `<@&${nextLowerRole.id}> ➔ <@&${highestUserRole.id}>`;
                    } else {
                        demotionDisplay = `<@&${highestUserRole.id}> ➔ (لا توجد رتبة أدنى)`;
                    }
                } else {
                    demotionDisplay = 'لا يمتلك العضو رتباً لكسرها';
                }
            } else if (roleId) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (role) await member.roles.add(role).catch(() => {});
            }

            // تحديد طريقة العرض للتقرير والقرار
            const punishmentDisplay = isDemotion 
                ? `**كسر رتبة:** ${demotionDisplay}`
                : (roleId ? `<@&${roleId}>` : `**${warnTitle}**`);

            // حفظ العقوبة المحددة بمدة في قاعدة البيانات
            if (days > 0 && roleId && interaction.client.db) {
                const expiresAt = Date.now() + (days * 86400000);
                await interaction.client.db.run(
                    'INSERT INTO active_warnings (user_id, role_id, expires_at) VALUES (?, ?, ?)',
                    [targetId, roleId, expiresAt]
                );
            }

            const durationText = days > 0 ? `${days} أيام` : (isDemotion ? 'كسر رتبة' : 'دائم');

            // أ) التقرير الإداري الطولي
            const reportChannel = interaction.guild.channels.cache.get(process.env.REPORT_LOG_CHANNEL_ID);
            if (reportChannel) {
                const reportEmbed = new EmbedBuilder()
                    .setTitle('📜 تقرير عقوبة إدارية')
                    .setColor(darkRed)
                    .addFields(
                        { name: '👤 العضو المعاقب:', value: `${member}\n\`${member.id}\``, inline: false },
                        { name: '🛡️ الإداري المنفذ:', value: `${interaction.user}\n\`${interaction.user.id}\``, inline: false },
                        { name: '⚠️ نوع العقوبة / القرار:', value: punishmentDisplay, inline: false },
                        { name: '⏳ المدة / النتيجة:', value: `\`${durationText}\``, inline: false },
                        { name: '📝 السبب:', value: `\`\`\`${reason}\`\`\``, inline: false }
                    )
                    .setTimestamp();

                await reportChannel.send({ embeds: [reportEmbed] }).catch(() => {});
            }

            // ب) القرار المعلن الطولي
            const decisionChannel = interaction.guild.channels.cache.get(process.env.DECISION_LOG_CHANNEL_ID);
            if (decisionChannel) {
                const decisionEmbed = new EmbedBuilder()
                    .setTitle('📢 قرار إداري رسمي')
                    .setColor(darkRed)
                    .setDescription('بناءً على الصلاحيات الممنوحة، تقرر إصدار العقوبة التالية:')
                    .addFields(
                        { name: '👤 العضو المعني:', value: `${member}`, inline: false },
                        { name: '📌 العقوبة الصادرة:', value: punishmentDisplay, inline: false },
                        { name: '⏳ المدة / الأثر:', value: `\`${durationText}\``, inline: false },
                        { name: '📖 السبب:', value: `${reason}`, inline: false }
                    )
                    .setTimestamp();

                await decisionChannel.send({ embeds: [decisionEmbed] }).catch(() => {});
            }

            return await interaction.editReply({ 
                content: `✅ تم تنفيذ العقوبة بحق العضو ${member} بنجاح.` 
            });
        }
    },

    async checkExpiredWarnings(client) {
        if (!client.db) return;
        const now = Date.now();
        const expired = await client.db.all('SELECT * FROM active_warnings WHERE expires_at <= ?', [now]);

        for (const record of expired) {
            for (const guild of client.guilds.cache.values()) {
                const member = await guild.members.fetch(record.user_id).catch(() => null);
                if (member && record.role_id) {
                    await member.roles.remove(record.role_id).catch(() => {});
                }
            }
            await client.db.run('DELETE FROM active_warnings WHERE id = ?', [record.id]);
        }
    }
};