const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');

let isApplyOpen = true; // حالة التقديم (مفتوح / مغلق)

module.exports = {
    async handleInteraction(interaction) {
        const { guild, member, customId } = interaction;
        console.log(`📌 تم استقبال تفاعل في applyBot بـ customId: ${customId}`);
        
        // 1. زر فتح نموذج التقديم للعضو
        if (customId === 'apply_open') {
            if (!isApplyOpen) {
                return interaction.reply({ content: "❌ عذراً، التقديم على الطاقم الإداري مغلق حالياً!", ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId('apply_modal')
                .setTitle('📝 نموذج التقديم على الطاقم الإداري');

            const q1 = new TextInputBuilder()
                .setCustomId('apply_q_age')
                .setLabel('كم عمرك؟ *')
                .setPlaceholder('اكتب عمرك هنا')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const q2 = new TextInputBuilder()
                .setCustomId('apply_q_experience')
                .setLabel('هل لديك خبرات سابقة؟ *')
                .setPlaceholder('اذكر خبراتك السابقة في الإدارة أو السيرفرات')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const q3 = new TextInputBuilder()
                .setCustomId('apply_q_why')
                .setLabel('لماذا تريد انضمامك للإدارة؟ *')
                .setPlaceholder('اكتب سبب رغبتك بالانضمام')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(q1),
                new ActionRowBuilder().addComponents(q2),
                new ActionRowBuilder().addComponents(q3)
            );

            return await interaction.showModal(modal);
        }

        // 2. زر إدارة التقديم (فتح / إغلاق) للمسؤولين
        if (customId === 'apply_toggle') {
            if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: "❌ عذراً، هذا الزر مخصص للإدارة العليا فقط!", ephemeral: true });
            }

            isApplyOpen = !isApplyOpen;
            return interaction.reply({ 
                content: `✅ تم تغيير حالة التقديم بنجاح، وأصبح الآن: **${isApplyOpen ? 'مفتوح ✅' : 'مغلق ❌'}**`, 
                ephemeral: true 
            });
        }

        // 3. استقبال إرسال نموذج التقديم من المتقدم
        if (interaction.isModalSubmit() && customId === 'apply_modal') {
            await interaction.deferReply({ ephemeral: true });

            const age = interaction.fields.getTextInputValue('apply_q_age');
            const experience = interaction.fields.getTextInputValue('apply_q_experience');
            const why = interaction.fields.getTextInputValue('apply_q_why');

            const logChannelId = process.env.APP_CHANNEL_ID;
            const logChannel = guild.channels.cache.get(logChannelId);
            if (!logChannel) {
                return interaction.editReply({ content: "❌ عذراً، روم لوق التقديم غير مضبوط في ملف الـ .env!" });
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 طلب تقديم إداري جديد')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setColor(0x2b2d31)
                .addFields(
                    { name: '👤 المتقدم:', value: `${member} (\`${member.id}\`)`, inline: false },
                    { name: '📅 العمر:', value: `\`${age}\``, inline: true },
                    { name: '🛠️ الخبرات:', value: experience, inline: false },
                    { name: '💡 السبب:', value: why, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: "Low Fights Application System" });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`apply_accept_${member.id}`).setLabel('قبول').setStyle(ButtonStyle.Success).setEmoji('✔'),
                new ButtonBuilder().setCustomId(`apply_reject_${member.id}`).setLabel('رفض').setStyle(ButtonStyle.Danger).setEmoji('✖')
            );

            await logChannel.send({ embeds: [embed], components: [row] });
            return await interaction.editReply({ content: "✅ تم إرسال طلبك بنجاح، سيتم مراجعته من قبل الإدارة قريباً!" });
        }

        // 4. زر قبول المتقدم
        if (interaction.isButton() && customId.startsWith('apply_accept_')) {
            if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: "❌ عذراً، هذه الصلاحية للمسؤولين فقط!", ephemeral: true });
            }

            await interaction.deferUpdate();

            const targetId = customId.replace('apply_accept_', '');
            let targetMember;
            try {
                targetMember = await guild.members.fetch(targetId);
            } catch (e) {
                return interaction.followUp({ content: "❌ العضو غير موجود في السيرفر حالياً!", ephemeral: true });
            }

            const acceptedRoleId = process.env.ACCEPTED_ROLE_ID;
            if (acceptedRoleId) {
                await targetMember.roles.add(acceptedRoleId).catch(() => {});
            }

            const voiceChannelId = process.env.INTERVIEW_VOICE_CHANNEL_ID;
            const voiceChannel = guild.channels.cache.get(voiceChannelId);
            const voiceMention = voiceChannel ? `${voiceChannel}` : 'روم المقابلة';

            await targetMember.send({
                content: `🎉 مبروك! تم قبولك في الطاقم الإداري.\nيرجى التوجه إلى ${voiceMention} لإجراء المقابلة.`
            }).catch(() => {});

            const oldEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(oldEmbed)
                .setColor(0x2ECC71)
                .addFields({ name: '📌 الحالة:', value: `✅ تم القبول بواسطة ${member}`, inline: false });

            await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
        }

        // 5. زر رفض المتقدم (فتح مودال سبب الرفض)
        if (interaction.isButton() && customId.startsWith('apply_reject_')) {
            if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: "❌ عذراً، هذه الصلاحية للمسؤولين فقط!", ephemeral: true });
            }

            const targetId = customId.replace('apply_reject_', '');
            const modal = new ModalBuilder()
                .setCustomId(`apply_modal_reject_${targetId}`)
                .setTitle('سبب رفض التقديم');

            const reasonInput = new TextInputBuilder()
                .setCustomId('apply_reject_reason_text')
                .setLabel('اكتب سبب الرفض (سيتم إرساله بالخاص)')
                .setPlaceholder('السبب...')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
            return await interaction.showModal(modal);
        }

        // 6. تنفيذ الرفض وتحديث الرسالة بدلاً من حذفها
        if (interaction.isModalSubmit() && customId.startsWith('apply_modal_reject_')) {
            await interaction.deferReply({ ephemeral: true });

            const targetId = customId.replace('apply_modal_reject_', '');
            const reason = interaction.fields.getTextInputValue('apply_reject_reason_text');

            let targetMember;
            try {
                targetMember = await guild.members.fetch(targetId);
            } catch (e) {
                return interaction.editReply({ content: "❌ العضو غير موجود في السيرفر!" });
            }

            const rejectedRoleId = process.env.REJECTED_ROLE_ID;
            if (rejectedRoleId) {
                await targetMember.roles.add(rejectedRoleId).catch(() => {});
            }

            await targetMember.send({
                content: `❌ نأسف لإبلاغك بأنه تم رفض طلب انضمامك للإدارة.\n**السبب:** ${reason}`
            }).catch(() => {});

            // تحديث رسالة التقديم الأصلية في الـ Log لتضل موجودة مع الـ Embed واسم الإداري والسبب
            try {
                const message = interaction.message;
                if (message) {
                    const oldEmbed = message.embeds[0];
                    const updatedEmbed = EmbedBuilder.from(oldEmbed)
                        .setColor(0xE74C3C)
                        .addFields(
                            { name: '📌 الحالة:', value: `❌ تم الرفض بواسطة ${member}`, inline: false },
                            { name: '📝 سبب الرفض:', value: reason, inline: false }
                        );

                    await message.edit({ embeds: [updatedEmbed], components: [] });
                }
            } catch (err) {
                console.error("خطأ أثناء تحديث رسالة الرفض:", err);
            }

            return interaction.editReply({ content: `✅ تم رفض العضو وإرسال السبب بالخاص وتحديث الرسالة بنجاح.` });
        }
    }
};