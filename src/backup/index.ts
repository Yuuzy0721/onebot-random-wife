import { Context, Schema, Logger, h } from 'koishi'
import { } from 'koishi-plugin-adapter-onebot'

export const name = 'onebot-random-wife'

export const injest = {}

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  const logger = new Logger('onebot-random-wife')
  ctx.command('wife', '随机群老婆').action(async ({ session }) => {
    if (!session?.onebot || session.subtype !== 'group') {
      return session?.send(session?.subtype === 'group' ? '仅支持 OneBot 平台！' : '请在群聊内使用！')
    }

    const groupId = session.channelId

    try {
      const members = await session.onebot.getGroupMemberList(groupId)
      const randomIndex = Math.floor(Math.random() * members.length)
      const { user_id: userId } = members[randomIndex]
      const userIdStr = userId.toString()

      const imageUrl = `https://q1.qlogo.cn/g?b=qq&nk=${userIdStr}&s=640`

      await session.send([
        h('at', { id: session.userId }),
        '你的老婆是',
        h('at', { id: userIdStr }),
        h.image(imageUrl),
      ])
    } catch (error) {
      logger.error('指令执行失败:', error)
      await session?.send('获取老婆失败，请稍后再试~')
    }
  })
}