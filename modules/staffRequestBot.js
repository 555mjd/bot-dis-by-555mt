const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionsBitField 
} = require('discord.js');

module.exports = {
    async handleInteraction(interaction) {
        // 1. معالجة القائمة المنسدلة (Select Menu)
        if (interaction.isStringSelectMenu() && interaction.customId === 'select_staff_request') {
            const selectedValue = interaction.values[0];

            // أ) طلب إجازة
            if (selectedValue === 'req_leave') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_req_leave')
                    .setTitle('طلب إجازة إدارية');

                const durationInput = new TextInputBuilder()
                    .setCustomId('leave_duration')
                    .setLabel('مدة الإجازة')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('مثال: 3 أيام / أسبوع...')
                    .setRequired(true);

                const reasonInput = new TextInputBuilder()
                    .setCustomId('leave_reason')
                    .setLabel('سبب الإجازة')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('اكتب سبب طلب الإجازة هنا...')
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(durationInput),
                    new ActionRowBuilder().addComponents(reasonInput)
                );
                return await interaction.showModal(modal);
            }

            // ب) طلب كسر إجازة
            if (selectedValue === 'req_break_leave') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_req_break_leave')
                    .setTitle('طلب كسر إجازة');

                const reasonInput = new TextInputBuilder()
                    .setCustomId('break_reason')
                    .setLabel('سبب كسر الإجازة')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('اكتب سبب العودة المبكرة وتواجدك...')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                return await interaction.showModal(modal);
            }

            // ج) طلب استقالة
            if (selectedValue === 'req_resign') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_req_resign')
                    .setTitle('طلب استقالة إدارية');

                const roleInput = new TextInputBuilder()
                    .setCustomId('resign_role')
                    .setLabel('رتبتك الحالية')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('اكتب مسمى رتبتك الإدارية الحالية...')
                    .setRequired(true);

                const reasonInput = new TextInputBuilder()
                    .setCustomId('resign_reason')
                    .setLabel('سبب الاستقالة')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('اكتب سبب دافع الاستقالة...')
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(roleInput),
                    new ActionRowBuilder().addComponents(reasonInput)
                );
                return await interaction.showModal(modal);
            }
        }

        // 2. معالجة إرسال النماذج (Modal Submit)
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_req_')) {
            const logChannelId = process.env.STAFF_HOLIDAY_RESIGN_LOG_CHANNEL_ID;
            if (!logChannelId) {
                return await interaction.reply({ content: '❌ لم يتم ضبط روم اللوق (STAFF_HOLIDAY_RESIGN_LOG_CHANNEL_ID) في .env', ephemeral: true });
            }

            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (!logChannel) {
                return await interaction.reply({ content: '❌ تعذر العثور على روم السجلات في السيرفر.', ephemeral: true });
            }

            const submittedAt = Math.floor(Date.now() / 1000);
            let embed = new EmbedBuilder().setTimestamp();
            let actionType = '';

            // نموذج طلب إجازة
            if (interaction.customId === 'modal_req_leave') {
                actionType = 'leave';
                const duration = interaction.fields.getTextInputValue('leave_duration');
                const reason = interaction.fields.getTextInputValue('leave_reason');

                embed.setTitle('🌴 طلب إجازة إدارية جديد')
                    .setColor('#f39c12')
                    .addFields(
                        { name: '👤 المتقدم:', value: `${interaction.user}`, inline: false },
                        { name: '⏳ المدة:', value: duration, inline: true },
                        { name: '📝 السبب:', value: reason, inline: false },
                        { name: '⏰ تاريخ الطلب:', value: `<t:${submittedAt}:f>`, inline: false }
                    );
            }

            // نموذج كسر إجازة
            if (interaction.customId === 'modal_req_break_leave') {
                actionType = 'break';
                const reason = interaction.fields.getTextInputValue('break_reason');

                embed.setTitle('⚡ طلب كسر إجازة جديد')
                    .setColor('#e67e22')
                    .addFields(
                        { name: '👤 المتقدم:', value: `${interaction.user}`, inline: false },
                        { name: '📝 السبب:', value: reason, inline: false },
                        { name: '⏰ تاريخ الطلب:', value: `<t:${submittedAt}:f>`, inline: false }
                    );
            }

            // نموذج طلب استقالة
            if (interaction.customId === 'modal_req_resign') {
                actionType = 'resign';
                const role = interaction.fields.getTextInputValue('resign_role');
                const reason = interaction.fields.getTextInputValue('resign_reason');

                embed.setTitle('🚪 طلب استقالة إدارية جديد')
                    .setColor('#e74c3c')
                    .addFields(
                        { name: '👤 المتقدم:', value: `${interaction.user}`, inline: false },
                        { name: '🎖 الرتبة الحالية:', value: role, inline: true },
                        { name: '📝 السبب:', value: reason, inline: false },
                        { name: '⏰ تاريخ الطلب:', value: `<t:${submittedAt}:f>`, inline: false }
                    );
            }

            // أزرار القبول والرفض للإدارة
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`sreq_accept_${actionType}_${interaction.user.id}`)
                    .setLabel('قبول')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`sreq_reject_${actionType}_${interaction.user.id}`)
                    .setLabel('رفض')
                    .setStyle(ButtonStyle.Danger)
            );

            await logChannel.send({ embeds: [embed], components: [row] });
            return await interaction.reply({ content: '✅ تم إرسال طلبك للإدارة بنجاح وسيتم الرد عليك قريباً.', ephemeral: true });
        }

        // 3. معالجة أزرار القبول والرفض من قِبَل الإدارة
        if (interaction.isButton() && (interaction.customId.startsWith('sreq_accept_') || interaction.customId.startsWith('sreq_reject_'))) {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
                !interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return await interaction.reply({ content: '❌ لا تمتلك صلاحية اتخاذ القرار.', ephemeral: true });
            }

            const parts = interaction.customId.split('_');
            const isAccept = parts[1] === 'accept';
            const reqType = parts[2];
            const targetUserId = parts[3];

            // عند الرفض (نفتح مودال سبب الرفض أولاً)
            if (!isAccept) {
                const modal = new ModalBuilder()
                    .setCustomId(`modal_sreq_reject_${reqType}_${targetUserId}`)
                    .setTitle('سبب الرفض');

                const reasonInput = new TextInputBuilder()
                    .setCustomId('reject_reason')
                    .setLabel('سبب الرفض')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('اكتب سبب الرفض هنا...')
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                return await interaction.showModal(modal);
            }

            // عند القبول (نسوي deferUpdate فوراً لمنع انتهاء مهلة ديسكورد)
            await interaction.deferUpdate();

            const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);

            if (targetMember) {
                // 1. قبول الإجازة
                if (reqType === 'leave') {
                    const leaveRoleId = process.env.LEAVE_ROLE_ID;
                    if (leaveRoleId) await targetMember.roles.add(leaveRoleId).catch(() => {});
                    await targetMember.send(`✅ تم **قبول** طلب الإجازة الخاص بك في سيرفر **${interaction.guild.name}**.`).catch(() => {});
                }

                // 2. قبول كسر الإجازة
                if (reqType === 'break') {
                    const leaveRoleId = process.env.LEAVE_ROLE_ID;
                    if (leaveRoleId) await targetMember.roles.remove(leaveRoleId).catch(() => {});
                    await targetMember.send(`⚡ تم **قبول** طلب كسر الإجازة وعودتك للمهام في سيرفر **${interaction.guild.name}**.`).catch(() => {});
                }

                // 3. قبول الاستقالة
                if (reqType === 'resign') {
                    const exemptRoles = (process.env.EXEMPT_STAFF_ROLES || '')
                        .split(',')
                        .map(r => r.trim())
                        .filter(Boolean);

                    const rolesToRemove = targetMember.roles.cache.filter(role => 
                        role.id !== interaction.guild.id && !exemptRoles.includes(role.id)
                    );

                    if (rolesToRemove.size > 0) {
                        await targetMember.roles.remove(rolesToRemove).catch(err => {
                            console.error('خطأ أثناء سحب الرتب عند الاستقالة:', err);
                        });
                    }

                    await targetMember.send(`👋 تم **قبول** طلب استقالتك من سيرفر **${interaction.guild.name}** وتم سحب جميع الرتب الإدارية. نتمنى لك التوفيق!`).catch(() => {});
                }
            }

            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor('#2ecc71')
                .setTitle(`${interaction.message.embeds[0].title} - (مقبول ✅)`)
                .addFields({ name: '⚙️ تم القبول بواسطة:', value: `${interaction.user}`, inline: false });

            return await interaction.editReply({ embeds: [updatedEmbed], components: [] });
        }

        // 4. معالجة سبب الرفض من المودال
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_sreq_reject_')) {
            await interaction.deferUpdate();

            const parts = interaction.customId.split('_');
            const targetUserId = parts[4];
            const rejectReason = interaction.fields.getTextInputValue('reject_reason');

            const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
            if (targetMember) {
                await targetMember.send(`❌ تم **رفض** طلبك الإداري في سيرفر **${interaction.guild.name}**.\n**السبب:** ${rejectReason}`).catch(() => {});
            }

            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor('#e74c3c')
                .setTitle(`${interaction.message.embeds[0].title} - (مرفوض ❌)`)
                .addFields(
                    { name: '⚙️️ تم الرفض بواسطة:', value: `${interaction.user}`, inline: true },
                    { name: '📝 سبب الرفض:', value: rejectReason, inline: false }
                );

            return await interaction.editReply({ embeds: [updatedEmbed], components: [] });
        }
    }
};