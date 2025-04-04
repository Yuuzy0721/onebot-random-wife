import { Context, Schema, h } from 'koishi'
import { } from 'koishi-plugin-adapter-onebot'

export const name = 'onebot-random-wife'

export const inject = {
    required: ['database']
}

export interface Config {
    debugMode: boolean
    Plan: 'A' | 'B'
    database: boolean
    DelTime?: any
}

export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
       debugMode: Schema.boolean().default(false).hidden(),
      Plan: Schema.union([
          Schema.const('A').description('方案1，发送混合消息'),
          Schema.const('B').description('方案2，将消息分开发送'),
      ]).role('radio').default('B')
    }).description('基础配置'),
    Schema.object({
        database: Schema.boolean().default(false).description('是否启用数据库限制每日只能获取一个老婆').experimental(),
        DelTime: Schema.string().default('00:00').description('每日重置时间').disabled()
    }).description('数据库配置'),
])

declare module 'koishi' {
    interface Tables {
        yuuzy_wife: YuuzyWife
    }
}

export interface YuuzyWife {
    id: number
    userId: string
    groupId: string
    wife: string
    TouXiang: string
}

export async function apply(ctx: Context, cfg: Config) {
    // 注册数据库
    ctx.model.extend('yuuzy_wife', {
        id: 'unsigned',
        userId: 'string',
        groupId: 'string',
        wife: 'string',
        TouXiang: 'string'
    }, {
        primary: 'id',
        autoInc: true
    })

    // 初始化数据库
    await ctx.database.remove('yuuzy_wife', {})

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
                        h('image',{ src: touxiang, caches: true })
                    ])
                }else if (cfg.Plan == 'B') {
                    await session.send(h('at', {id: session.userId}))
                    await session.send('你的老婆是：')
                    await session.send(h('at', {id: userIdStr}))
                    await session.send(h('image',{ src: touxiang, caches: true }))
                }else {
                    // 防小人
                    await session.send(h('at', {id: session.userId}))
                    await session.send('你的老婆是：')
                    await session.send(h('at', {id: userIdStr}))
                    await session.send(h('image',{ url: touxiang, caches: true }))
                }
            }else {
                await session.send('请在群聊内使用！')
            }
        }else {
            await session.send('仅支持 OneBot 平台！')
        }
        
    })
}