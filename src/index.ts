import { Context, Schema, h } from 'koishi'
import { } from 'koishi-plugin-cron'
import { } from 'koishi-plugin-adapter-onebot'

export const name = 'onebot-random-wife'

export const usage = `# 请自行为wife.rm指令添加权限限制`

export const inject = {
    required: ['database', 'cron']
}

export interface Config {
    Plan: 'A' | 'B'
    database: boolean
    DelTime?: any
    init: boolean
}

export const Config: Schema<Config> = Schema.intersect([
    Schema.object({
      Plan: Schema.union([
          Schema.const('A').description('方案1，发送混合消息'),
          Schema.const('B').description('方案2，将消息分开发送'),
      ]).role('radio').default('A').deprecated().disabled(),
    }).description('基础配置'),
    Schema.object({
        database: Schema.boolean().default(false).description('是否启用数据库限制每日只能获取一个老婆').experimental(),
        DelTime: Schema.string().default('00:00').description('每日重置数据库时间（这条配置项只是给你看的，修改它并不会有任何影响）').disabled(),
        init: Schema.boolean().default(true).description('是否在启用（重载）插件时清空数据库'),
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
}

export async function apply(ctx: Context, cfg: Config) {
    const logger = ctx.logger('onebot-random-wife')
    // 还能优化，但是能跑就行^^

    // 注册数据库
    ctx.model.extend('yuuzy_wife', {
        id: 'unsigned',
        userId: 'string',
        groupId: 'string',
        wife: 'string'
    }, {
        primary: 'id',
        autoInc: true
    })

    // 初始化数据库
    if (cfg.init) {
        logger.info('正在清空数据库...')
        await ctx.database.remove('yuuzy_wife', {})
        logger.info('数据库清空完成！')
    }

    ctx.command('wife', '随机群老婆')
    .option('noat', '-n 不at对方')
    .action(async ({ session, options }) => {
        if (session.onebot) {
            if (session.subtype === 'group') {
                // 获取各种信息
                let groupId = session.channelId       // 群号
                let members = await session.onebot.getGroupMemberList(groupId)        // 成员
            
                do{
                    //  随机成员
                    var randomIndex = Math.floor(Math.random() * members.length)
                    var wife = members[randomIndex]
                }while (wife.user_id.toString() === session.userId)
                let wifeId = wife.user_id.toString()

                // 获取头像
                let touxiang = `https://q1.qlogo.cn/g?b=qq&nk=${wifeId}&s=640`

                // debug
                // logger.info(await ctx.database.get('yuuzy_wife', {userId: session.userId, groupId: groupId}))

                if (!cfg.database) {
                    // 直接发送消息
                    if (options.noat) {
                        await session.send([
                            h('at', {id: session.userId}),
                            h.text(" 你的老婆是："),
                            h('image',{ src: touxiang, caches: true })
                        ])
                    }else {
                        await session.send([
                            h('at', {id: session.userId}),
                            h.text(" 你的老婆是："),
                            h('at', {id: wifeId}),
                            h('image',{ src: touxiang, caches: true })
                        ])
                    } 
                }else if (cfg.database) {       // 意义不明
                    let get = await ctx.database.get('yuuzy_wife', {userId: session.userId, groupId: groupId})
                    if (get.length > 0) {
                        wifeId = get[0].wife
                        touxiang = `https://q1.qlogo.cn/g?b=qq&nk=${wifeId}&s=640`
                        if (options.noat) {
                            await session.send([
                                h('at', {id: session.userId}),
                                h.text(" 你今天已经获取过老婆了！\n你的老婆是："),
                                h('image',{ src: touxiang, caches: true })
                            ])
                        }else {
                            await session.send([
                                h('at', {id: session.userId}),
                               h.text(" 你今天已经获取过老婆了！\n你的老婆是："),
                                h('at', {id: wifeId}),
                                h('image',{ src: touxiang, caches: true })
                            ])
                        }
                    }else {
                        // 插入数据库
                        await ctx.database.create('yuuzy_wife', {userId: session.userId, groupId: groupId, wife: wifeId})
                        if (options.noat) {
                            await session.send([
                                h('at', {id: session.userId}),
                                h.text(" 你今天的老婆是："),
                                h('image',{ src: touxiang, caches: true })
                            ])
                        }else {
                            await session.send([
                                h('at', {id: session.userId}),
                                h.text(" 你今天的老婆是："),
                                h('at', {id: wifeId}),
                                h('image',{ src: touxiang, caches: true })
                            ])
                        }
                    }
                }
            }else {
                await session.send('请在群聊内使用！')
            }
        }else {
            await session.send('仅支持 OneBot 平台！')
        }  
    })
    ctx.command('wife.rm', '清除数据库').action(async ({session}) => {
        if (cfg.database) {
            await ctx.database.remove('yuuzy_wife', {})
            await session.send('数据库已清空。')
        }else {
            await session.send('数据库未启用。')
        }
    })

    // 定时清空数据库
    ctx.cron('0 0 * * *', async () => {
        logger.info('正在执行定时清空数据库...')
        await ctx.database.remove('yuuzy_wife', {})
        logger.info('数据库清空完成！')
    })
}