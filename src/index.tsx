import { Context, Schema, h } from 'koishi'
import { } from 'koishi-plugin-cron'
import { } from 'koishi-plugin-adapter-onebot'
import { } from 'koishi-plugin-monetary'
import { } from '@koishijs/cache'

export const name = 'onebot-random-wife'

export const usage = `
## [点我查看更新日志](https://forum.koishi.xyz/t/topic/10767/)
`

export const inject = {
  required: ['database'],
  optional: ['cron', 'monetary', 'cache'],
}

export interface Config {
  database: boolean,
  DelTime?: any,
  init: boolean,
  add: number,
  cost: number,
  currency: string,
  divorce: boolean,
  blacklist: string[],
  monetary: boolean,
  propose: boolean,
  costP: number,
  PwaitTime: number,
  rape: boolean,
  costR: number,
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    divorce: Schema.boolean().default(false).description('是否启用离婚功能'),
    blacklist: Schema.array(String).description('黑名单，黑名单内的用户不会作为老婆被抽到（填写QQ号）（默认屏蔽Q群管家）').default(["2854196310"]),
    propose: Schema.boolean().default(false).description('是否启用求婚功能（需要先启用货币系统）').experimental(),
    PwaitTime: Schema.number().default(180000).min(10000).max(36000000).description('求婚等待时间/ms').experimental(),
    rape: Schema.boolean().default(false).description('是否启用强娶功能').experimental()
  }).description('基础配置'),
  Schema.object({
    database: Schema.boolean().default(true).description('是否启用数据库限制每日只能获取一个老婆').disabled().deprecated().hidden(),
    DelTime: Schema.string().default('00:00').description('每日重置数据库时间（这条配置项只是给你看的，修改它并不会有任何影响）').disabled(),
    init: Schema.boolean().default(false).description('是否在启用（重载）插件时清空数据库'),
  }).description('数据库配置'),
  Schema.object({
    monetary: Schema.boolean().default(true).description('是否启用货币系统').experimental(),
    currency: Schema.string().default('default').description('monetary 的 currency 字段'),
    add: Schema.number().default(100).description('增加的货币数量,若为小数将向下取整'),
    cost: Schema.number().default(150).description('离婚需要消耗的货币数量,若为小数将向下取整'),
    costP: Schema.number().default(250).description('求婚需要消耗的货币数量,若为小数将向下取整').experimental(),
    costR: Schema.number().default(300).description('强娶需要消耗的货币数量,若为小数将向下取整').experimental(),
  }).description('货币配置'),
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

declare module '@koishijs/cache' {
  interface Tables {
    YZC: string[]
  }
}

export async function apply(ctx: Context, cfg: Config) {
  const currency = cfg.currency
  const add = Math.floor(cfg.add)
  const cost = Math.floor(cfg.cost)
  const logger = ctx.logger('onebot-random-wife')
  const costR = Math.floor(cfg.costR)
  // 还能优化，但是能跑就行^^
  // 优化不了力QAQ
  // 现在只有上帝看得懂了

  // 注册数据库
  if (ctx.database) {
    ctx.model.extend('yuuzy_wife', {
      id: 'unsigned',
      userId: 'string',
      groupId: 'string',
      wife: 'string'
    }, {
      primary: 'id',
      autoInc: true
    })
  }

  if (cfg.monetary) {
    if (!cfg.database) {
      logger.warn('启用货币系统需要启用数据库！')
      return
    }
    if (!ctx.monetary) {
      logger.warn('启用货币系统需要启用货币插件！')
      return
    }

  }


  // 初始化数据库
  if (cfg.init) {
    if (!cfg.database) {
      logger.warn('数据库未启用，无法清空数据库！')
      return
    }
    logger.info('正在清空数据库...')
    await ctx.database.remove('yuuzy_wife', {})
    logger.info('数据库清空完成！')
  }

  const NoNTR = (async (wife: string, guildId: string) => {
    if (!cfg.database) return false
    const g = await ctx.database.get('yuuzy_wife', { wife: wife, groupId: guildId })
    if (g.length > 0) {
      return true
    } else return false
  })

  ctx.command('wife', '随机群老婆')
    .userFields(['id'])
    .option('noat', '-n 不at对方')
    .action(async ({ session, options }) => {
      if (session.onebot) {
        if (session.guild) {
          const blacklist = new Set(cfg.blacklist)
          // 获取各种信息
          const uid = session.user.id
          let groupId = session.guildId       // 群号
          let members = await session.onebot.getGroupMemberList(groupId)        // 成员

          let i = 0
          do {
            //  随机成员
            var randomIndex = Math.floor(Math.random() * members.length)
            var wife = members[randomIndex]
            i++
            if (i === 10) {
              await session.send('ERROR: 循环次数过多\n请勿将全部群成员加入黑名单!\n也有可能是群成员过少，快拐点回来吧（划去）')
              return
            }
          } while ( wife.user_id.toString() === session.userId || blacklist.has(wife.user_id.toString()) || await NoNTR(wife.user_id.toString(), groupId) )
          let wifeId = wife.user_id.toString()

          // 获取头像
          let touxiang = `https://q1.qlogo.cn/g?b=qq&nk=${wifeId}&s=640`

          // debug
          // logger.info(await ctx.database.get('yuuzy_wife', {userId: session.userId, groupId: groupId}))

          if (!cfg.database) {
            // 直接发送消息
            if (options.noat) {
              await session.send([
                h('at', { id: session.userId }),
                h.text(" 你的老婆是："),
                h('image', { src: touxiang, caches: true })
              ])
            } else {
              await session.send([
                h('at', { id: session.userId }),
                h.text(" 你的老婆是："),
                h('at', { id: wifeId }),
                h('image', { src: touxiang, caches: true })
              ])
            }
          } else {
            let get = await ctx.database.get('yuuzy_wife', { userId: session.userId, groupId: groupId })
            if (get.length > 0) {
              wifeId = get[0].wife
              touxiang = `https://q1.qlogo.cn/g?b=qq&nk=${wifeId}&s=640`
              if (options.noat) {
                await session.send([
                  h('at', { id: session.userId }),
                  h.text(" 你今天已经获取过老婆了！\n你的老婆是："),
                  h('image', { src: touxiang, caches: true })
                ])
              } else {
                await session.send([
                  h('at', { id: session.userId }),
                  h.text(" 你今天已经获取过老婆了！\n你的老婆是："),
                  h('at', { id: wifeId }),
                  h('image', { src: touxiang, caches: true })
                ])
              }
            } else {
              // 插入数据库
              await ctx.database.create('yuuzy_wife', { userId: session.userId, groupId: groupId, wife: wifeId })
              if (options.noat) {
                await session.send([
                  h('at', { id: session.userId }),
                  h.text(" 你今天的老婆是："),
                  h('image', { src: touxiang, caches: true })
                ])
                if (!cfg.monetary) return
                // 添加货币
                await ctx.monetary.gain(uid, add, currency)
                await session.send(`你获得了${add}个货币。`)
              } else {
                await session.send([
                  h('at', { id: session.userId }),
                  h.text(" 你今天的老婆是："),
                  h('at', { id: wifeId }),
                  h('image', { src: touxiang, caches: true })
                ])
                if (!cfg.monetary) return
                // 添加货币
                await ctx.monetary.gain(uid, add, currency)
                await session.send(`你获得了${add}个货币。`)
              }
            }
          }
        } else {
          await session.send('请在群聊内使用！')
        }
      } else {
        await session.send('仅支持 OneBot 平台！')
      }
    })

  // 清除数据库指令
  ctx.command('wife.rm', '清除数据库', { authority: 3 }).action(async ({ session }) => {
    if (cfg.database) {
      await ctx.database.remove('yuuzy_wife', {})
      await session.send('数据库已清空。')
      logger.info('数据库已清空。')
    } else {
      await session.send('数据库未启用。')
    }
  })

  // 离婚指令
  if (cfg.divorce && cfg.database) {
    ctx.command('wife.离婚', '和你今天的老婆离婚').alias('离婚').userFields(['id']).action(async ({ session }) => {
      if (session.onebot) {
        if (session.guild) {
          const groupId = session.guildId
          const userId = session.userId
          const uid = session.user.id
          const get = await ctx.database.get('yuuzy_wife', { userId: userId, groupId: groupId })
          if (get.length > 0) {
            if (!cfg.monetary) {
              await ctx.database.remove('yuuzy_wife', { userId: userId, groupId: groupId })
              await session.send('离婚成功！')
              return
            }
            try {
              await ctx.monetary.cost(uid, cost, currency)
              await ctx.database.remove('yuuzy_wife', { userId: userId, groupId: groupId })
              await session.send(`离婚成功！\n你消耗了${cost}个货币。`)
            } catch (error) {
              await session.send('离婚失败！\n可能是因为你没有足够的货币。')
            }
          } else {
            await session.send('你还没有老婆哦~')
          }
        } else {
          await session.send('请在群聊内使用！')
        }
      } else {
        await session.send('仅支持 OneBot 平台！')
      }
    })
  }

  // 求婚
  if (cfg.propose && cfg.database && cfg.monetary) {
    ctx.command('求婚 <who>', '向群u求婚')
    .userFields(['id'])
    .action(async ({ session }, who) => {
      if (!session.onebot || !session.guild) {
        await session.send('请在OneBot平台的群聊内使用。')
        return
      }

      // 获取各种杂七杂八的信息
      const userId = session.userId
      const uid = session.user.id
      const p = h.parse(who)[0]
      if (!p || p.type !== 'at' || !p.attrs.id) {
        await session.send('ERROR: 请传入正确参数\n参数需为 @某人')
        return
      }
      const pId = p.attrs.id
      /*console.info(p)*/
      const groupId = session.guildId
      const get = await ctx.database.get('yuuzy_wife', { userId: userId, groupId: groupId })
      const info = `${pId}@${groupId}`
      const get2 = await ctx.cache.get('YZC', info)

      if (userId === pId) {
        await session.send('你不能向自己求婚！')
        return
      }
      if (get.length > 0) {
        if (get[0].wife === pId) {
          await session.send('ta已经是你的老婆啦！')
          return
        }
        await session.send('你已经有老婆了，不能再求婚了！')
        return
      }
      /*if (get2 !== undefined) {
        await session.send(`你已经求过婚了，请等待对方回复。`)
        return
      }*/
      const b = new Set(get2)
      if (b.has(userId)) {
        await session.send('你已经向ta求过婚了，请等待对方回复。')
        return
      }

      // 正式处理求婚
      try {
        await ctx.monetary.cost(uid, Math.floor(cfg.costP), currency)
      } catch (error) {
        await session.send('求婚失败！\n可能是因为你没有足够的货币。')
        return
      }
      let set = get2
      if (set === undefined) set = []
      set.push(userId)
      await ctx.cache.set('YZC', info, set, cfg.PwaitTime)
      await session.send([
        h('at', { id: userId}),
        ' 你向',
        h('at', { id: pId}),
        ' 求婚成功，请等待对方回复。\n',
        '超时时长： ',
        String(cfg.PwaitTime / 1000),
        ' 秒。'
      ].join(''))
      await session.send(`你消耗了${Math.floor(cfg.costP)}个货币。`)
      await session.send([
        h('at', { id: pId}),
        ' 请在',
        String(cfg.PwaitTime / 1000),
        ' 秒内回复  ',
        '求婚.同意 @向你求婚的人',
        '  或者  ',
        '求婚.拒绝 @向你求婚的人',
        '以回复求婚请求。\n',
        '（当然，使用这些指令的别名也行）'
      ])
    })

    ctx.command('求婚.同意 <who>', '同意某人的求婚')
    .alias('同意')
    .userFields(['id'])
    .action(async ({ session }, who) => {
      if (!session.onebot || !session.guild) {
        await session.send('请在OneBot平台的群聊内使用。')
        return
      }

      // 获取各种byd信息
      const userId = session.userId
      const uid = session.user.id
      const groupId = session.guildId
      const w = h.parse(who)[0]
      if (!w || w.type !== 'at' || !w.attrs.id) {
        await session.send('ERROR: 请传入正确参数\n参数需为 @某人')
        return
      }
      const wId = w.attrs.id
      const info = `${userId}@${groupId}`
      const get = await ctx.cache.get('YZC', info)
      const b = new Set(get)

      // 各种byd判断
      if (!get) {
        await session.send('没有人向你求婚哦')
        return
      }
      if (!b.has(wId)) {
        await session.send('ta还没有向你求婚哦')
        return
      }
      const get3 = await ctx.database.get('yuuzy_wife', { wife: userId, groupId: groupId })
      if (get3.length > 0) {
        await session.send('你已经是别人的老婆了，不能接受求婚。')
        await ctx.cache.delete('YZC', info)
        return
      }

      // 正式处理结婚
      await ctx.monetary.gain(uid, Math.floor(cfg.costP * 0.8), currency)
      await ctx.database.create('yuuzy_wife', { userId: wId, groupId: groupId, wife: userId })
      await ctx.cache.delete('YZC', info)
      await session.send([
        h('at', { id: userId}),
        ' 你和',
        h('at', { id: wId}),
        ' 成功结婚了！'
      ].join(''))
      await session.send(`你获得了${Math.floor(cfg.costP * 0.8)}个货币。`)
    })

    ctx.command('求婚.拒绝 <who>', '拒绝某人的求婚')
    .alias('拒绝')
    .action(async ({ session }, who) => {
      if (!session.onebot || !session.guild) {
        await session.send('请在OneBot平台的群聊内使用。')
        return
      }

      // 获取各种byd信息
      const userId = session.userId
      const groupId = session.guildId
      const w = h.parse(who)[0]
      if (!w || w.type !== 'at' || !w.attrs.id) {
        await session.send('ERROR: 请传入正确参数\n参数需为 @某人')
        return
      }
      const wId = w.attrs.id
      const info = `${userId}@${groupId}`
      const get = await ctx.cache.get('YZC', info)

      // 各种byd判断
      if (!get) {
        await session.send('没有人向你求婚哦')
        return
      }
      const b = new Set(get)
      if (!b.has(wId)) {
        await session.send('ta还没有向你求婚哦')
        return
      }
      
      let set = get
      set.splice(set.findIndex(item => item === wId), 1)
      if (set.length === 0) {
        await ctx.cache.delete('YZC', info)
      }else await ctx.cache.set('YZC', info, set, cfg.PwaitTime)
      await session.send([
        h('at', { id: wId}),
        ' 你的求婚被拒绝了！'
      ].join(''))
    })

    ctx.command('求婚.取消 <who>', '取消对某人的求婚')
    .alias('取消求婚')
    .userFields(['id'])
    .action(async ( { session }, who ) => {
      if (!session.onebot || !session.guild) {
        await session.send('请在OneBot平台的群聊内使用。')
        return
      }

      if (!who) {
        await session.send('ERROR: 请传入正确参数\n参数需为 @某人')
        return
      }

      // 获取各种byd信息
      const uid = session.user.id
      const p = h.parse(who)[0]
      if (!p || p.type !== 'at' || !p.attrs.id) {
        await session.send('ERROR: 请传入正确参数\n参数需为 @某人')
        return
      }
      const pId = p.attrs.id
      const userId = session.userId
      const groupId = session.guildId
      const info = `${pId}@${groupId}`
      const get = await ctx.cache.get('YZC', info)
      const b = new Set(get)

      // 各种byd判断
      if (!b.has(userId)) {
        await session.send('你还没有向ta求婚哦')
        return
      }
      // 正式处理取消求婚
      let set = get
      set.splice(set.findIndex(item => item === userId), 1)
      if (set.length === 0) await ctx.cache.delete('YZC', info)
      else await ctx.cache.set('YZC', info, set, cfg.PwaitTime)
      await session.send([
        h('at', { id: userId}),
        ' 你的求婚已取消。'
      ].join(''))
      await ctx.monetary.gain(uid, Math.floor(cfg.costP * 0.6), currency) 
      await session.send(`已返还${Math.floor(cfg.costP * 0.6)}个货币。`)
    })
    
    // 求婚列表
    ctx.command('求婚.列表 [who]', '查看谁在向你求婚or有谁在向谁求婚')
    .alias('求婚列表')
    .action(async ({ session }, who) => {
      if (!session.onebot || !session.guild) {
        await session.send('请在OneBot平台的群聊内使用。')
        return
      }
      const groupId = session.guildId
      const userId = session.userId
      if (who) {
        const w = h.parse(who)[0]
        if (!w || w.type !== 'at' || !w.attrs.id) {
          await session.send('ERROR: 请传入正确参数\n参数需为 @某人')
          return
        }
        const wId = w.attrs.id
        const info = `${wId}@${groupId}`
        const get = await ctx.cache.get('YZC', info)
        if (get === undefined) {
          await session.send('还没有人向ta求婚哦')
          return
        }
        const people = get.map((id) => {
          return h('at', { id: id })
        }).join(<br/>)
        await session.send([
          h('at', { id: userId }),
          ' 有以下人向ta求婚： ',
          <br/>,
          people,
        ].join(''))
        return
      }
      const info = `${userId}@${groupId}`
      const get = await ctx.cache.get('YZC', info)
      if (get === undefined) {
        await session.send('还没有人向你求婚哦')
        return
      }
      const people = get.map((id) => {
        return h('at', { id: id })
      }).join(<br/>)
      console.log(people)
      await session.send([
        h('at', { id: userId}),
        ' 你有以下人向你求婚：<br/>',
        people,
        <br/>,
        '使用 求婚.拒绝 @某人 来拒绝某人的求婚',
        <br/>,
        '使用 求婚.同意 @某人 来同意某人的求婚'
      ].join(''))
    })
  }

  if (cfg.rape && cfg.database && cfg.monetary) {
    ctx.command('wife.强娶 <who>', '强娶群u!')
    .alias('强娶')
    .userFields(['id'])
    .action(async ({ session }, who) => {
      if (!session.onebot && !session.guild) {
        await session.send('请在OneBot平台的群聊内使用。')
        return
      }

      const guildId = session.guildId
      const userId = session.userId
      const uid = session.user.id

      if (!who) {
        await session.send('请传入正确参数\n参数需为 @某人')
        return
      }

      const w = h.parse(who)[0]
      if (!w || w.type !== 'at' || !w.attrs.id) {
        await session.send('请传入正确参数\n参数需为 @某人')
        return
      }

      const wId: string = (w.attrs.id).toString()

      if (userId == wId) {
        await session.send('你不能强娶自己！')
        return
      }

      if (!NoNTR(wId, guildId)) {
        await session.send('ta已经是别人的老婆了！')
        return
      }

      if ((await ctx.database.get('yuuzy_wife', { userId: userId, groupId: guildId })).length > 0) {
        await session.send('你已经有老婆了，不能再强娶了！')
        return
      }

      try {
        await ctx.monetary.cost(uid, costR, currency)
      } catch(e) {
        await session.send('强娶失败！\n可能是因为你没有足够的货币。')
        logger.error(e)
        return
      }
      await ctx.database.create('yuuzy_wife', { userId: userId, groupId: guildId, wife: wId })
      await session.send([
        h('at', { id: userId}),
        ' 你强娶了',
        h('at', { id: wId})
      ].join(''))
      await session.send(`你消耗了${costR}个货币。`)
    })
  }

  ctx.command('debug', '调试指令')
  .userFields(['id'])
  .action( async ({session}) => {
    await ctx.monetary.gain(session.user.id, 1000000, currency)
    await session.send('你获得了1000000个货币。')
  })

  // 定时清空数据库
  if (cfg.database) {
    ctx.cron('0 0 * * *', async () => {
      logger.info('正在执行定时清空数据库...')
      await ctx.database.remove('yuuzy_wife', {})
      logger.info('数据库清空完成！')
    })
  }

  ctx.on('dispose', async() => {
    await ctx.database.remove('yuuzy_wife', {})
    await ctx.cache.clear('YZC')
  })
}
