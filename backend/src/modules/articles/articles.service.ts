import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ArticlesQueryDto } from './dto/articles-query.dto';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ArticlesQueryDto) {
    const where: Prisma.ArticleWhereInput = {
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { url: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.domain && { website: { domain: query.domain } }),
    };
    let orderBy: Prisma.ArticleOrderByWithRelationInput = {
      lastSeenAt: 'desc',
    };

    if (query.sort === 'oldest') {
      orderBy = { lastSeenAt: 'asc' };
    }

    if (query.sort === 'title') {
      orderBy = { title: 'asc' };
    }
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        orderBy,
        skip,
        take: query.limit,
        select: {
          id: true,
          url: true,
          title: true,
          summary: true,
          firstSeenAt: true,
          lastSeenAt: true,
          website: { select: { id: true, name: true, domain: true } },
          sessions: {
            select: {
              activeReadingMs: true,
              startedAt: true,
              currentState: true,
            },
            orderBy: { startedAt: 'desc' },
          },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: items.map(({ sessions, ...article }) => ({
        ...article,
        totalReadingMs: sessions.reduce(
          (sum, session) => sum + Number(session.activeReadingMs),
          0,
        ),
        sessionCount: sessions.length,
        latestReadingAt: sessions[0]?.startedAt || null,
        isActive: sessions.some((session) => session.currentState === 'ACTIVE'),
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        website: true,
        sessions: {
          orderBy: { startedAt: 'desc' },
          include: { events: { orderBy: { clientSeq: 'asc' } } },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const { sessions, ...data } = article;
    return {
      ...data,
      totalReadingMs: sessions.reduce(
        (sum, session) => sum + Number(session.activeReadingMs),
        0,
      ),
      sessionCount: sessions.length,
      latestReadingAt: sessions[0]?.startedAt || null,
      isActive: sessions.some((session) => session.currentState === 'ACTIVE'),
      sessions: sessions.map((session) => ({
        ...session,
        activeReadingMs: Number(session.activeReadingMs),
        inactiveMs: Number(session.inactiveMs),
      })),
    };
  }
}
