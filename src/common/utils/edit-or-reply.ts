import { Context, InlineKeyboard } from "grammy";

export async function editOrReply(
  ctx: Context,
  text: string,
  keyboard?: InlineKeyboard,
) {
  try {
    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
      return;
    }

    if (ctx.message) {
      await ctx.deleteMessage().catch(() => {});

      await ctx.reply(text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });

      return;
    }
  } catch {}

  await ctx.reply(text, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}