import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionsQueryDto } from './dto/sessions-query.dto';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: SessionsQueryDto) {
    const where: Prisma.ReadingSessionWhereInput = {
      ...(query.state && { currentState: query.state }),
      ...(query.articleId && { articleId: query.articleId }),
      ...((query.from || query.to) && {
        startedAt: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.readingSession.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { startedAt: 'desc' },
        include: {
          article: {
            select: {
              id: true,
              title: true,
              url: true,
              website: { select: { name: true, domain: true } },
            },
          },
        },
      }),
      this.prisma.readingSession.count({ where }),
    ]);

    return {
      data: items.map((item) => this.serialize(item)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const session = await this.prisma.readingSession.findUnique({
      where: { id },
      include: {
        article: { include: { website: true } },
        events: { orderBy: { clientSeq: 'asc' } },
      },
    });

    if (!session) {
      throw new NotFoundException('Reading session not found');
    }

    return this.serialize(session);
  }

  private serialize<T extends { activeReadingMs: bigint; inactiveMs: bigint }>(
    session: T,
  ) {
    return {
      ...session,
      activeReadingMs: Number(session.activeReadingMs),
      inactiveMs: Number(session.inactiveMs),
    };
  }
}
