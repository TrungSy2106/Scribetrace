import { Injectable } from '@nestjs/common';
import { SessionState } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardRangeDto } from './dto/dashboard-range.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [totalArticles, reading, activeSessions] =
      await this.prisma.$transaction([
        this.prisma.article.count(),
        this.prisma.readingSession.aggregate({
          _sum: { activeReadingMs: true },
          _avg: { activeReadingMs: true },
        }),
        this.prisma.readingSession.count({
          where: { currentState: SessionState.ACTIVE },
        }),
      ]);

    return {
      totalArticles,
      totalReadingMs: Number(reading._sum.activeReadingMs || 0),
      averageReadingMs: Number(reading._avg.activeReadingMs || 0),
      activeSessions,
    };
  }

  async readingTrend(query: DashboardRangeDto) {
    const { from, to } = this.range(query);
    const sessions = await this.prisma.readingSession.findMany({
      where: {
        startedAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        startedAt: true,
        activeReadingMs: true,
      },
      orderBy: {
        startedAt: 'asc',
      },
    });
    const grouped = new Map<string, number>();

    for (const session of sessions) {
      const date = session.startedAt.toISOString().slice(0, 10);
      const total = grouped.get(date) || 0;
      grouped.set(date, total + Number(session.activeReadingMs));
    }

    return Array.from(grouped, ([date, totalReadingMs]) => ({
      date,
      totalReadingMs,
    }));
  }

  async readingByWebsite(query: DashboardRangeDto) {
    const { from, to } = this.range(query);
    const sessions = await this.prisma.readingSession.findMany({
      where: {
        startedAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        activeReadingMs: true,
        article: {
          select: {
            website: {
              select: {
                id: true,
                name: true,
                domain: true,
              },
            },
          },
        },
      },
    });
    const grouped = new Map<
      string,
      {
        websiteId: string;
        name: string;
        domain: string;
        totalReadingMs: number;
      }
    >();

    for (const session of sessions) {
      const website = session.article.website;
      const current = grouped.get(website.id);

      if (current) {
        current.totalReadingMs += Number(session.activeReadingMs);
      } else {
        grouped.set(website.id, {
          websiteId: website.id,
          name: website.name,
          domain: website.domain,
          totalReadingMs: Number(session.activeReadingMs),
        });
      }
    }

    return Array.from(grouped.values()).sort(
      (a, b) => b.totalReadingMs - a.totalReadingMs,
    );
  }

  private range(query: DashboardRangeDto) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from, to };
  }
}
