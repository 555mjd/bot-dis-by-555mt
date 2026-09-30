const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');

// 🔴 أيدي رتبة الباند النهائي المعتمدة
const BAN_ROLE_ID = '1068839434608463966'; 

module.exports = {
    handleMessage: async (message) => {
        if (message.author.bot) return;

        // أمر إرسال لوحة الباندات للإدارة
        if (message.content === '!banpanel') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply({ content: '❌ هذا الأمر خاص بالإدارة العليا فقط.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🚨 ⟪ نظام الباند والعقوبات ⟫ 🚨')
                .setDescription('# ⚠️️ يجب وجود الأدلة والمعلومات المطلوبة لتجنب المحاسبة.\n\nلتسهيل عملية إصدار العقوبات وتوثيق البيانات بدقة واحترافية، يرجى استخدام الأزرار بالأسفل حسب نوع العقوبة.')
                .addFields(
                    { 
                        name: '📌 ⟪ تعليمات استخدام النظام والإصدار ⟫', 
                        value: '**1 ⟠ زر "إصدار باند جديد": للباند المؤقت (مع المدة والسبب - بدون رتبة).**\n\n**2 ⟠ زر "Perm Banned": للباند النهائي (بدون مدة + مع السبب + يعطي رتبة الباند تلقائياً).**', 
                        inline: false 
                    }
                )
                .setFooter({ text: 'Dev By @555mt' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('open_ban_modal')
                    .setLabel('🚨 إصدار باند جديد')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('open_perm_modal')
                    .setLabel('⛔ Perm Banned')
                    .setStyle(ButtonStyle.Danger)
            );

            await message.delete().catch(() => {});
            await message.channel.send({ embeds: [embed], components: [row] });
        }
    },

    handleInteraction: async (interaction) => {
        // 1. زر الباند المؤقت
        if (interaction.isButton() && interaction.customId === 'open_ban_modal') {
            const modal = new ModalBuilder()
                .setCustomId('ban_modal_process')
                .setTitle('لوحة إصدار باند مؤقت');

            const targetInput = new TextInputBuilder()
                .setCustomId('ban_target_id')
                .setLabel('Discord ID')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('مثال: 123456789012345678')
                .setRequired(true);

            const playerInfoInput = new TextInputBuilder()
                .setCustomId('ban_player_info')
                .setLabel('معلومات ومعرفات اللاعب')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('الصق معلومات الـ Steam, License, Discord هنا...')
                .setRequired(true);

            const banCodeInput = new TextInputBuilder()
                .setCustomId('ban_code')
                .setLabel('كود الباند')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('مثال: BAN-9921')
                .setRequired(true);

            const proofInput = new TextInputBuilder()
                .setCustomId('ban_proof')
                .setLabel('رابط الدليل (صورة أو فيديو)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('انسخ رابط الصورة أو المقطع هنا')
                .setRequired(false);

            const durationInput = new TextInputBuilder()
                .setCustomId('ban_duration')
                .setLabel('مدة الباند والسبب')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('المدة (مثال: 7 أيام) + السبب بالتفصيل...')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(targetInput),
                new ActionRowBuilder().addComponents(playerInfoInput),
                new ActionRowBuilder().addComponents(banCodeInput),
                new ActionRowBuilder().addComponents(proofInput),
                new ActionRowBuilder().addComponents(durationInput)
            );

            return await interaction.showModal(modal);
        }

        // 2. زر الباند النهائي (Perm Banned)
        if (interaction.isButton() && interaction.customId === 'open_perm_modal') {
            const modal = new ModalBuilder()
                .setCustomId('perm_modal_process')
                .setTitle('لوحة إصدار باند نهائي (Perm)');

            const targetInput = new TextInputBuilder()
                .setCustomId('ban_target_id')
                .setLabel('Discord ID')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('مثال: 123456789012345678')
                .setRequired(true);

            const playerInfoInput = new TextInputBuilder()
                .setCustomId('ban_player_info')
                .setLabel('معلومات ومعرفات اللاعب')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('الصق معلومات الـ Steam, License, Discord هنا...')
                .setRequired(true);

            const banCodeInput = new TextInputBuilder()
                .setCustomId('ban_code')
                .setLabel('كود الباند')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('مثال: BAN-9921')
                .setRequired(true);

            const proofInput = new TextInputBuilder()
                .setCustomId('ban_proof')
                .setLabel('رابط الدليل (صورة أو فيديو)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('انسخ رابط الصورة أو المقطع هنا')
                .setRequired(false);

            const reasonInput = new TextInputBuilder()
                .setCustomId('ban_reason')
                .setLabel('سبب الباند النهائي بالتفصيل')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('اكتب سبب العقوبة هنا...')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(targetInput),
                new ActionRowBuilder().addComponents(playerInfoInput),
                new ActionRowBuilder().addComponents(banCodeInput),
                new ActionRowBuilder().addComponents(proofInput),
                new ActionRowBuilder().addComponents(reasonInput)
            );

            return await interaction.showModal(modal);
        }

        // معالجة نموذج الباند المؤقت
        if (interaction.isModalSubmit() && interaction.customId === 'ban_modal_process') {
            await interaction.deferReply({ ephemeral: false });

            const targetInputVal = interaction.fields.getTextInputValue('ban_target_id').trim();
            const playerInfo = interaction.fields.getTextInputValue('ban_player_info');
            const banCode = interaction.fields.getTextInputValue('ban_code');
            const proof = interaction.fields.getTextInputValue('ban_proof');
            const fullDetails = interaction.fields.getTextInputValue('ban_duration');
            const staffMember = interaction.user;

            const cleanIdMatch = targetInputVal.match(/\d+/);
            const targetId = cleanIdMatch ? cleanIdMatch[0] : null;
            const targetMention = targetId ? `<@${targetId}>` : targetInputVal;

            const resultEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⏳ ⟪ سجل عقوبة باند مؤقت ⟫ ⏳')
                .setDescription(`### 🏷️ كود الباند الأساسي: \`${banCode}\`\n━━━━━━━━━━━━━━━━━━━━━━━\n**تم توثيق تقرير العقوبة المؤقتة بنجاح.**`)
                .addFields(
                    { name: '👤 ⟪ المشرف المسؤول ⟫', value: `> ${staffMember}\n`, inline: false },
                    { name: '🎯 ⟪ الشخص المخالف (Discord ID) ⟫', value: `> ${targetMention}\n`, inline: false },
                    { name: '🎮 ⟪ معلومات ومعرفات اللاعب ⟫', value: `\`\`\`yaml\n${playerInfo}\`\`\``, inline: false },
                    { name: '📝 ⟪ مدة الباند والسبب بالتفصيل ⟫', value: `\`\`\`fix\n${fullDetails}\`\`\``, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Dev By @555mt' });

            if (proof && (proof.startsWith('http://') || proof.startsWith('https://'))) {
                if (proof.match(/\.(jpeg|jpg|gif|png|webp)$/i) || proof.includes('cdn.discordapp.com') || proof.includes('media.discordapp.net')) {
                    resultEmbed.setImage(proof);
                } else {
                    resultEmbed.addFields({ name: '🎬 ⟪ دليل الإثبات المرفق ⟫', value: `> [اضغط هنا لمشاهدة المقطع / الدليل](${proof})\n`, inline: false });
                }
            }

            return await interaction.editReply({ embeds: [resultEmbed] });
        }

        // معالجة نموذج الباند النهائي
        if (interaction.isModalSubmit() && interaction.customId === 'perm_modal_process') {
            await interaction.deferReply({ ephemeral: false });

            const targetInputVal = interaction.fields.getTextInputValue('ban_target_id').trim();
            const playerInfo = interaction.fields.getTextInputValue('ban_player_info');
            const banCode = interaction.fields.getTextInputValue('ban_code');
            const proof = interaction.fields.getTextInputValue('ban_proof');
            const reason = interaction.fields.getTextInputValue('ban_reason');
            const staffMember = interaction.user;

            const cleanIdMatch = targetInputVal.match(/\d+/);
            const targetId = cleanIdMatch ? cleanIdMatch[0] : null;
            const targetMention = targetId ? `<@${targetId}>` : targetInputVal;

            let roleStatusText = '❌ لم يتم منح رتبة الباند (العضو غير موجود بالسيرفر أو الخطأ بالآيدي)';

            if (targetId) {
                try {
                    const guild = interaction.guild;
                    const member = await guild.members.fetch(targetId).catch(() => null);
                    
                    if (member) {
                        await member.roles.add(BAN_ROLE_ID, `باند نهائي Perm - كود: ${banCode} بواسطة ${staffMember.tag}`);
                        roleStatusText = `✅ تم منح رتبة الباند النهائي بنجاح للعضو <@${targetId}>`;
                    } else {
                        roleStatusText = '⚠️ العضو غير موجود في السيرفر حالياً (لم يتم إعطاء الرتبة)';
                    }
                } catch (error) {
                    console.error('خطأ في إعطاء رتبة الباند النهائي:', error.message);
                    roleStatusText = '⚠️️ تعذر إعطاء رتبة الباند (تأكد من صلاحيات البوت ورتبته وأنها أعلى من رتبة الباند)';
                }
            }

            const resultEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⛔ ⟪ سجل عقوبة باند نهائي (Perm Banned) ⟫ ⛔')
                .setDescription(`### 🏷️ كود الباند الأساسي: \`${banCode}\`\n━━━━━━━━━━━━━━━━━━━━━━━\n**تم توثيق وتطبيق الباند النهائي بنجاح.**\n> ${roleStatusText}`)
                .addFields(
                    { name: '👤 ⟪ المشرف المسؤول ⟫', value: `> ${staffMember}\n`, inline: false },
                    { name: '🎯 ⟪ الشخص المخالف (Discord ID) ⟫', value: `> ${targetMention}\n`, inline: false },
                    { name: '⏳ ⟪ مدة العقوبة ⟫', value: `> \`نهائي (Permanent)\`\n`, inline: false },
                    { name: '🎮 ⟪ معلومات ومعرفات اللاعب ⟫', value: `\`\`\`yaml\n${playerInfo}\`\`\``, inline: false },
                    { name: '📝 ⟪ سبب الباند بالتفصيل ⟫', value: `\`\`\`fix\n${reason}\`\`\``, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Dev By @555mt' });

            if (proof && (proof.startsWith('http://') || proof.startsWith('https://'))) {
                if (proof.match(/\.(jpeg|jpg|gif|png|webp)$/i) || proof.includes('cdn.discordapp.com') || proof.includes('media.discordapp.net')) {
                    resultEmbed.setImage(proof);
                } else {
                    resultEmbed.addFields({ name: '🎬 ⟪ دليل الإثبات المرفق ⟫', value: `> [اضغط هنا لمشاهدة المقطع / الدليل](${proof})\n`, inline: false });
                }
            }

            return await interaction.editReply({ embeds: [resultEmbed] });
        }
    }
};