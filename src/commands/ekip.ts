import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import type { Command } from "@/types";
import { t } from "@/localization/i18n";
import { baseEmbed, errorEmbed, successEmbed } from "@/utils/embeds";
import { prisma } from "@/database/prisma";
import { userRepository } from "@/repositories/UserRepository";
import { CrewRank } from "@prisma/client";
import { checkAndNotifyAchievements } from "@/components/shared/notifyAchievements";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ekip")
    .setDescription("Manage your crew / Ekibini yönet")
    .addSubcommand((sub) =>
      sub.setName("olustur").setDescription("Create a crew / Ekip oluştur").addStringOption((o) => o.setName("isim").setDescription("Crew name / Ekip adı").setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName("hizli-olustur").setDescription("Create a crew via a form / Formla ekip oluştur"))
    .addSubcommand((sub) =>
      sub.setName("davet").setDescription("Invite a player / Oyuncu davet et").addUserOption((o) => o.setName("kullanici").setDescription("Player / Oyuncu").setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName("ayril").setDescription("Leave your crew / Ekipten ayrıl"))
    .addSubcommand((sub) =>
      sub.setName("at").setDescription("Kick a member / Üyeyi at").addUserOption((o) => o.setName("kullanici").setDescription("Member / Üye").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("yukselt")
        .setDescription("Promote a member / Üyeyi yükselt")
        .addUserOption((o) => o.setName("kullanici").setDescription("Member / Üye").setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName("bilgi").setDescription("Crew info / Ekip bilgisi"))
    .addSubcommand((sub) => sub.setName("uyeler").setDescription("Crew members / Ekip üyeleri")),

  async execute(interaction, ctx) {
    const lang = ctx.language;
    const sub = interaction.options.getSubcommand(true);
    const guildId = interaction.guildId!;

    const myMembership = await prisma.crewMember.findUnique({ where: { userId: ctx.dbUser.id }, include: { crew: true } });

    if (sub === "hizli-olustur") {
      if (myMembership) {
        await interaction.reply({ embeds: [errorEmbed(t("crew.create_already_in_crew", lang))], ephemeral: true });
        return;
      }

      const modal = new ModalBuilder().setCustomId(`ekip:olusturmodal:${interaction.user.id}`).setTitle("👥 Ekip Oluştur");
      const nameInput = new TextInputBuilder()
        .setCustomId("ekip_adi")
        .setLabel("Ekip Adı / Crew Name")
        .setStyle(TextInputStyle.Short)
        .setMinLength(3)
        .setMaxLength(32)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput));
      await interaction.showModal(modal);
      return;
    }

    if (sub === "olustur") {
      if (myMembership) {
        await interaction.reply({ embeds: [errorEmbed(t("crew.create_already_in_crew", lang))], ephemeral: true });
        return;
      }
      const name = interaction.options.getString("isim", true);
      const nameTaken = await prisma.crew.findUnique({ where: { guildId_name: { guildId, name } } });
      if (nameTaken) {
        await interaction.reply({ embeds: [errorEmbed(t("crew.create_name_taken", lang))], ephemeral: true });
        return;
      }

      await prisma.crew.create({
        data: { guildId, name, members: { create: { userId: ctx.dbUser.id, rank: CrewRank.KURUCU } } },
      });

      await interaction.reply({ embeds: [successEmbed(t("crew.create_success", lang, { name }))] });
      await checkAndNotifyAchievements(interaction, ctx.dbUser.id, interaction.user.username, lang, ctx.dbUser.notifications);
      return;
    }

    if (sub === "davet") {
      if (!myMembership) {
        await interaction.reply({ embeds: [errorEmbed(t("crew.not_in_crew", lang))], ephemeral: true });
        return;
      }
      const targetUser = interaction.options.getUser("kullanici", true);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`ekip:kabul:${myMembership.crewId}:${targetUser.id}`).setLabel(t("crew.invite_accept", lang)).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ekip:reddet:${myMembership.crewId}:${targetUser.id}`).setLabel(t("crew.invite_decline", lang)).setStyle(ButtonStyle.Danger),
      );
      await interaction.reply({
        content: `<@${targetUser.id}>`,
        embeds: [
          baseEmbed()
            .setTitle(t("crew.invite_received_title", lang))
            .setDescription(t("crew.invite_received_description", lang, { crew: myMembership.crew.name })),
        ],
        components: [row],
      });
      await interaction.followUp({ embeds: [successEmbed(t("crew.invite_success", lang, { user: targetUser.username }))], ephemeral: true });
      return;
    }

    if (sub === "ayril") {
      if (!myMembership) {
        await interaction.reply({ embeds: [errorEmbed(t("crew.not_in_crew", lang))], ephemeral: true });
        return;
      }
      if (myMembership.rank === CrewRank.KURUCU) {
        await interaction.reply({ embeds: [errorEmbed(t("crew.leave_founder_warning", lang))], ephemeral: true });
        return;
      }
      await prisma.crewMember.delete({ where: { id: myMembership.id } });
      await interaction.reply({ embeds: [successEmbed(t("crew.leave_success", lang))] });
      return;
    }

    if (sub === "at" || sub === "yukselt") {
      if (!myMembership || (myMembership.rank !== CrewRank.KURUCU && myMembership.rank !== CrewRank.LIDER)) {
        await interaction.reply({ embeds: [errorEmbed(t("crew.no_permission", lang))], ephemeral: true });
        return;
      }
      const targetDiscordUser = interaction.options.getUser("kullanici", true);
      const targetDbUser = await userRepository.findOrCreate(targetDiscordUser.id, guildId);
      const targetMembership = await prisma.crewMember.findUnique({ where: { userId: targetDbUser.id } });

      if (!targetMembership || targetMembership.crewId !== myMembership.crewId) {
        await interaction.reply({ embeds: [errorEmbed(t("crew.not_in_crew", lang))], ephemeral: true });
        return;
      }

      if (sub === "at") {
        await prisma.crewMember.delete({ where: { id: targetMembership.id } });
        await interaction.reply({ embeds: [successEmbed(t("crew.kick_success", lang, { user: targetDiscordUser.username }))] });
      } else {
        const nextRank = targetMembership.rank === CrewRank.UYE ? CrewRank.YETKILI : CrewRank.LIDER;
        await prisma.crewMember.update({ where: { id: targetMembership.id }, data: { rank: nextRank } });
        await interaction.reply({
          embeds: [successEmbed(t("crew.promote_success", lang, { user: targetDiscordUser.username, rank: t(`crew.rank_${nextRank.toLowerCase()}`, lang) }))],
        });
      }
      return;
    }

    if (sub === "bilgi") {
      if (!myMembership) {
        await interaction.reply({ embeds: [errorEmbed(t("crew.not_in_crew", lang))], ephemeral: true });
        return;
      }
      const memberCount = await prisma.crewMember.count({ where: { crewId: myMembership.crewId } });
      const embed = baseEmbed()
        .setTitle(t("crew.info_title", lang, { name: myMembership.crew.name }))
        .addFields(
          { name: t("crew.member_count", lang), value: `${memberCount}`, inline: true },
          { name: t("crew.created_at", lang), value: `<t:${Math.floor(myMembership.crew.createdAt.getTime() / 1000)}:D>`, inline: true },
        );
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "uyeler") {
      if (!myMembership) {
        await interaction.reply({ embeds: [errorEmbed(t("crew.not_in_crew", lang))], ephemeral: true });
        return;
      }
      const members = await prisma.crewMember.findMany({ where: { crewId: myMembership.crewId }, include: { user: true } });
      const embed = baseEmbed().setTitle(t("crew.members_title", lang, { name: myMembership.crew.name }));
      for (const m of members) {
        embed.addFields({ name: `<@${m.user.discordId}>`, value: t(`crew.rank_${m.rank.toLowerCase()}`, lang), inline: true });
      }
      await interaction.reply({ embeds: [embed] });
    }
  },
};

export default command;
