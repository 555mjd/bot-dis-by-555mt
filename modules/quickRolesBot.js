const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    EmbedBuilder, 
    PermissionsBitField 
} = require('discord.js');

// ربط كل زر بالمتغير الخاص به في ملف الـ .env
const ROLE_MAP = {
    'btn_req_role_member': { envKey: 'ROLE_MEMBER_ID', defaultName: 'Member' },
    'btn_req_role_banned': { envKey: 'ROLE_BANNED_ID', defaultName: 'Banned' },
    'btn_req_role_winner': { envKey: 'ROLE_WINNER_ID', defaultName: 'Event Winner' }
};

module.exports = {
    async handleInteraction(interaction) {
        // 1. عند الضغط على أحد أزرار الرتب الثلاثة
        if (interaction.isButton() && ROLE_MAP[interaction.customId]) {
            const roleConfig = ROLE_MAP[interaction.customId];

            const modal = new ModalBuilder()
                .setCustomId(`modal_give_${interaction.customId}`)
                .setTitle(`إدارة رتبة ${roleConfig.defaultName}`);

            const userIdInput = new TextInputBuilder()
                .setCustomId('req_user_id')
                .setLabel('ID العضو المستهدف')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('ضع ID العضو هنا...')
                .setRequired(true);

            // إضافة حقل ID العضو فقط
            modal.addComponents(
                new ActionRowBuilder().addComponents(userIdInput)
            );

            return await interaction.showModal(modal);
        }

        // 2. معالجة إرسال الـ Modal
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_give_btn_req_role_')) {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && 
                !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return await interaction.reply({ 
                    content: '❌ لا تمتلك صلاحية إدارة الرتب.', 
                    ephemeral: true 
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const buttonCustomId = interaction.customId.replace('modal_give_', '');
            const roleConfig = ROLE_MAP[buttonCustomId];
            const targetRoleId = process.env[roleConfig.envKey];

            if (!targetRoleId) {
                return await interaction.editReply({ 
                    content: `❌ لم يتم تحديد ID الرتبة في ملف .env للمتغير (\`${roleConfig.envKey}\`).` 
                });
            }

            const targetUserId = interaction.fields.getTextInputValue('req_user_id').trim();

            const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
            if (!targetMember) {
                return await interaction.editReply({ 
                    content: '❌ تعذر العثور على العضو! تأكد من صحة الـ ID.' 
                });
            }

            const targetRole = interaction.guild.roles.cache.get(targetRoleId);
            if (!targetRole) {
                return await interaction.editReply({ 
                    content: '❌ تعذر العثور على الرتبة في السيرفر! تحقق من الـ ID داخل ملف .env.' 
                });
            }

            const botMember = interaction.guild.members.me;
            if (targetRole.position >= botMember.roles.highest.position) {
                return await interaction.editReply({ 
                    content: '❌ لا يمكن للبوت التحكم بهذه الرتبة لأنها أعلى من رتبة البوت.' 
                });
            }

            const hasRole = targetMember.roles.cache.has(targetRole.id);
            let actionText = '';
            let logColor = '';

            try {
                if (hasRole) {
                    await targetMember.roles.remove(targetRole, `سحب بواسطة: ${interaction.user.tag}`);
                    actionText = 'سحب';
                    logColor = '#E74C3C';
                } else {
                    await targetMember.roles.add(targetRole, `إضافة بواسطة: ${interaction.user.tag}`);
                    actionText = 'إضافة';
                    logColor = '#2ECC71';
                }
            } catch (err) {
                console.error('خطأ في تعديل الرتبة:', err);
                return await interaction.editReply({ 
                    content: '❌ حدث خطأ أثناء تنفيذ الإجراء.' 
                });
            }

            // الرد بـ منشن العضو والرتبة فقط
            await interaction.editReply({ 
                content: `✅ تم **${actionText}** الرتبة ${targetRole} بنجاح ${hasRole ? 'من' : 'لـ'} العضو ${targetMember}` 
            });

            const logChannelId = process.env.STAFF_REQ_LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle(`📜 سجل ${actionText} رتبة (Role Log)`)
                        .setColor(logColor)
                        .addFields(
                            { name: '👤 المنفذ:', value: `${interaction.user}`, inline: true },
                            { name: '🎯 المستهدف:', value: `${targetMember}`, inline: true },
                            { name: '🎖️ الرتبة:', value: `${targetRole}`, inline: true },
                            { name: '⚙️ الإجراء:', value: `\`${actionText} رتبة\``, inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

                    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
                }
            }
        }
    }
};