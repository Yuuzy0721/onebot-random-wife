import { Context, Schema, Logger, h } from 'koishi'
import { } from '@koishijs/cache'
import { } from 'koishi-plugin-adapter-onebot'

export const name = 'onebot-random-wife'

export const injest = {
  required: ['database']
}

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  const logger = new Logger('onebot-random-wife')
  ctx.command('waif', '随机群老婆').action(async ({ session }) => {
    if (!session?.onebot || session.subtype !== 'group') {
      return session?.send(session?.subtype === 'group' ? '仅支持 OneBot 平台！' : '请在群聊内使用！')
    }

    const groupId = session.channelId

    try {
      const members = await session.onebot.getGroupMemberList(groupId)
      const randomIndex = Math.floor(Math.random() * members.length)
      const { user_id: userId } = members[randomIndex]
      const userIdStr = userId.toString()

      const imageUrl = `http://q.qlogo.cn/headimg_dl?dst_uin=${userIdStr}&spec=640`

      await session.send([
        h('at', { id: session.userId }),
        h.text('你的老婆是\n'),
        h('at', { id: userIdStr }),
        h.image(imageUrl, { cache: 0 }), // 强制禁用缓存
      ])
    } catch (error) {
      logger.error('指令执行失败:', error)
      await session?.send('获取老婆失败，请稍后再试~')
    }
  })
}