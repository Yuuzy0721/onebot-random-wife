import { Context, Schema, h } from 'koishi'
import { } from 'koishi-plugin-adapter-onebot'

export const name = 'onebot-random-wife'

export const injest = {}

export interface Config {
    debugMode: boolean
    Plan: 'A' | 'B' | 'C'
}

export const Config: Schema<Config> = Schema.object({
    debugMode: Schema.boolean().default(false).hidden(),
    Plan: Schema.union([
        Schema.const('A').description('方案1，若无法使用请更换其他方案（不推荐）'),
        Schema.const('B').description('方案2，将消息分开发送'),
        Schema.const('C').description('方案3，不at'),
      ]).role('radio').default('B')
})

export function apply(ctx: Context, cfg: Config) {
    const logger = ctx.logger('onebot-random-wife')
    ctx.command('wife', '随机群老婆').action(async ({ session }) => {
        if (session.onebot) {
            if (session.subtype === 'group') {
                // 获取各种信息
                let groupid = session.channelId       // 群号
                let members = await session.onebot.getGroupMemberList(groupid)        // 成员
            
                do{
                    //  随机成员
                    var randomIndex = Math.floor(Math.random() * members.length)
                    var wife = members[randomIndex]
                }while (wife.user_id.toString() === session.userId)
                let userId = wife.user_id
                let userIdStr = userId.toString()

                // 获取头像
                let touxiang = `https://q1.qlogo.cn/g?b=qq&nk=${userIdStr}&s=640`

                if (cfg.debugMode === true) {
                    logger.info(members[randomIndex])
                    logger.info(userIdStr)
                    logger.info(touxiang)
                }
                
                // 发送消息
                if (cfg.Plan == 'A') {
                    await session.send([
                        h('at', {id: session.userId}),
                        h.text(" 你的老婆是："),
                        h('at', {id: userIdStr}),
                        h('image',{ url: touxiang })
                    ].join(''))
                }else if (cfg.Plan == 'B') {
                    await session.send(h('at', {id: session.userId}))
                    await session.send('你的老婆是：')
                    await session.send(h('at', {id: userIdStr}))
                    await session.send(h('image',{ url: touxiang }))
                }else if (cfg.Plan == 'C') {
                    await session.send([
                        '你的老婆是：',
                        h('iamge', { url: touxiang})
                    ].join(''))
                }else {
                    // 防小人
                    await session.send(h('at', {id: session.userId}))
                    await session.send('你的老婆是：')
                    await session.send(h('at', {id: userIdStr}))
                    await session.send(h('image',{ url: touxiang }))
                }
            }else {
                await session.send('请在群聊内使用！')
            }
        }else {
            await session.send('仅支持 OneBot 平台！')
        }
        
    })
}